import { Router } from "express";
import { z } from "zod";
import { badRequest, conflict, forbidden, notFound } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import {
  attemptSummary,
  drawQuestionIds,
  EXAM_SETTINGS,
  examStatus,
  gradeAttempt,
  keepOwnAnswers,
  optionSchema,
  parseOptions,
  publicQuestion,
  questionsFor,
} from "../lib/exam.js";
import { requireRole } from "../middleware/auth.js";

/**
 * Examination (Thembinkosi, tasks 6–11).
 * Members can only start once they have completed the active tutorial video (task 6).
 * Admins manage the question bank (task 7); members never receive the correct answers.
 * Submissions are scored, stored and marked pass/fail by the server (tasks 8–11).
 */
export const examRouter = Router();

async function myMemberProfileId(userId: string) {
  const member = await prisma.memberProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!member) throw notFound("Member profile not found.");
  return member.id;
}

/* ---------------- Member: status and start (task 6) ---------------- */

examRouter.get("/status", requireRole("MEMBER"), async (req, res) => {
  res.json(await examStatus(await myMemberProfileId(req.user!.id)));
});

/** Returns the open attempt if there is one; otherwise starts a new one with random questions. */
examRouter.post("/start", requireRole("MEMBER"), async (req, res) => {
  const memberProfileId = await myMemberProfileId(req.user!.id);
  const status = await examStatus(memberProfileId);
  if (status.openAttempt) return res.json({ attempt: status.openAttempt });
  if (status.passed) throw conflict("You have already passed the examination.");
  if (!status.tutorialCompleted) throw forbidden("Watch the full tutorial video before starting the examination.");
  if (!status.canStart) throw conflict(status.reason ?? "You can't start the examination right now.");

  const questionIds = await drawQuestionIds();
  const attempt = await prisma.examAttempt.create({
    data: { memberProfileId, questionIds, totalQuestions: questionIds.length },
  });
  res.status(201).json({
    attempt: { id: attempt.id, startedAt: attempt.startedAt, questions: (await questionsFor(questionIds)).map(publicQuestion) },
  });
});

/* ---------------- Member: submit, score, store, pass/fail (tasks 8–11) ---------------- */

const submitSchema = z.object({
  answers: z.record(z.string().max(60), z.string().max(10), { error: "must be an object of { questionId: optionId }" }),
});

examRouter.post("/attempts/:id/submit", requireRole("MEMBER"), async (req, res) => {
  const { answers } = submitSchema.parse(req.body ?? {});
  const memberProfileId = await myMemberProfileId(req.user!.id);
  const attempt = await prisma.examAttempt.findFirst({ where: { id: String(req.params.id), memberProfileId } });
  if (!attempt) throw notFound("Examination attempt not found.");
  if (attempt.submittedAt) throw conflict("This attempt has already been submitted.");

  const result = await gradeAttempt(attempt.questionIds, answers);
  const submittedAt = new Date();
  // The submittedAt: null condition makes a double submit (two tabs, double click) count only once.
  const saved = await prisma.examAttempt.updateMany({
    where: { id: attempt.id, submittedAt: null },
    data: {
      answers: keepOwnAnswers(attempt.questionIds, answers),
      score: result.correct,
      totalQuestions: result.totalQuestions,
      passed: result.passed,
      submittedAt,
    },
  });
  if (saved.count === 0) throw conflict("This attempt has already been submitted.");

  res.json({
    result: {
      attemptId: attempt.id,
      correct: result.correct,
      totalQuestions: result.totalQuestions,
      percent: result.percent,
      passed: result.passed,
      passMark: EXAM_SETTINGS.passMark,
      submittedAt,
    },
  });
});

/** The member's submitted attempts, newest first. */
examRouter.get("/attempts", requireRole("MEMBER"), async (req, res) => {
  const memberProfileId = await myMemberProfileId(req.user!.id);
  const attempts = await prisma.examAttempt.findMany({
    where: { memberProfileId, submittedAt: { not: null } },
    orderBy: { submittedAt: "desc" },
  });
  res.json({ attempts: attempts.map(attemptSummary), passMark: EXAM_SETTINGS.passMark });
});

/* ---------------- Admin: question bank (task 7) ---------------- */

const questionFields = {
  prompt: z.string({ error: "is required" }).trim().min(10, "must be at least 10 characters").max(1000, "must be at most 1000 characters"),
  options: z.array(optionSchema, { error: "must be a list of { id, text }" }).min(2, "needs at least 2 options").max(6, "can have at most 6 options"),
  correctOptionId: z.string({ error: "is required" }).trim().min(1, "is required"),
  topic: z.union([z.null(), z.string().trim().max(100, "must be at most 100 characters")]).optional(),
  isActive: z.boolean({ error: "must be true or false" }).optional(),
  sortOrder: z.number({ error: "must be a number" }).int().min(0).max(10000).optional(),
};

const createSchema = z.object(questionFields);
const updateSchema = z
  .object({
    prompt: questionFields.prompt.optional(),
    options: questionFields.options.optional(),
    correctOptionId: questionFields.correctOptionId.optional(),
    topic: questionFields.topic,
    isActive: questionFields.isActive,
    sortOrder: questionFields.sortOrder,
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), { error: "Provide at least one field to update." });

/** The correct answer must be one of the options, and option ids must be unique. */
function assertValidAnswer(options: { id: string }[], correctOptionId: string) {
  const ids = options.map((option) => option.id);
  if (new Set(ids).size !== ids.length) throw badRequest("Each option needs a different id.", { fields: { options: "must have unique ids" } });
  if (!ids.includes(correctOptionId)) throw badRequest("The correct answer must be one of the options.", { fields: { correctOptionId: "must match one of the option ids" } });
}

function adminView(question: { id: string; prompt: string; options: unknown; correctOptionId: string; topic: string | null; isActive: boolean; sortOrder: number; createdAt: Date; updatedAt: Date }) {
  return { ...question, options: parseOptions(question.options) };
}

examRouter.get("/questions", requireRole("ADMIN"), async (_req, res) => {
  const questions = await prisma.examQuestion.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  res.json({ questions: questions.map(adminView) });
});

examRouter.post("/questions", requireRole("ADMIN"), async (req, res) => {
  const body = createSchema.parse(req.body ?? {});
  assertValidAnswer(body.options, body.correctOptionId);
  const question = await prisma.examQuestion.create({
    data: {
      prompt: body.prompt,
      options: body.options,
      correctOptionId: body.correctOptionId,
      topic: body.topic ?? null,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
    },
  });
  res.status(201).json({ question: adminView(question) });
});

examRouter.patch("/questions/:id", requireRole("ADMIN"), async (req, res) => {
  const body = updateSchema.parse(req.body ?? {});
  const existing = await prisma.examQuestion.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) throw notFound("Question not found.");
  const options = body.options ?? parseOptions(existing.options);
  assertValidAnswer(options, body.correctOptionId ?? existing.correctOptionId);
  const question = await prisma.examQuestion.update({
    where: { id: existing.id },
    data: {
      ...(body.prompt !== undefined ? { prompt: body.prompt } : {}),
      ...(body.options !== undefined ? { options: body.options } : {}),
      ...(body.correctOptionId !== undefined ? { correctOptionId: body.correctOptionId } : {}),
      ...(body.topic !== undefined ? { topic: body.topic } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    },
  });
  res.json({ question: adminView(question) });
});

/** Questions already used in an attempt are kept for the record; deactivate them instead. */
examRouter.delete("/questions/:id", requireRole("ADMIN"), async (req, res) => {
  const existing = await prisma.examQuestion.findUnique({ where: { id: String(req.params.id) } });
  if (!existing) throw notFound("Question not found.");
  const used = await prisma.examAttempt.count({ where: { questionIds: { has: existing.id } } });
  if (used > 0) throw conflict("This question has been used in an examination, so it can't be deleted. Set isActive to false instead.");
  await prisma.examQuestion.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});
