import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { Router } from "express";
import { z } from "zod";
import { badRequest, conflict, notFound } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { nextProgress, progressView } from "../lib/tutorialProgress.js";
import { assertVideoSignature, privateFilePath, removePrivateFile, videoUpload } from "../lib/uploads.js";
import { requireRole } from "../middleware/auth.js";

/**
 * Tutorial videos (Thembinkosi, tasks 1–3).
 * Admins upload and manage them; only one video is active at a time, and that is the one members watch.
 * Files are stored privately and streamed only to signed-in members (active video) and admins (any video).
 */
export const tutorialsRouter = Router();

const streamUrl = (id: string) => `/api/tutorials/${id}/stream`;

function memberView(video: { id: string; title: string; mimeType: string; durationSeconds: number | null }) {
  return { id: video.id, title: video.title, mimeType: video.mimeType, durationSeconds: video.durationSeconds, streamUrl: streamUrl(video.id) };
}

async function myMemberProfileId(userId: string) {
  const member = await prisma.memberProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!member) throw notFound("Member profile not found.");
  return member.id;
}

/* ---------------- Task 3: the active video, for members ---------------- */

/** Members also get their own progress on it; admins get progress: null. */
tutorialsRouter.get("/active", requireRole("MEMBER", "ADMIN"), async (req, res) => {
  const video = await prisma.tutorialVideo.findFirst({ where: { isActive: true } });
  if (!video) return res.json({ video: null, progress: null });
  let progress = null;
  if (req.user!.role === "MEMBER") {
    const memberProfileId = await myMemberProfileId(req.user!.id);
    progress = progressView(
      await prisma.videoProgress.findUnique({ where: { memberProfileId_tutorialVideoId: { memberProfileId, tutorialVideoId: video.id } } }),
    );
  }
  res.json({ video: memberView(video), progress });
});

/* ---------------- Tasks 4 and 5: track and save video completion ---------------- */

const progressSchema = z.object({
  positionSeconds: z.coerce.number({ error: "must be a number of seconds" }).finite().min(0, "must be 0 or more").max(4 * 60 * 60),
  durationSeconds: z.coerce.number({ error: "must be a number of seconds" }).finite().positive("must be more than 0").max(4 * 60 * 60).optional(),
});

/**
 * The player reports its position every few seconds and on pause/end.
 * The server decides what counts as watched; the browser can't just mark the video complete.
 */
tutorialsRouter.post("/:id/progress", requireRole("MEMBER"), async (req, res) => {
  const body = progressSchema.parse(req.body ?? {});
  const video = await prisma.tutorialVideo.findUnique({ where: { id: String(req.params.id) } });
  if (!video || !video.isActive) throw notFound("Tutorial video not found.");
  const memberProfileId = await myMemberProfileId(req.user!.id);
  const key = { memberProfileId_tutorialVideoId: { memberProfileId, tutorialVideoId: video.id } };
  const existing = await prisma.videoProgress.findUnique({ where: key });

  // The admin-set duration wins; otherwise the first duration the player reports is kept.
  const duration = video.durationSeconds ?? existing?.durationSeconds ?? (body.durationSeconds ? Math.ceil(body.durationSeconds) : null);
  if (!duration) throw badRequest("Send durationSeconds from the video player.", { fields: { durationSeconds: "is required for this video" } });

  const data = nextProgress(existing, body.positionSeconds, duration, new Date());
  const saved = await prisma.videoProgress.upsert({
    where: key,
    create: { memberProfileId, tutorialVideoId: video.id, ...data },
    update: data,
  });
  res.json({ progress: progressView(saved) });
});

/** Members may only stream the active video. Range requests are supported, so the player can seek. */
tutorialsRouter.get("/:id/stream", requireRole("MEMBER", "ADMIN"), async (req, res) => {
  const video = await prisma.tutorialVideo.findUnique({ where: { id: String(req.params.id) } });
  if (!video || (req.user!.role === "MEMBER" && !video.isActive)) throw notFound("Tutorial video not found.");
  const filePath = privateFilePath(video.storedName);
  if (!existsSync(filePath)) throw notFound("That video file is no longer available.");
  res.setHeader("Cache-Control", "private, no-store");
  res.type(video.mimeType);
  res.sendFile(filePath);
});

/* ---------------- Tasks 1 and 2: admin management ---------------- */

const durationSchema = z.coerce
  .number({ error: "must be a number of seconds" })
  .int("must be a whole number of seconds")
  .min(1, "must be at least 1 second")
  .max(4 * 60 * 60, "must be at most 4 hours");

const createSchema = z.object({
  title: z.string({ error: "is required" }).trim().min(3, "must be at least 3 characters").max(150, "must be at most 150 characters"),
  durationSeconds: z.preprocess((value) => (value === "" ? undefined : value), durationSchema.optional()),
  activate: z.preprocess((value) => value === true || value === "true", z.boolean()),
});

const updateSchema = z
  .object({
    title: z.string().trim().min(3, "must be at least 3 characters").max(150, "must be at most 150 characters").optional(),
    durationSeconds: z.union([z.null(), durationSchema]).optional(),
  })
  .refine((body) => body.title !== undefined || body.durationSeconds !== undefined, { error: "Provide a title or durationSeconds to update." });

async function adminList() {
  const [videos, counts] = await Promise.all([
    prisma.tutorialVideo.findMany({
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.videoProgress.groupBy({ by: ["tutorialVideoId", "completed"], _count: { _all: true } }),
  ]);
  return videos.map((video) => {
    const rows = counts.filter((row) => row.tutorialVideoId === video.id);
    return {
      id: video.id,
      title: video.title,
      originalName: video.originalName,
      mimeType: video.mimeType,
      durationSeconds: video.durationSeconds,
      isActive: video.isActive,
      uploadedBy: video.uploadedBy,
      createdAt: video.createdAt,
      streamUrl: streamUrl(video.id),
      membersStarted: rows.reduce((sum, row) => sum + row._count._all, 0),
      membersCompleted: rows.find((row) => row.completed)?._count._all ?? 0,
    };
  });
}

async function findVideo(id: string) {
  const video = await prisma.tutorialVideo.findUnique({ where: { id } });
  if (!video) throw notFound("Tutorial video not found.");
  return video;
}

async function setActive(id: string) {
  await prisma.$transaction([
    prisma.tutorialVideo.updateMany({ where: { isActive: true, NOT: { id } }, data: { isActive: false } }),
    prisma.tutorialVideo.update({ where: { id }, data: { isActive: true } }),
  ]);
}

tutorialsRouter.get("/", requireRole("ADMIN"), async (_req, res) => {
  res.json({ videos: await adminList() });
});

/** multipart/form-data: file (MP4, WebM or MOV), title, optional durationSeconds, optional activate=true. */
tutorialsRouter.post("/", requireRole("ADMIN"), videoUpload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) throw badRequest("Choose a video to upload.", { fields: { file: "is required" } });
  try {
    const body = createSchema.parse(req.body ?? {});
    await assertVideoSignature(file);
    const video = await prisma.tutorialVideo.create({
      data: {
        title: body.title,
        originalName: file.originalname.slice(0, 180),
        storedName: file.filename,
        mimeType: file.mimetype,
        durationSeconds: body.durationSeconds ?? null,
        uploadedById: req.user!.id,
      },
    });
    if (body.activate) await setActive(video.id);
    const videos = await adminList();
    res.status(201).json({ video: videos.find((row) => row.id === video.id) });
  } catch (error) {
    await unlink(file.path).catch(() => {});
    throw error;
  }
});

tutorialsRouter.patch("/:id", requireRole("ADMIN"), async (req, res) => {
  const body = updateSchema.parse(req.body ?? {});
  const video = await findVideo(String(req.params.id));
  await prisma.tutorialVideo.update({
    where: { id: video.id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.durationSeconds !== undefined ? { durationSeconds: body.durationSeconds } : {}),
    },
  });
  res.json({ video: (await adminList()).find((row) => row.id === video.id) });
});

/** Makes this the only active video. */
tutorialsRouter.post("/:id/activate", requireRole("ADMIN"), async (req, res) => {
  const video = await findVideo(String(req.params.id));
  await setActive(video.id);
  res.json({ video: (await adminList()).find((row) => row.id === video.id) });
});

tutorialsRouter.post("/:id/deactivate", requireRole("ADMIN"), async (req, res) => {
  const video = await findVideo(String(req.params.id));
  await prisma.tutorialVideo.update({ where: { id: video.id }, data: { isActive: false } });
  res.json({ video: (await adminList()).find((row) => row.id === video.id) });
});

/** Videos members have started are kept, so their completion records stay intact for admin review. */
tutorialsRouter.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const video = await findVideo(String(req.params.id));
  const watched = await prisma.videoProgress.count({ where: { tutorialVideoId: video.id } });
  if (watched > 0) {
    throw conflict("Members have already watched this video, so it can't be deleted. Deactivate it instead to keep their completion records.");
  }
  await prisma.tutorialVideo.delete({ where: { id: video.id } });
  await removePrivateFile(video.storedName);
  res.json({ ok: true });
});
