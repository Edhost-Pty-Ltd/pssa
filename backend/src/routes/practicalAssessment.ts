import { createReadStream, existsSync, statSync } from "node:fs";
import { Router, type Response } from "express";
import { z } from "zod";
import { badRequest, conflict, notFound } from "../lib/http.js";
import {
  getActivePracticalAsset,
  getOrCreateCurrentPracticalSubmission,
  isPracticalSubmissionEditable,
  PRACTICAL_TRACKS,
  practicalAnswersDraftSchema,
  practicalAnswersSubmitSchema,
  resolvePracticalAssetPath,
  suggestTrackFromScope,
} from "../lib/practicalAssessment.js";
import { applyPrivateFileHeaders, logPrivateFileAccess } from "../lib/privateFiles.js";
import { prisma } from "../lib/prisma.js";
import { assertFileSignature, practicalEvidenceUpload, privateFilePath, removePrivateFile } from "../lib/uploads.js";
import { requireRole } from "../middleware/auth.js";

export const practicalAssessmentRouter = Router();
practicalAssessmentRouter.use(requireRole("MEMBER", "ADMIN"));

async function requireMemberProfile(userId: string) {
  const profile = await prisma.memberProfile.findUnique({
    where: { userId },
    select: { id: true, firstName: true, lastName: true, tradingName: true, scope: true },
  });
  if (!profile) throw notFound("Member profile not found.");
  return profile;
}

function streamRangeFile(
  res: Response,
  filePath: string,
  mimeType: string,
  rangeHeader: string | undefined,
) {
  const stat = statSync(filePath);
  applyPrivateFileHeaders(res, { contentType: mimeType });

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
    if (!match) throw badRequest("Invalid Range header.");
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Number(match[2]) : Math.min(start + 1024 * 1024 - 1, stat.size - 1);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end >= stat.size || start > end) {
      res.status(416).setHeader("Content-Range", `bytes */${stat.size}`);
      res.end();
      return;
    }
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Length", String(end - start + 1));
    createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.setHeader("Content-Length", String(stat.size));
  res.setHeader("Accept-Ranges", "bytes");
  createReadStream(filePath).pipe(res);
}

function serializeSubmission(row: Awaited<ReturnType<typeof getOrCreateCurrentPracticalSubmission>>) {
  return {
    id: row.id,
    status: row.status,
    tutorialVersion: row.tutorialVersion,
    assignmentVersion: row.assignmentVersion,
    tutorialWatched: row.tutorialWatched,
    tutorialWatchedAt: row.tutorialWatchedAt,
    tutorialWatchedSeconds: row.tutorialWatchedSeconds,
    serviceTrack: row.serviceTrack,
    answers: row.answers ?? null,
    evidence: row.evidenceStoragePath
      ? {
          fileName: row.evidenceFileName,
          mimeType: row.evidenceMimeType,
          sizeBytes: row.evidenceSizeBytes,
          url: "/api/practical-assessment/evidence/file",
        }
      : null,
    submittedAt: row.submittedAt,
    reviewedAt: row.reviewedAt,
    totalScore: row.totalScore,
    passThresholdUsed: row.passThresholdUsed,
    reviewerFeedback: row.reviewerFeedback,
    updatedAt: row.updatedAt,
  };
}

/** Applicant practical assessment workspace state (never exposes assessor_guide). */
practicalAssessmentRouter.get("/state", async (req, res) => {
  const profile = await requireMemberProfile(req.user!.id);
  const [tutorial, assignment, submission] = await Promise.all([
    getActivePracticalAsset("tutorial_video"),
    getActivePracticalAsset("assignment_brief"),
    getOrCreateCurrentPracticalSubmission(profile.id),
  ]);

  res.json({
    declaredScope: profile.scope,
    suggestedTrack: suggestTrackFromScope(profile.scope),
    tracks: PRACTICAL_TRACKS,
    tutorial: {
      id: tutorial.asset.id,
      version: tutorial.asset.version,
      title: tutorial.asset.title,
      fileName: tutorial.asset.fileName,
      isFallback: tutorial.isFallback,
      streamUrl: "/api/practical-assessment/assets/tutorial/stream",
    },
    assignment: {
      id: assignment.asset.id,
      version: assignment.asset.version,
      title: assignment.asset.title,
      fileName: assignment.asset.fileName,
      isFallback: assignment.isFallback,
      inlineUrl: "/api/practical-assessment/assets/assignment/file",
      downloadUrl: "/api/practical-assessment/assets/assignment/file?download=1",
    },
    submission: serializeSubmission(submission),
  });
});

practicalAssessmentRouter.get("/assets/tutorial/stream", async (req, res) => {
  const { asset } = await getActivePracticalAsset("tutorial_video");
  const filePath = resolvePracticalAssetPath(asset.storagePath);
  if (!existsSync(filePath)) throw notFound("Tutorial video file is unavailable.");

  const range = req.headers.range;
  const rangeStart = range ? Number(/^bytes=(\d*)-/.exec(range)?.[1] || 0) : 0;
  if (!range || rangeStart === 0) {
    await logPrivateFileAccess({
      actorId: req.user!.id,
      action: "practical.tutorial_stream",
      entityType: "practical_assessment_asset",
      entityId: asset.id,
      reason: `v${asset.version} ${asset.fileName}`,
    });
  }
  streamRangeFile(res, filePath, asset.mimeType || "video/mp4", range);
});

practicalAssessmentRouter.get("/assets/assignment/file", async (req, res) => {
  const { asset } = await getActivePracticalAsset("assignment_brief");
  const filePath = resolvePracticalAssetPath(asset.storagePath);
  if (!existsSync(filePath)) throw notFound("Assignment brief file is unavailable.");

  await logPrivateFileAccess({
    actorId: req.user!.id,
    action: "practical.assignment_access",
    entityType: "practical_assessment_asset",
    entityId: asset.id,
    reason: `v${asset.version} ${asset.fileName}`,
  });

  const download = req.query.download === "1" || req.query.download === "true";
  applyPrivateFileHeaders(res, {
    contentType: asset.mimeType || "application/pdf",
    filename: asset.fileName,
    disposition: download ? "attachment" : "inline",
  });
  res.sendFile(filePath);
});

const tutorialProgressSchema = z.object({
  watchedSeconds: z.coerce.number().finite().min(0).default(0),
  completed: z.boolean().default(false),
});

practicalAssessmentRouter.post("/tutorial-progress", async (req, res) => {
  const profile = await requireMemberProfile(req.user!.id);
  const body = tutorialProgressSchema.parse(req.body ?? {});
  const submission = await getOrCreateCurrentPracticalSubmission(profile.id);

  const nextWatchedSeconds = Math.max(submission.tutorialWatchedSeconds, Math.round(body.watchedSeconds));
  const nextWatched = submission.tutorialWatched || body.completed;

  const updated = await prisma.practicalAssessmentSubmission.update({
    where: { id: submission.id },
    data: {
      tutorialWatchedSeconds: nextWatchedSeconds,
      tutorialWatched: nextWatched,
      tutorialWatchedAt: submission.tutorialWatchedAt ?? (nextWatched ? new Date() : null),
      status: submission.status === "NOT_STARTED" ? "IN_PROGRESS" : submission.status,
    },
  });

  res.json({ submission: serializeSubmission(updated) });
});

practicalAssessmentRouter.put("/draft", async (req, res) => {
  const profile = await requireMemberProfile(req.user!.id);
  const body = practicalAnswersDraftSchema.parse(req.body ?? {});
  const submission = await getOrCreateCurrentPracticalSubmission(profile.id);

  if (!isPracticalSubmissionEditable(submission.status)) {
    throw conflict("Your practical assessment has already been submitted and cannot be edited while under review.");
  }

  const updated = await prisma.practicalAssessmentSubmission.update({
    where: { id: submission.id },
    data: {
      ...(body.serviceTrack !== undefined ? { serviceTrack: body.serviceTrack } : {}),
      ...(body.answers !== undefined ? { answers: body.answers as object } : {}),
      status: submission.status === "NOT_STARTED" ? "IN_PROGRESS" : submission.status,
    },
  });

  res.json({ submission: serializeSubmission(updated) });
});

practicalAssessmentRouter.post("/evidence", practicalEvidenceUpload.single("file"), async (req, res) => {
  const profile = await requireMemberProfile(req.user!.id);
  const file = req.file;
  if (!file) throw badRequest("Choose a PDF, JPG, PNG, or WebP file to attach.");
  await assertFileSignature(file);

  const submission = await getOrCreateCurrentPracticalSubmission(profile.id);
  if (!isPracticalSubmissionEditable(submission.status)) {
    await removePrivateFile(file.filename);
    throw conflict("Cannot modify attachments after submission.");
  }

  const previousPath = submission.evidenceStoragePath;
  const updated = await prisma.practicalAssessmentSubmission.update({
    where: { id: submission.id },
    data: {
      evidenceFileName: file.originalname,
      evidenceMimeType: file.mimetype,
      evidenceSizeBytes: file.size,
      evidenceStoragePath: file.filename,
      status: submission.status === "NOT_STARTED" ? "IN_PROGRESS" : submission.status,
    },
  });

  if (previousPath && previousPath !== file.filename) {
    await removePrivateFile(previousPath);
  }

  res.status(201).json({ submission: serializeSubmission(updated) });
});

practicalAssessmentRouter.delete("/evidence", async (req, res) => {
  const profile = await requireMemberProfile(req.user!.id);
  const submission = await getOrCreateCurrentPracticalSubmission(profile.id);
  if (!isPracticalSubmissionEditable(submission.status)) {
    throw conflict("Cannot remove attachments after submission.");
  }
  const previousPath = submission.evidenceStoragePath;
  const updated = await prisma.practicalAssessmentSubmission.update({
    where: { id: submission.id },
    data: {
      evidenceFileName: null,
      evidenceMimeType: null,
      evidenceSizeBytes: null,
      evidenceStoragePath: null,
    },
  });
  if (previousPath) await removePrivateFile(previousPath);
  res.json({ submission: serializeSubmission(updated) });
});

practicalAssessmentRouter.get("/evidence/file", async (req, res) => {
  const profile = await requireMemberProfile(req.user!.id);
  const submission = await getOrCreateCurrentPracticalSubmission(profile.id);
  if (!submission.evidenceStoragePath) throw notFound("No supporting file is attached.");

  const filePath = privateFilePath(submission.evidenceStoragePath);
  if (!existsSync(filePath)) throw notFound("Supporting file is no longer available.");

  await logPrivateFileAccess({
    actorId: req.user!.id,
    action: "practical.evidence_access",
    entityType: "practical_assessment_submission",
    entityId: submission.id,
  });

  applyPrivateFileHeaders(res, {
    contentType: submission.evidenceMimeType || "application/octet-stream",
    filename: submission.evidenceFileName || "evidence",
    disposition: "inline",
  });
  res.sendFile(filePath);
});

practicalAssessmentRouter.post("/submit", async (req, res) => {
  const profile = await requireMemberProfile(req.user!.id);
  const headerKey = req.header("idempotency-key")?.trim();
  const rawBody = req.body ?? {};
  const idempotencyKey = (typeof rawBody.idempotencyKey === "string" ? rawBody.idempotencyKey.trim() : "") || headerKey || null;

  if (idempotencyKey) {
    const existingByKey = await prisma.practicalAssessmentSubmission.findUnique({
      where: { idempotencyKey },
    });
    if (existingByKey && existingByKey.memberProfileId === profile.id) {
      res.json({ submission: serializeSubmission(existingByKey), deduplicated: true });
      return;
    }
  }

  const submission = await getOrCreateCurrentPracticalSubmission(profile.id);
  if (submission.status === "SUBMITTED" || submission.status === "UNDER_REVIEW" || submission.status === "PASSED") {
    res.json({ submission: serializeSubmission(submission), deduplicated: true });
    return;
  }

  const parsed = practicalAnswersSubmitSchema.safeParse(rawBody);
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    res.status(400).json({
      error: fieldErrors[0]?.message ?? "Please complete all required assessment fields.",
      errors: fieldErrors.map((f) => `${f.path}: ${f.message}`),
      fieldErrors,
    });
    return;
  }

  const { serviceTrack, ...structuredAnswers } = parsed.data;
  const submittedAt = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.practicalAssessmentSubmission.update({
      where: { id: submission.id },
      data: {
        serviceTrack,
        answers: structuredAnswers,
        status: "SUBMITTED",
        submittedAt,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: "practical_assessment.submit",
        entityType: "practical_assessment_submission",
        entityId: row.id,
        reason: `Submitted practical assessment (${serviceTrack}, tutorial v${row.tutorialVersion}, assignment v${row.assignmentVersion})`,
      },
    });

    await tx.adminNotification.upsert({
      where: { sourceKey: `practical:${row.id}` },
      create: {
        sourceKey: `practical:${row.id}`,
        title: "Practical assessment submitted",
        body: `${profile.firstName} ${profile.lastName} submitted the practical assessment (${serviceTrack}).`,
        type: "INFO",
        link: "/admin/tutorials",
      },
      update: {
        title: "Practical assessment submitted",
        body: `${profile.firstName} ${profile.lastName} submitted the practical assessment (${serviceTrack}).`,
        type: "INFO",
        link: "/admin/tutorials",
        read: false,
      },
    });

    return row;
  });

  res.json({ submission: serializeSubmission(updated), deduplicated: false });
});
