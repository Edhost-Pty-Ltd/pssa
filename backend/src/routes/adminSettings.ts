import { Router } from "express";
import { z } from "zod";
import { listAdminNotifications, markAllAdminNotificationsRead } from "../lib/adminNotifications.js";
import { getAssociationSettings, saveAssociationSettings } from "../lib/adminSettings.js";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";

/**
 * Admin association settings + notification inbox for the dashboard UI.
 */
export const adminSettingsRouter = Router();
adminSettingsRouter.use(requireRole("ADMIN"));

const settingsSchema = z.object({
  associationName: z.string().trim().min(2).max(120),
  supportEmail: z.string().trim().email(),
  annualMembershipFeeZar: z.number().int().min(0).max(1_000_000),
  verificationSlaHours: z.number().int().min(1).max(24 * 30),
  autoPublishApprovedListings: z.boolean(),
  requireIdVerification: z.boolean(),
});

adminSettingsRouter.get("/settings", async (_req, res) => {
  res.json(await getAssociationSettings());
});

adminSettingsRouter.put("/settings", async (req, res) => {
  const body = settingsSchema.parse(req.body ?? {});
  const settings = await saveAssociationSettings(body);

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.id,
      action: "settings.update",
      entityType: "association_settings",
      entityId: "default",
      reason: `Updated association settings (${settings.associationName})`,
      conflictDeclared: true,
    },
  });

  res.json(settings);
});

adminSettingsRouter.get("/notifications", async (_req, res) => {
  res.json(await listAdminNotifications());
});

adminSettingsRouter.post("/notifications/read-all", async (_req, res) => {
  await markAllAdminNotificationsRead();
  res.json({ ok: true });
});
