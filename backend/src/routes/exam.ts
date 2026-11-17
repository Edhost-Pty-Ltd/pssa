import { Router } from "express";
import { requireRole } from "../middleware/auth.js";

/**
 * Exam routes — Phase 1 Prisma schema does not include exam models yet.
 * Kept mounted so clients receive a clear blocked response.
 */
export const examRouter = Router();

examRouter.get("/status", requireRole("MEMBER"), async (_req, res) => {
  res.json({
    open: false,
    passed: false,
    attempts: 0,
    canStart: false,
    reason: "Entrance assessment is blocked until exam models and official questions land.",
  });
});

examRouter.get("/attempts", requireRole("MEMBER"), async (_req, res) => {
  res.json({ attempts: [] });
});

examRouter.get("/questions", requireRole("ADMIN"), async (_req, res) => {
  res.json({ questions: [] });
});
