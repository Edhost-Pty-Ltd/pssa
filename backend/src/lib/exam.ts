import { randomInt } from "node:crypto";
import { z } from "zod";
import { prisma } from "./prisma.js";
import { hasCompletedActiveTutorial } from "./tutorialProgress.js";

export const EXAM_SETTINGS = {
  questionsPerAttempt: 10,
  passMark: 80,
} as const;

export const optionSchema = z.object({
  id: z.string().trim().min(1, "is required").max(10, "must be at most 10 characters"),
  text: z.string().trim().min(1, "is required").max(500, "must be at most 500 characters"),
});
export type ExamOption = z.infer<typeof optionSchema>;

export function parseOptions(value: unknown): ExamOption[] {
  const parsed = z.array(optionSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

/** What a member sees: never the correct answer. */
export function publicQuestion(question: { id: string; prompt: string; options: unknown }) {
  return { id: question.id, prompt: question.prompt, options: parseOptions(question.options) };
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Random active questions for a new attempt (all of them if there are fewer than questionsPerAttempt). */
export async function drawQuestionIds() {
  const active = await prisma.examQuestion.findMany({ where: { isActive: true }, select: { id: true } });
  return shuffle(active.map((question) => question.id)).slice(0, EXAM_SETTINGS.questionsPerAttempt);
}

/** Questions for an attempt, in the attempt's order. Questions deleted since are skipped. */
export async function questionsFor(questionIds: string[]) {
  const rows = await prisma.examQuestion.findMany({ where: { id: { in: questionIds } } });
  const byId = new Map(rows.map((row) => [row.id, row]));
  return questionIds.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

/**
 * Scores an attempt on the server. Unanswered questions, unknown option ids and answers to questions
 * that weren't in the attempt all count as wrong. Pass = at least passMark percent correct.
 */
export async function gradeAttempt(questionIds: string[], answers: Record<string, string>) {
  const questions = await prisma.examQuestion.findMany({ where: { id: { in: questionIds } }, select: { id: true, correctOptionId: true } });
  const correctById = new Map(questions.map((question) => [question.id, question.correctOptionId]));
  const totalQuestions = questionIds.length;
  const correct = questionIds.filter((id) => correctById.has(id) && answers[id] === correctById.get(id)).length;
  const percent = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
  return { correct, totalQuestions, percent, passed: totalQuestions > 0 && percent >= EXAM_SETTINGS.passMark };
}

/** Only the answers to this attempt's own questions are stored. */
export function keepOwnAnswers(questionIds: string[], answers: Record<string, string>) {
  return Object.fromEntries(questionIds.filter((id) => typeof answers[id] === "string").map((id) => [id, answers[id]]));
}

export function attemptSummary(attempt: { id: string; score: number | null; totalQuestions: number | null; passed: boolean | null; startedAt: Date; submittedAt: Date | null }) {
  const total = attempt.totalQuestions ?? 0;
  return {
    id: attempt.id,
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    percent: attempt.score !== null && total > 0 ? Math.round((attempt.score / total) * 100) : null,
    passed: attempt.passed,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
  };
}

/** Everything the exam page needs: whether the member may start, and why not. */
export async function examStatus(memberProfileId: string) {
  const [tutorialCompleted, attempts, activeQuestions] = await Promise.all([
    hasCompletedActiveTutorial(memberProfileId),
    prisma.examAttempt.findMany({ where: { memberProfileId }, orderBy: { startedAt: "desc" } }),
    prisma.examQuestion.count({ where: { isActive: true } }),
  ]);
  const passed = attempts.some((attempt) => attempt.passed === true);
  const open = attempts.find((attempt) => !attempt.submittedAt) ?? null;

  let reason: string | null = null;
  if (passed) reason = "You have already passed the examination.";
  else if (!tutorialCompleted) reason = "Watch the full tutorial video before starting the examination.";
  else if (!open && activeQuestions === 0) reason = "The examination isn't available yet. Please check back later.";

  return {
    tutorialCompleted,
    canStart: reason === null,
    reason,
    passed,
    passMark: EXAM_SETTINGS.passMark,
    openAttempt: open ? { id: open.id, startedAt: open.startedAt, questions: (await questionsFor(open.questionIds)).map(publicQuestion) } : null,
    attempts: attempts.filter((attempt) => attempt.submittedAt).map(attemptSummary),
  };
}
