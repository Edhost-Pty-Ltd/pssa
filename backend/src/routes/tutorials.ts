import { Router } from "express";
import { requireRole } from "../middleware/auth.js";

/**
 * Tutorial routes — Phase 1 Prisma schema does not include tutorial models yet.
 * Kept mounted so clients receive a clear empty/blocked response.
 */
export const tutorialsRouter = Router();

tutorialsRouter.get("/active", requireRole("MEMBER", "ADMIN"), async (_req, res) => {
  res.json({ tutorials: [], reason: "Tutorial content is blocked until the schema and official videos land." });
});

tutorialsRouter.use(requireRole("ADMIN"));

tutorialsRouter.get("/", async (_req, res) => {
  res.json({ tutorials: [] });
});
