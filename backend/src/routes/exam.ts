import { Router } from "express";
import { z } from "zod";
import {
  EXAM_DURATION_MS,
  normalizeAnswers,
  pickExamQuestions,
  publicQuestion,
  scoreAttempt,
  serializeAttempt,
} from "../lib/exam.js";
import { attemptHistory, hasPassedEntranceExam, retakeWindow, tutorialCompletion } from "../lib/examReviewQueries.js";
import { badRequest, conflict, notFound } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";

/**
 * Exam status, start, submit, and admin allow-retake.
 * Questions sent to members never include the answer key.
 */
export const examRouter = Router();

async function requireMemberProfileId(userId: string) {
  const profile = await prisma.memberProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) throw notFound("Member profile not found.");
  return profile.id;
}

async function canStartEntrance(memberProfileId: string) {
  const [passed, window, tutorials, activeQuestions] = await Promise.all([
    hasPassedEntranceExam(memberProfileId),
    retakeWindow(memberProfileId),
    tutorialCompletion(memberProfileId),
    prisma.examQuestion.count({ where: { isActive: true } }),
  ]);

  if (passed) return { ok: false as const, reason: "Entrance assessment already passed." };
  if (!tutorials.complete) {
    return {
      ok: false as const,
      reason:
        tutorials.total === 0
          ? "Complete the conduct tutorials once official videos are active."
          : "Complete all conduct tutorials before starting the entrance assessment.",
    };
  }
  if (activeQuestions === 0) {
    return { ok: false as const, reason: "Entrance assessment is blocked until official questions are loaded." };
  }
  if (window.reason === "locked") {
    return { ok: false as const, reason: "Two failed attempts — further training and reviewer approval are required." };
  }
  if (window.reason === "waiting") {
    return { ok: false as const, reason: "Retake opens after the seven-day waiting period." };
  }
  return { ok: true as const, reason: undefined as string | undefined, window };
}

examRouter.get("/status", requireRole("MEMBER"), async (req, res) => {
  const memberProfileId = await requireMemberProfileId(req.user!.id);
  const [passed, history, window, gate] = await Promise.all([
    hasPassedEntranceExam(memberProfileId),
    attemptHistory(memberProfileId, "entrance"),
    retakeWindow(memberProfileId),
    canStartEntrance(memberProfileId),
  ]);

  res.json({
    open: gate.ok,
    passed,
    attempts: history.attemptCount,
    canStart: gate.ok,
    reason: gate.reason,
    retakeOpensAt: window.opensOn,
  });
});

examRouter.get("/attempts", requireRole("MEMBER"), async (req, res) => {
  const memberProfileId = await requireMemberProfileId(req.user!.id);
  const { attempts } = await attemptHistory(memberProfileId);
  res.json({ attempts: attempts.map(serializeAttempt) });
});

const startSchema = z
  .object({
    type: z.enum(["entrance", "refresher"]).optional().default("entrance"),
  })
  .default({ type: "entrance" });

examRouter.post("/start", requireRole("MEMBER"), async (req, res) => {
  const body = startSchema.parse(req.body ?? {});
  if (body.type !== "entrance") {
    throw badRequest("Only the entrance assessment is available in Phase 1.", { fields: { type: "must be entrance" } });
  }

  const memberProfileId = await requireMemberProfileId(req.user!.id);
  const gate = await canStartEntrance(memberProfileId);
  if (!gate.ok) throw conflict(gate.reason);

  const openAttempt = await prisma.examAttempt.findFirst({
    where: { memberProfileId, type: "entrance", submittedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { startedAt: "desc" },
  });
  if (openAttempt) {
    const questions = await prisma.examQuestion.findMany({
      where: { id: { in: openAttempt.questionIds } },
      select: { id: true, prompt: true, options: true, isCritical: true, topic: true, sortOrder: true },
    });
    const byId = new Map(questions.map((question) => [question.id, question]));
    res.status(200).json({
      attempt: serializeAttempt(openAttempt),
      questions: openAttempt.questionIds.map((id) => byId.get(id)).filter(Boolean).map((question) => publicQuestion(question!)),
      expiresAt: openAttempt.expiresAt,
    });
    return;
  }

  const picked = await pickExamQuestions();
  if (picked.length === 0) {
    throw conflict("Entrance assessment is blocked until official questions are loaded.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXAM_DURATION_MS);
  const attempt = await prisma.examAttempt.create({
    data: {
      memberProfileId,
      type: "entrance",
      questionIds: picked.map((question) => question.id),
      startedAt: now,
      expiresAt,
    },
  });

  res.status(201).json({
    attempt: serializeAttempt(attempt),
    questions: picked.map(publicQuestion),
    expiresAt,
  });
});

const submitSchema = z.object({
  answers: z.union([z.record(z.string(), z.string()), z.array(z.object({ questionId: z.string(), optionId: z.string() }))]),
});

examRouter.post("/attempts/:id/submit", requireRole("MEMBER"), async (req, res) => {
  const body = submitSchema.parse(req.body ?? {});
  const answers = normalizeAnswers(body.answers);
  const memberProfileId = await requireMemberProfileId(req.user!.id);

  const attempt = await prisma.examAttempt.findUnique({ where: { id: String(req.params.id) } });
  if (!attempt || attempt.memberProfileId !== memberProfileId) throw notFound("Exam attempt not found.");
  if (attempt.submittedAt) throw conflict("This attempt has already been submitted.");

  const questions = await prisma.examQuestion.findMany({
    where: { id: { in: attempt.questionIds } },
    select: { id: true, correctOptionId: true, isCritical: true },
  });
  const now = new Date();
  const overdue = now.getTime() > attempt.expiresAt.getTime();
  const result = scoreAttempt(questions, answers, overdue);

  const updated = await prisma.examAttempt.update({
    where: { id: attempt.id },
    data: {
      answers,
      score: result.score,
      percent: result.percent,
      passed: result.passed,
      criticalFailed: result.criticalFailed,
      submittedAt: now,
    },
  });

  res.json({ attempt: serializeAttempt(updated) });
});

examRouter.get("/questions", requireRole("ADMIN"), async (_req, res) => {
  const questions = await prisma.examQuestion.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      prompt: true,
      options: true,
      correctOptionId: true,
      isCritical: true,
      topic: true,
      isActive: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  res.json({ questions });
});

const allowRetakeSchema = z.object({
  reason: z.string().trim().min(10, "must be at least 10 characters"),
  conflictDeclared: z.literal(true, { error: "conflict declaration is required" }),
});

examRouter.post("/attempts/:id/allow-retake", requireRole("ADMIN"), async (req, res) => {
  const body = allowRetakeSchema.parse(req.body ?? {});
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: String(req.params.id) },
    select: {
      id: true,
      memberProfileId: true,
      passed: true,
      submittedAt: true,
      type: true,
      score: true,
      percent: true,
      criticalFailed: true,
      startedAt: true,
      expiresAt: true,
    },
  });
  if (!attempt) throw notFound("Exam attempt not found.");
  if (attempt.passed === true) throw conflict("This member has already passed the entrance assessment.");
  if (!attempt.submittedAt) throw conflict("Only a submitted failed attempt can unlock a retake.");

  const window = await retakeWindow(attempt.memberProfileId);
  if (window.reason !== "locked" && window.failedCount < 2) {
    throw conflict("Allow-retake is only used after two failed attempts.");
  }

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      action: "exam.allow_retake",
      entityType: "member_profile",
      entityId: attempt.memberProfileId,
      reason: body.reason,
      conflictDeclared: true,
    },
  });

  res.json({
    attempt: serializeAttempt(attempt),
    retake: { allowed: true, reason: body.reason },
  });
});
