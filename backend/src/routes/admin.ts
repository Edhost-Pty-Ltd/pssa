import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { Router } from "express";
import { z } from "zod";
import type { ApplicationStatus, DocumentReviewStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { badRequest, conflict, notFound } from "../lib/http.js";
import { privateFilePath } from "../lib/uploads.js";
import { requireRole } from "../middleware/auth.js";
import { applicationSummary, listApplications } from "../lib/adminApplicationQueries.js";

const APPLICATION_STATUSES = ["submitted", "under_review", "info_required", "approved", "rejected"] as const;

const listQuerySchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
});

const documentReviewSchema = z.object({
  reviewStatus: z.enum(["submitted", "accepted", "rejected"]),
  reviewerNote: z.string().max(2000).optional(),
});

const applicationInclude = {
  member: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      documents: { select: { id: true } },
      videoProgress: { include: { tutorialVideo: { select: { isActive: true } } } },
      examAttempts: {
        where: { submittedAt: { not: null } },
        orderBy: { submittedAt: "desc" as const },
        take: 1,
      },
    },
  },
} as const;

type ApplicationRow = Awaited<ReturnType<typeof loadApplication>>;

async function loadApplication(id: string) {
  return prisma.application.findUnique({ where: { id }, include: applicationInclude });
}

function toSummary(application: NonNullable<ApplicationRow>) {
  const exam = application.member.examAttempts[0];
  const tutorialCompleted = application.member.videoProgress.some((progress) => progress.tutorialVideo.isActive && progress.completed);
  return {
    id: application.id,
    status: application.status,
    submittedAt: application.submittedAt,
    updatedAt: application.updatedAt,
    member: {
      profileId: application.member.id,
      userId: application.member.user.id,
      firstName: application.member.user.firstName,
      lastName: application.member.user.lastName,
      email: application.member.user.email,
      phone: application.member.user.phone,
      businessName: application.member.businessName,
      category: application.member.category,
      verificationStatus: application.member.verificationStatus,
      isActive: application.member.isActive,
    },
    documentCount: application.member.documents.length,
    tutorialCompleted,
    examScore: exam?.score ?? null,
    examPassed: exam?.passed ?? null,
  };
}

async function tutorialForMember(memberProfileId: string) {
  const video = await prisma.tutorialVideo.findFirst({ where: { isActive: true } });
  if (!video) {
    return { video: null, tutorialCompleted: false, progressPercent: 0, watchedSeconds: 0, completedAt: null };
  }
  const progress = await prisma.videoProgress.findUnique({
    where: { memberProfileId_tutorialVideoId: { memberProfileId, tutorialVideoId: video.id } },
  });
  return {
    video: { id: video.id, title: video.title, durationSeconds: video.durationSeconds },
    tutorialCompleted: progress?.completed === true,
    progressPercent: progress?.progressPercent ?? 0,
    watchedSeconds: progress?.watchedSeconds ?? 0,
    maxPositionSeconds: progress?.maxPositionSeconds ?? 0,
    completedAt: progress?.completedAt ?? null,
  };
}

async function examForMember(memberProfileId: string) {
  const attempts = await prisma.examAttempt.findMany({
    where: { memberProfileId },
    orderBy: { startedAt: "desc" },
  });
  const submitted = attempts.find((attempt) => attempt.submittedAt);
  return {
    examPassed: submitted ? submitted.passed : null,
    latest: submitted
      ? {
          id: submitted.id,
          totalQuestions: submitted.totalQuestions,
          score: submitted.score,
          passed: submitted.passed,
          startedAt: submitted.startedAt,
          submittedAt: submitted.submittedAt,
        }
      : null,
    attemptCount: attempts.length,
  };
}

export const adminRouter = Router();
adminRouter.use(requireRole("ADMIN"));

adminRouter.get("/summary", async (_req, res) => {
  res.json(await applicationSummary());
});

adminRouter.get("/applications", async (req, res) => {
  const status = typeof req.query.status === "string" && req.query.status ? req.query.status : undefined;
  const allowed = ["draft", "submitted", "under_review", "needs_info", "approved", "rejected"] as const;
  if (status && !allowed.includes(status as (typeof allowed)[number])) {
    throw badRequest("Unknown application status.", { fields: { status: "is not a valid status" } });
  }
  const page = Number(req.query.page);
  const pageSize = Number(req.query.pageSize);
  res.json(
    await listApplications({
      status: status as (typeof allowed)[number] | undefined,
      q: typeof req.query.q === "string" ? req.query.q : undefined,
      page: Number.isInteger(page) && page > 0 ? page : 1,
      pageSize: Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 20,
    }),
  );
});

adminRouter.get("/applications/:id", async (req, res) => {
  const application = await loadApplication(req.params.id);
  if (!application) throw notFound("Application not found");

  const [documents, socials, tutorial, exam, reviews, certificate] = await Promise.all([
    prisma.memberDocument.findMany({ where: { memberProfileId: application.member.id }, orderBy: { uploadedAt: "asc" } }),
    prisma.socialAccount.findMany({
      where: { memberProfileId: application.member.id },
      orderBy: { platform: "asc" },
      select: { platform: true, url: true },
    }),
    tutorialForMember(application.member.id),
    examForMember(application.member.id),
    prisma.adminReview.findMany({ where: { applicationId: application.id }, orderBy: { createdAt: "desc" } }),
    prisma.certificate.findUnique({ where: { applicationId: application.id } }),
  ]);

  res.json({
    ...toSummary(application),
    member: {
      ...toSummary(application).member,
      idNumber: application.member.idNumber,
      physicalAddress: application.member.physicalAddress,
      socialAccounts: socials,
    },
    documents: documents.map(toDocument),
    tutorial,
    exam,
    certificate: certificate
      ? { id: certificate.id, number: certificate.certificateNumber, issuedAt: certificate.issuedAt, expiresAt: certificate.expiresAt }
      : null,
    reviews: reviews.map((review) => ({
      id: review.id,
      decision: review.decision,
      reason: review.reason,
      documentsChecked: review.documentsChecked,
      tutorialCompleted: review.tutorialCompleted,
      examPassed: review.examPassed,
      createdAt: review.createdAt,
    })),
  });
});

adminRouter.get("/applications/:id/tutorial", async (req, res) => {
  const application = await prisma.application.findUnique({ where: { id: req.params.id }, select: { memberProfileId: true } });
  if (!application) throw notFound("Application not found");
  res.json(await tutorialForMember(application.memberProfileId));
});

adminRouter.get("/applications/:id/exam", async (req, res) => {
  const application = await prisma.application.findUnique({ where: { id: req.params.id }, select: { memberProfileId: true } });
  if (!application) throw notFound("Application not found");
  res.json(await examForMember(application.memberProfileId));
});

/** The file itself. Only an admin can read it; it is never served from a public folder. */
adminRouter.get("/documents/:id/file", async (req, res) => {
  const document = await prisma.memberDocument.findUnique({ where: { id: String(req.params.id) } });
  if (!document) throw notFound("Document not found");
  const filePath = privateFilePath(document.storedName);
  if (!existsSync(filePath)) throw notFound("That file is no longer available.");
  res.type(document.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${document.originalName.replace(/["\r\n]/g, "")}"`);
  res.sendFile(filePath);
});

adminRouter.patch("/documents/:id", async (req, res) => {
  const { reviewStatus, reviewerNote } = documentReviewSchema.parse(req.body);
  const note = reviewerNote?.trim() ?? "";
  if (reviewStatus === "rejected" && note.length < 10) {
    throw badRequest("A rejection needs a note of at least 10 characters.", { fields: { reviewerNote: "must explain the rejection in at least 10 characters" } });
  }

  const existing = await prisma.memberDocument.findUnique({
    where: { id: req.params.id },
    include: { member: { select: { userId: true } } },
  });
  if (!existing) throw notFound("Document not found");
  if (existing.member.userId === req.user!.id) throw conflict("You cannot review your own documents.");

  const document = await prisma.memberDocument.update({
    where: { id: existing.id },
    data: {
      reviewStatus: reviewStatus as DocumentReviewStatus,
      reviewerNote: note || null,
      reviewedAt: reviewStatus === "submitted" ? null : new Date(),
    },
  });
  res.json(toDocument(document));
});

const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected", "info_required"]),
  reason: z.string().max(2000).optional(),
});

const OPEN_FOR_DECISION = ["submitted", "under_review", "info_required"] as const;
const CERTIFICATE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCertificateNumber() {
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < bytes.length; i++) code += CERTIFICATE_ALPHABET[bytes[i] % CERTIFICATE_ALPHABET.length];
  return `EC-${new Date().getUTCFullYear()}-${code}`;
}

adminRouter.post("/applications/:id/decision", async (req, res) => {
  const { decision, reason } = decisionSchema.parse(req.body);
  const note = reason?.trim() ?? "";
  if (decision !== "approved" && note.length < 10) {
    throw badRequest("A rejection or request for information needs a reason of at least 10 characters.", {
      fields: { reason: "must be at least 10 characters" },
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const application = await tx.application.findUnique({
      where: { id: req.params.id },
      include: {
        member: {
          include: {
            documents: true,
            videoProgress: { include: { tutorialVideo: { select: { isActive: true } } } },
            examAttempts: { where: { submittedAt: { not: null } }, orderBy: { submittedAt: "desc" }, take: 1 },
          },
        },
        certificate: true,
      },
    });
    if (!application) throw notFound("Application not found");
    if (application.member.userId === req.user!.id) throw conflict("You cannot review your own application.");
    if (!OPEN_FOR_DECISION.includes(application.status as (typeof OPEN_FOR_DECISION)[number])) {
      throw conflict("This application has already been decided.");
    }

    const documentsChecked =
      application.member.documents.some((document) => document.documentType === "id_document" && document.reviewStatus === "accepted") &&
      application.member.documents.some((document) => document.documentType === "proof_of_residence" && document.reviewStatus === "accepted");
    const tutorialCompleted = application.member.videoProgress.some((progress) => progress.tutorialVideo.isActive && progress.completed);
    const examPassed = application.member.examAttempts[0]?.passed === true;

    if (decision === "approved" && (!documentsChecked || !tutorialCompleted || !examPassed)) {
      throw badRequest("Approve only after the documents are accepted, the tutorial is complete, and the exam is passed.");
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setUTCMonth(expiresAt.getUTCMonth() + 12);

    await tx.application.update({ where: { id: application.id }, data: { status: decision } });
    await tx.memberProfile.update({
      where: { id: application.memberProfileId },
      data:
        decision === "approved"
          ? { verificationStatus: "verified", isActive: true, verifiedAt: now, verificationExpiresAt: expiresAt }
          : { verificationStatus: decision === "rejected" ? "rejected" : "info_required", isActive: decision !== "rejected" },
    });

    let certificate = application.certificate;
    if (decision === "approved") {
      let created = false;
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        try {
          certificate = await tx.certificate.create({
            data: {
              memberProfileId: application.memberProfileId,
              applicationId: application.id,
              certificateNumber: newCertificateNumber(),
              issuedById: req.user!.id,
              issuedAt: now,
              expiresAt,
            },
          });
          created = true;
        } catch (error) {
          if (attempt === 4) throw error;
        }
      }
    }

    const review = await tx.adminReview.create({
      data: {
        applicationId: application.id,
        adminId: req.user!.id,
        decision,
        reason: note || null,
        documentsChecked,
        tutorialCompleted,
        examPassed,
      },
    });

    return { review, certificate: decision === "approved" ? certificate : null };
  });

  res.json({
    decision: result.review.decision,
    reason: result.review.reason,
    documentsChecked: result.review.documentsChecked,
    tutorialCompleted: result.review.tutorialCompleted,
    examPassed: result.review.examPassed,
    createdAt: result.review.createdAt,
    certificate: result.certificate
      ? {
          id: result.certificate.id,
          number: result.certificate.certificateNumber,
          issuedAt: result.certificate.issuedAt,
          expiresAt: result.certificate.expiresAt,
        }
      : null,
  });
});

function toDocument(document: {
  id: string;
  applicationId: string | null;
  documentType: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  reviewStatus: string;
  reviewerNote: string | null;
  reviewedAt: Date | null;
  uploadedAt: Date;
}) {
  return {
    id: document.id,
    applicationId: document.applicationId,
    documentType: document.documentType,
    originalName: document.originalName,
    storedName: document.storedName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    reviewStatus: document.reviewStatus,
    reviewerNote: document.reviewerNote,
    reviewedAt: document.reviewedAt,
    uploadedAt: document.uploadedAt,
  };
}
