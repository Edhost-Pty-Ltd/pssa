import { Router } from "express";
import { attemptHistory, hasPassedEntranceExam, retakeWindow, tutorialCompletion } from "../lib/examReviewQueries.js";
import { notFound } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";

/**
 * Exam status and history for members.
 * Start/submit stay for a follow-up once official questions are loaded.
 */
export const examRouter = Router();

async function requireMemberProfileId(userId: string) {
  const profile = await prisma.memberProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) throw notFound("Member profile not found.");
  return profile.id;
}

examRouter.get("/status", requireRole("MEMBER"), async (req, res) => {
  const memberProfileId = await requireMemberProfileId(req.user!.id);
  const [passed, history, window, tutorials, activeQuestions] = await Promise.all([
    hasPassedEntranceExam(memberProfileId),
    attemptHistory(memberProfileId, "entrance"),
    retakeWindow(memberProfileId),
    tutorialCompletion(memberProfileId),
    prisma.examQuestion.count({ where: { isActive: true } }),
  ]);

  let reason: string | undefined;
  let canStart = false;

  if (passed) {
    reason = "Entrance assessment already passed.";
  } else if (!tutorials.complete) {
    reason =
      tutorials.total === 0
        ? "Complete the conduct tutorials once official videos are active."
        : "Complete all conduct tutorials before starting the entrance assessment.";
  } else if (activeQuestions === 0) {
    reason = "Entrance assessment is blocked until official questions are loaded.";
  } else if (window.reason === "locked") {
    reason = "Two failed attempts — further training and reviewer approval are required.";
  } else if (window.reason === "waiting") {
    reason = "Retake opens after the seven-day waiting period.";
  } else {
    canStart = true;
  }

  res.json({
    open: canStart,
    passed,
    attempts: history.attemptCount,
    canStart,
    reason,
    retakeOpensAt: window.opensOn,
  });
});

examRouter.get("/attempts", requireRole("MEMBER"), async (req, res) => {
  const memberProfileId = await requireMemberProfileId(req.user!.id);
  const { attempts } = await attemptHistory(memberProfileId);
  res.json({ attempts });
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
