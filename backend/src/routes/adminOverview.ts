import { Router } from "express";
import { adminOverview } from "../lib/adminOverview.js";
import { requireRole } from "../middleware/auth.js";

/**
 * Admin dashboard overview — thin aggregator over applications, members, complaints, and specialty listings.
 * customers stay empty (no CustomerMember model).
 */
export const adminOverviewRouter = Router();
adminOverviewRouter.use(requireRole("ADMIN"));

adminOverviewRouter.get("/overview", async (_req, res) => {
  res.json(await adminOverview());
});
