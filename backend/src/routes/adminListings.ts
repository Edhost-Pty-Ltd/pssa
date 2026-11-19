import { Router } from "express";
import { z } from "zod";
import { listListings, updateListingStatus } from "../lib/adminListings.js";
import { notFound } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";

/**
 * Admin specialty shopper profile cards (Listings / Shopper Profiles screen).
 * Not a customer marketplace — moderation only.
 */
export const adminListingsRouter = Router();
adminListingsRouter.use(requireRole("ADMIN"));

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "PENDING", "PAUSED", "FLAGGED"]),
});

adminListingsRouter.get("/listings", async (_req, res) => {
  res.json(await listListings());
});

adminListingsRouter.patch("/listings/:id", async (req, res) => {
  const body = statusSchema.parse(req.body ?? {});
  const listing = await updateListingStatus(String(req.params.id), body.status);
  if (!listing) throw notFound("Listing not found.");

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      action: "listing.status_change",
      entityType: "shopper_profile_listing",
      entityId: listing.id,
      reason: `Set specialty profile status to ${body.status}`,
      conflictDeclared: true,
    },
  });

  res.json({ listing });
});
