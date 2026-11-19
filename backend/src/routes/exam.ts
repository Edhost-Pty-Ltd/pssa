import { Router } from "express";
import { z } from "zod";
import {
  EXAM_DURATION_MS,
  normalizeAnswers,
  normalizeQuestionOptions,
  pickExamQuestions,
  publicQuestion,
  scoreAttempt,
  serializeAdminQuestion,
  serializeAttempt,
} from "../lib/exam.js";
import {
  attemptHistory,
  hasPassedEntranceExam,
  hasPassedRefresherExam,
  retakeWindow,
  tutorialCompletion,
} from "../lib/examReviewQueries.js";
import { badRequest, conflict, notFound } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { canStartRenewal, findOpenRenewal, renewalWindowOpensAt } from "../lib/renewals.js";
import { requireRole } from "../middleware/auth.js";

/**
 * Exam status, start, submit, admin question bank CRUD, and allow-retake.
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
    retakeWindow(memberProfileId, new Date(), "entrance"),
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

/** Refresher is for renewal: open renewal or inside the renewal window. Tutorials are not re-required. */
async function canStartRefresher(memberProfileId: string) {
  const [profile, openRenewal, activeQuestions] = await Promise.all([
    prisma.memberProfile.findUnique({
      where: { id: memberProfileId },
      select: { memberStatus: true, validUntil: true },
    }),
    findOpenRenewal(memberProfileId),
    prisma.examQuestion.count({ where: { isActive: true } }),
  ]);
  if (!profile) return { ok: false as const, reason: "Member profile not found." };

  const since = openRenewal?.startedAt ?? openRenewal?.windowOpensAt ?? (profile.validUntil ? renewalWindowOpensAt(profile.validUntil) : null);
  const passed = await hasPassedRefresherExam(memberProfileId, since);
  if (passed) return { ok: false as const, reason: "Refresher assessment already passed for this renewal cycle." };

  if (!openRenewal) {
    const eligibility = canStartRenewal({
      memberStatus: profile.memberStatus,
      validUntil: profile.validUntil,
    });
    if (!eligibility.ok) {
      return { ok: false as const, reason: eligibility.reason };
    }
  }

  if (activeQuestions === 0) {
    return { ok: false as const, reason: "Refresher assessment is blocked until official questions are loaded." };
  }

  const window = await retakeWindow(memberProfileId, new Date(), "refresher");
  if (window.reason === "locked") {
    return { ok: false as const, reason: "Two failed refresher attempts — further training and reviewer approval are required." };
  }
  if (window.reason === "waiting") {
    return { ok: false as const, reason: "Refresher retake opens after the seven-day waiting period." };
  }
  return { ok: true as const, reason: undefined as string | undefined, window, since };
}

const statusQuerySchema = z.object({
  type: z.enum(["entrance", "refresher"]).default("entrance"),
});

examRouter.get("/status", requireRole("MEMBER"), async (req, res) => {
  const { type } = statusQuerySchema.parse(req.query);
  const memberProfileId = await requireMemberProfileId(req.user!.id);

  if (type === "refresher") {
    const gate = await canStartRefresher(memberProfileId);
    const since = "since" in gate ? gate.since : null;
    const [passed, history, window] = await Promise.all([
      hasPassedRefresherExam(memberProfileId, since ?? undefined),
      attemptHistory(memberProfileId, "refresher"),
      retakeWindow(memberProfileId, new Date(), "refresher"),
    ]);
    res.json({
      type: "refresher",
      open: gate.ok,
      passed,
      attempts: history.attemptCount,
      canStart: gate.ok,
      reason: gate.reason,
      retakeOpensAt: window.opensOn,
    });
    return;
  }

  const [passed, history, window, gate] = await Promise.all([
    hasPassedEntranceExam(memberProfileId),
    attemptHistory(memberProfileId, "entrance"),
    retakeWindow(memberProfileId, new Date(), "entrance"),
    canStartEntrance(memberProfileId),
  ]);

  res.json({
    type: "entrance",
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
  const type = body.type;
  const memberProfileId = await requireMemberProfileId(req.user!.id);

  const gate = type === "refresher" ? await canStartRefresher(memberProfileId) : await canStartEntrance(memberProfileId);
  if (!gate.ok) throw conflict(gate.reason);

  const openAttempt = await prisma.examAttempt.findFirst({
    where: { memberProfileId, type, submittedAt: null, expiresAt: { gt: new Date() } },
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
    throw conflict(
      type === "refresher"
        ? "Refresher assessment is blocked until official questions are loaded."
        : "Entrance assessment is blocked until official questions are loaded.",
    );
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXAM_DURATION_MS);
  const attempt = await prisma.examAttempt.create({
    data: {
      memberProfileId,
      type,
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

const adminQuestionSelect = {
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
} as const;

const optionSchema = z
  .object({
    id: z.string().trim().min(1),
    text: z.string().trim().min(1).optional(),
    label: z.string().trim().min(1).optional(),
  })
  .refine((option) => Boolean(option.text?.trim() || option.label?.trim()), {
    message: "each option needs text or label",
  });

const createQuestionSchema = z.object({
  topic: z.string().trim().min(1, "topic is required"),
  prompt: z.string().trim().min(1, "prompt is required"),
  options: z.array(optionSchema).min(2, "at least two options are required"),
  correctOptionId: z.string().trim().min(1),
  isCritical: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

const patchQuestionSchema = z
  .object({
    topic: z.string().trim().min(1).optional(),
    prompt: z.string().trim().min(1).optional(),
    options: z.array(optionSchema).min(2).optional(),
    correctOptionId: z.string().trim().min(1).optional(),
    isCritical: z.boolean().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "at least one field is required" });

function assertCorrectOption(options: { id: string }[], correctOptionId: string) {
  if (!options.some((option) => option.id === correctOptionId)) {
    throw badRequest("correctOptionId must match one of the option ids.");
  }
}

examRouter.get("/questions", requireRole("ADMIN"), async (_req, res) => {
  const questions = await prisma.examQuestion.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: adminQuestionSelect,
  });
  res.json({ questions: questions.map(serializeAdminQuestion) });
});

examRouter.post("/questions", requireRole("ADMIN"), async (req, res) => {
  const body = createQuestionSchema.parse(req.body ?? {});
  const options = normalizeQuestionOptions(body.options);
  if (options.length < 2) throw badRequest("At least two options with id and text/label are required.");
  assertCorrectOption(options, body.correctOptionId);

  const question = await prisma.examQuestion.create({
    data: {
      topic: body.topic,
      prompt: body.prompt,
      options,
      correctOptionId: body.correctOptionId,
      isCritical: body.isCritical,
      isActive: body.isActive,
      sortOrder: body.sortOrder,
    },
    select: adminQuestionSelect,
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      action: "exam.question_create",
      entityType: "exam_question",
      entityId: question.id,
      reason: `Created assessment question (${body.topic})`,
      conflictDeclared: true,
    },
  });

  res.status(201).json({ question: serializeAdminQuestion(question) });
});

examRouter.patch("/questions/:id", requireRole("ADMIN"), async (req, res) => {
  const body = patchQuestionSchema.parse(req.body ?? {});
  const existing = await prisma.examQuestion.findUnique({
    where: { id: String(req.params.id) },
    select: adminQuestionSelect,
  });
  if (!existing) throw notFound("Exam question not found.");

  const options = body.options ? normalizeQuestionOptions(body.options) : normalizeQuestionOptions(existing.options);
  if (body.options && options.length < 2) {
    throw badRequest("At least two options with id and text/label are required.");
  }
  const correctOptionId = body.correctOptionId ?? existing.correctOptionId;
  assertCorrectOption(options, correctOptionId);

  const question = await prisma.examQuestion.update({
    where: { id: existing.id },
    data: {
      ...(body.topic !== undefined ? { topic: body.topic } : {}),
      ...(body.prompt !== undefined ? { prompt: body.prompt } : {}),
      ...(body.options !== undefined ? { options } : {}),
      ...(body.correctOptionId !== undefined ? { correctOptionId: body.correctOptionId } : {}),
      ...(body.isCritical !== undefined ? { isCritical: body.isCritical } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    },
    select: adminQuestionSelect,
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      action: "exam.question_update",
      entityType: "exam_question",
      entityId: question.id,
      reason: `Updated assessment question (${question.topic ?? question.id})`,
      conflictDeclared: true,
    },
  });

  res.json({ question: serializeAdminQuestion(question) });
});

examRouter.delete("/questions/:id", requireRole("ADMIN"), async (req, res) => {
  const existing = await prisma.examQuestion.findUnique({
    where: { id: String(req.params.id) },
    select: { id: true, topic: true },
  });
  if (!existing) throw notFound("Exam question not found.");

  await prisma.examQuestion.delete({ where: { id: existing.id } });

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      action: "exam.question_delete",
      entityType: "exam_question",
      entityId: existing.id,
      reason: `Removed assessment question (${existing.topic ?? existing.id})`,
      conflictDeclared: true,
    },
  });

  res.json({ ok: true });
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
  if (attempt.passed === true) throw conflict("This member has already passed this assessment.");
  if (!attempt.submittedAt) throw conflict("Only a submitted failed attempt can unlock a retake.");

  const examType = attempt.type === "refresher" ? "refresher" : "entrance";
  const window = await retakeWindow(attempt.memberProfileId, new Date(), examType);
  if (window.reason !== "locked" && window.failedCount < 2) {
    throw conflict("Allow-retake is only used after two failed attempts.");
  }

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      action: examType === "refresher" ? "exam.allow_retake_refresher" : "exam.allow_retake",
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
