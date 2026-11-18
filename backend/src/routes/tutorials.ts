import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";

/**
 * Tutorial listing for members and admins.
 * Progress is read from VideoProgress; skip-ahead completion rules live on the progress write endpoint.
 */
export const tutorialsRouter = Router();

tutorialsRouter.get("/active", requireRole("MEMBER", "ADMIN"), async (req, res) => {
  const videos = await prisma.tutorialVideo.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      durationSeconds: true,
      createdAt: true,
    },
  });

  let progressByVideo = new Map<
    string,
    { completed: boolean; completedAt: Date | null; watchedSeconds: number; maxPositionSeconds: number }
  >();

  if (req.user!.role === "MEMBER") {
    const profile = await prisma.memberProfile.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    if (profile && videos.length) {
      const rows = await prisma.videoProgress.findMany({
        where: { memberProfileId: profile.id, tutorialVideoId: { in: videos.map((video) => video.id) } },
        select: {
          tutorialVideoId: true,
          completed: true,
          completedAt: true,
          watchedSeconds: true,
          maxPositionSeconds: true,
        },
      });
      progressByVideo = new Map(
        rows.map((row) => [
          row.tutorialVideoId,
          {
            completed: row.completed,
            completedAt: row.completedAt,
            watchedSeconds: row.watchedSeconds,
            maxPositionSeconds: row.maxPositionSeconds,
          },
        ]),
      );
    }
  }

  const tutorials = videos.map((video) => {
    const progress = progressByVideo.get(video.id);
    return {
      id: video.id,
      title: video.title,
      durationSeconds: video.durationSeconds,
      createdAt: video.createdAt,
      completed: progress?.completed === true,
      completedAt: progress?.completedAt ?? null,
      watchedSeconds: progress?.watchedSeconds ?? 0,
      maxPositionSeconds: progress?.maxPositionSeconds ?? 0,
    };
  });

  res.json({
    tutorials,
    ...(videos.length === 0
      ? { reason: "No active tutorials yet. Official lesson files are still outstanding." }
      : {}),
  });
});

tutorialsRouter.use(requireRole("ADMIN"));

tutorialsRouter.get("/", async (_req, res) => {
  const tutorials = await prisma.tutorialVideo.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      durationSeconds: true,
      isActive: true,
      storagePath: true,
      uploadedById: true,
      createdAt: true,
    },
  });
  res.json({ tutorials });
});
