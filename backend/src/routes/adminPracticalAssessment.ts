import { existsSync } from "node:fs";
import type { PracticalAssetKind, PracticalAssessmentStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { getAssociationSettings } from "../lib/adminSettings.js";
import { badRequest, notFound } from "../lib/http.js";
import {
  ensureDefaultPracticalAssets,
  PRACTICAL_RUBRIC_AREAS,
  PRACTICAL_TRACKS,
  resolvePracticalAssetPath,
} from "../lib/practicalAssessment.js";
import { applyPrivateFileHeaders, logPrivateFileAccess } from "../lib/privateFiles.js";
import { prisma } from "../lib/prisma.js";
import {
  assertFileSignature,
  assertVideoSignature,
  practicalPdfUpload,
  privateFilePath,
  videoUpload,
} from "../lib/uploads.js";
import { requireRole } from "../middleware/auth.js";

export const adminPracticalAssessmentRouter = Router();
adminPracticalAssessmentRouter.use(requireRole("ADMIN"));

const ASSET_KINDS = ["tutorial_video", "assignment_brief", "assessor_guide"] as const;

adminPracticalAssessmentRouter.get("/assets", async (_req, res) => {
  await ensureDefaultPracticalAssets();
  const [assets, settings] = await Promise.all([
    prisma.practicalAssessmentAsset.findMany({
      orderBy: [{ kind: "asc" }, { version: "desc" }],
      include: {
        uploadedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    }),
    getAssociationSettings(),
  ]);

  res.json({
    assets: assets.map((asset) => ({
      id: asset.id,
      kind: asset.kind,
      version: asset.version,
      title: asset.title,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      isActive: asset.isActive,
      isDefault: asset.isDefault,
      createdAt: asset.createdAt,
      uploadedBy: asset.uploadedBy,
      fileUrl: `/api/admin/practical-assessment/assets/${asset.id}/file`,
    })),
    practicalPassThreshold: settings.practicalPassThreshold,
  });
});

adminPracticalAssessmentRouter.get("/assets/:id/file", async (req, res) => {
  const asset = await prisma.practicalAssessmentAsset.findUnique({
    where: { id: String(req.params.id) },
  });
  if (!asset) throw notFound("Asset version not found.");

  const filePath = resolvePracticalAssetPath(asset.storagePath);
  if (!existsSync(filePath)) throw notFound("Asset file is no longer available on disk.");

  await logPrivateFileAccess({
    actorId: req.user!.id,
    action: "admin.practical_asset_access",
    entityType: "practical_assessment_asset",
    entityId: asset.id,
    reason: `${asset.kind} v${asset.version}`,
  });

  const download = req.query.download === "1" || req.query.download === "true";
  applyPrivateFileHeaders(res, {
    contentType: asset.mimeType,
    filename: asset.fileName,
    disposition: download ? "attachment" : "inline",
  });
  res.sendFile(filePath);
});

const uploadMetaSchema = z.object({
  title: z.string().trim().min(2).max(150).optional(),
  activate: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((v) => v === true || v === "true")
    .default(true),
});

function handleAssetUploadMiddleware(req: Parameters<typeof videoUpload.single>[0] extends never ? never : any, res: any, next: any) {
  const kind = String(req.params.kind);
  if (!ASSET_KINDS.includes(kind as PracticalAssetKind)) {
    next(badRequest("Invalid asset kind."));
    return;
  }
  if (kind === "tutorial_video") {
    videoUpload.single("file")(req, res, next);
    return;
  }
  practicalPdfUpload.single("file")(req, res, next);
}

adminPracticalAssessmentRouter.post("/assets/:kind/upload", handleAssetUploadMiddleware, async (req, res) => {
  const kind = String(req.params.kind) as PracticalAssetKind;
  if (!ASSET_KINDS.includes(kind)) throw badRequest("Invalid asset kind.");

  const file = req.file;
  if (!file) throw badRequest("Choose a file to upload.");
  if (kind === "tutorial_video") await assertVideoSignature(file);
  else await assertFileSignature(file);

  const meta = uploadMetaSchema.parse(req.body ?? {});

  const created = await prisma.$transaction(async (tx) => {
    const latest = await tx.practicalAssessmentAsset.findFirst({
      where: { kind },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    if (meta.activate) {
      await tx.practicalAssessmentAsset.updateMany({
        where: { kind, isActive: true },
        data: { isActive: false },
      });
    }

    const row = await tx.practicalAssessmentAsset.create({
      data: {
        kind,
        version: nextVersion,
        title: meta.title || file.originalname.replace(/\.[^.]+$/, ""),
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: file.filename,
        isActive: meta.activate,
        isDefault: false,
        uploadedById: req.user!.id,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: "practical_asset.upload",
        entityType: "practical_assessment_asset",
        entityId: row.id,
        reason: `Uploaded ${kind} v${nextVersion} (${file.originalname})${meta.activate ? " and activated" : ""}`,
        conflictDeclared: true,
      },
    });

    return row;
  });

  res.status(201).json({ asset: created });
});

adminPracticalAssessmentRouter.post("/assets/:id/activate", async (req, res) => {
  const id = String(req.params.id);
  const existing = await prisma.practicalAssessmentAsset.findUnique({ where: { id } });
  if (!existing) throw notFound("Asset version not found.");

  const updated = await prisma.$transaction(async (tx) => {
    await tx.practicalAssessmentAsset.updateMany({
      where: { kind: existing.kind, isActive: true },
      data: { isActive: false },
    });
    const row = await tx.practicalAssessmentAsset.update({
      where: { id },
      data: { isActive: true },
    });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: "practical_asset.activate",
        entityType: "practical_assessment_asset",
        entityId: row.id,
        reason: `Activated ${row.kind} v${row.version}`,
        conflictDeclared: true,
      },
    });
    return row;
  });

  res.json({ asset: updated });
});

adminPracticalAssessmentRouter.post("/assets/:id/deactivate", async (req, res) => {
  const id = String(req.params.id);
  const existing = await prisma.practicalAssessmentAsset.findUnique({ where: { id } });
  if (!existing) throw notFound("Asset version not found.");

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.practicalAssessmentAsset.update({
      where: { id },
      data: { isActive: false },
    });
    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: "practical_asset.deactivate",
        entityType: "practical_assessment_asset",
        entityId: row.id,
        reason: `Deactivated ${row.kind} v${row.version}`,
        conflictDeclared: true,
      },
    });
    return row;
  });

  res.json({ asset: updated });
});

const listQuerySchema = z.object({
  status: z
    .enum(["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW", "NEEDS_RESUBMISSION", "PASSED", "NOT_PASSED"])
    .optional(),
  q: z.string().trim().optional(),
});

adminPracticalAssessmentRouter.get("/submissions", async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const where = {
    ...(query.status ? { status: query.status as PracticalAssessmentStatus } : {}),
    ...(query.q
      ? {
          member: {
            OR: [
              { firstName: { contains: query.q, mode: "insensitive" as const } },
              { lastName: { contains: query.q, mode: "insensitive" as const } },
              { tradingName: { contains: query.q, mode: "insensitive" as const } },
              { user: { email: { contains: query.q, mode: "insensitive" as const } } },
            ],
          },
        }
      : {}),
  };

  const [submissions, settings] = await Promise.all([
    prisma.practicalAssessmentSubmission.findMany({
      where,
      orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tradingName: true,
            scope: true,
            memberStatus: true,
            user: { select: { id: true, email: true } },
          },
        },
        reviewer: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    }),
    getAssociationSettings(),
  ]);

  res.json({
    submissions: submissions.map((s) => ({
      id: s.id,
      status: s.status,
      serviceTrack: s.serviceTrack,
      tutorialVersion: s.tutorialVersion,
      assignmentVersion: s.assignmentVersion,
      tutorialWatched: s.tutorialWatched,
      submittedAt: s.submittedAt,
      reviewedAt: s.reviewedAt,
      totalScore: s.totalScore,
      passThresholdUsed: s.passThresholdUsed,
      hasEvidence: Boolean(s.evidenceStoragePath),
      applicant: {
        memberProfileId: s.member.id,
        name: `${s.member.firstName} ${s.member.lastName}`.trim(),
        email: s.member.user.email,
        tradingName: s.member.tradingName,
        declaredScope: s.member.scope,
        memberStatus: s.member.memberStatus,
      },
      reviewer: s.reviewer,
    })),
    practicalPassThreshold: settings.practicalPassThreshold,
    rubricAreas: PRACTICAL_RUBRIC_AREAS,
    tracks: PRACTICAL_TRACKS,
  });
});

adminPracticalAssessmentRouter.get("/submissions/:id", async (req, res) => {
  const id = String(req.params.id);
  const [submission, settings, audit] = await Promise.all([
    prisma.practicalAssessmentSubmission.findUnique({
      where: { id },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tradingName: true,
            scope: true,
            memberStatus: true,
            user: {
              select: {
                id: true,
                email: true,
                applications: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: { id: true, number: true, status: true },
                },
              },
            },
          },
        },
        reviewer: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    }),
    getAssociationSettings(),
    prisma.auditLog.findMany({
      where: { entityType: "practical_assessment_submission", entityId: id },
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { id: true, email: true, firstName: true, lastName: true } } },
    }),
  ]);

  if (!submission) throw notFound("Practical assessment submission not found.");

  res.json({
    submission: {
      id: submission.id,
      status: submission.status,
      serviceTrack: submission.serviceTrack,
      tutorialVersion: submission.tutorialVersion,
      assignmentVersion: submission.assignmentVersion,
      tutorialWatched: submission.tutorialWatched,
      tutorialWatchedAt: submission.tutorialWatchedAt,
      answers: submission.answers,
      evidence: submission.evidenceStoragePath
        ? {
            fileName: submission.evidenceFileName,
            mimeType: submission.evidenceMimeType,
            sizeBytes: submission.evidenceSizeBytes,
            url: `/api/admin/practical-assessment/submissions/${submission.id}/evidence`,
          }
        : null,
      submittedAt: submission.submittedAt,
      reviewedAt: submission.reviewedAt,
      rubricScores: submission.rubricScores,
      totalScore: submission.totalScore,
      passThresholdUsed: submission.passThresholdUsed,
      reviewerFeedback: submission.reviewerFeedback,
      reviewer: submission.reviewer,
      applicant: {
        memberProfileId: submission.member.id,
        name: `${submission.member.firstName} ${submission.member.lastName}`.trim(),
        email: submission.member.user.email,
        tradingName: submission.member.tradingName,
        declaredScope: submission.member.scope,
        memberStatus: submission.member.memberStatus,
        application: submission.member.user.applications[0] ?? null,
      },
    },
    practicalPassThreshold: settings.practicalPassThreshold,
    rubricAreas: PRACTICAL_RUBRIC_AREAS,
    tracks: PRACTICAL_TRACKS,
    audit,
  });
});

adminPracticalAssessmentRouter.get("/submissions/:id/evidence", async (req, res) => {
  const submission = await prisma.practicalAssessmentSubmission.findUnique({
    where: { id: String(req.params.id) },
  });
  if (!submission || !submission.evidenceStoragePath) throw notFound("Evidence file not found.");

  const filePath = privateFilePath(submission.evidenceStoragePath);
  if (!existsSync(filePath)) throw notFound("Evidence file is no longer available on disk.");

  await logPrivateFileAccess({
    actorId: req.user!.id,
    action: "admin.practical_evidence_access",
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

const reviewSchema = z
  .object({
    outcome: z.enum(["UNDER_REVIEW", "PASSED", "NEEDS_RESUBMISSION", "NOT_PASSED"]),
    rubricScores: z
      .object({
        understandingBrief: z.number().int().min(0).max(15),
        researchSources: z.number().int().min(0).max(20),
        budgetAccuracy: z.number().int().min(0).max(20),
        recommendationAlternatives: z.number().int().min(0).max(15),
        professionalCommunication: z.number().int().min(0).max(15),
        ethicsDisclosurePrivacy: z.number().int().min(0).max(15),
      })
      .optional(),
    reviewerFeedback: z.string().trim().max(3000).optional(),
  })
  .superRefine((val, ctx) => {
    if ((val.outcome === "NEEDS_RESUBMISSION" || val.outcome === "NOT_PASSED") && (!val.reviewerFeedback || val.reviewerFeedback.length < 10)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewerFeedback"],
        message: "Provide clear feedback (at least 10 characters) when requesting resubmission or marking not passed.",
      });
    }
  });

adminPracticalAssessmentRouter.post("/submissions/:id/review", async (req, res) => {
  const id = String(req.params.id);
  const body = reviewSchema.parse(req.body ?? {});

  const [existing, settings] = await Promise.all([
    prisma.practicalAssessmentSubmission.findUnique({ where: { id } }),
    getAssociationSettings(),
  ]);
  if (!existing) throw notFound("Practical assessment submission not found.");

  const totalScore = body.rubricScores
    ? Object.values(body.rubricScores).reduce((sum, n) => sum + n, 0)
    : existing.totalScore;

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.practicalAssessmentSubmission.update({
      where: { id },
      data: {
        status: body.outcome,
        reviewerId: req.user!.id,
        reviewedAt: new Date(),
        ...(body.rubricScores ? { rubricScores: body.rubricScores } : {}),
        ...(totalScore !== null && totalScore !== undefined ? { totalScore } : {}),
        passThresholdUsed: settings.practicalPassThreshold,
        ...(body.reviewerFeedback !== undefined ? { reviewerFeedback: body.reviewerFeedback } : {}),
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: `practical_assessment.${body.outcome.toLowerCase()}`,
        entityType: "practical_assessment_submission",
        entityId: row.id,
        reason: `Outcome: ${body.outcome}${totalScore !== null && totalScore !== undefined ? ` (score ${totalScore}/100, threshold ${settings.practicalPassThreshold})` : ""}${body.reviewerFeedback ? ` — ${body.reviewerFeedback}` : ""}`,
        conflictDeclared: true,
      },
    });

    return row;
  });

  res.json({ submission: updated });
});
