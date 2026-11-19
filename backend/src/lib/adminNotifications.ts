import type { AdminNotification, AdminNotificationType } from "@prisma/client";
import { prisma } from "./prisma.js";

export function serializeAdminNotification(row: AdminNotification) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    type: row.type,
    read: row.read,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Upsert inbox rows from open applications/complaints so the feed is not mock-only. */
export async function ensureAdminNotificationsFromQueue() {
  const [applications, complaints] = await Promise.all([
    prisma.application.findMany({
      where: { status: { in: ["submitted", "under_review", "needs_info"] } },
      orderBy: { updatedAt: "desc" },
      take: 25,
      select: {
        id: true,
        number: true,
        status: true,
        updatedAt: true,
        user: {
          select: {
            memberProfile: { select: { firstName: true, lastName: true, tradingName: true } },
          },
        },
      },
    }),
    prisma.complaint.findMany({
      where: { status: { in: ["received", "under_review", "awaiting_member_response"] }, isDraft: false },
      orderBy: { updatedAt: "desc" },
      take: 25,
      select: {
        id: true,
        referenceNumber: true,
        type: true,
        status: true,
        updatedAt: true,
      },
    }),
  ]);

  for (const application of applications) {
    const profile = application.user.memberProfile;
    const name = profile
      ? [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.tradingName || "Applicant"
      : "Applicant";
    const trading = profile?.tradingName ? ` (${profile.tradingName})` : "";
    await prisma.adminNotification.upsert({
      where: { sourceKey: `application:${application.id}` },
      create: {
        sourceKey: `application:${application.id}`,
        title: "Verification application needs review",
        body: `${name}${trading} — ${application.number} is ${application.status.replaceAll("_", " ")}.`,
        type: "INFO",
        createdAt: application.updatedAt,
      },
      update: {
        title: "Verification application needs review",
        body: `${name}${trading} — ${application.number} is ${application.status.replaceAll("_", " ")}.`,
        type: "INFO",
      },
    });
  }

  for (const complaint of complaints) {
    const ref = complaint.referenceNumber ?? complaint.id;
    const type: AdminNotificationType = complaint.type === "impersonation" || complaint.type === "badge_misuse" ? "WARNING" : "INFO";
    await prisma.adminNotification.upsert({
      where: { sourceKey: `complaint:${complaint.id}` },
      create: {
        sourceKey: `complaint:${complaint.id}`,
        title: "Open complaint requires attention",
        body: `${ref} (${complaint.type.replaceAll("_", " ")}) is ${complaint.status.replaceAll("_", " ")}.`,
        type,
        createdAt: complaint.updatedAt,
      },
      update: {
        title: "Open complaint requires attention",
        body: `${ref} (${complaint.type.replaceAll("_", " ")}) is ${complaint.status.replaceAll("_", " ")}.`,
        type,
      },
    });
  }
}

export async function listAdminNotifications() {
  await ensureAdminNotificationsFromQueue();
  const rows = await prisma.adminNotification.findMany({
    orderBy: [{ read: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  return rows.map(serializeAdminNotification);
}

export async function markAllAdminNotificationsRead() {
  await prisma.adminNotification.updateMany({
    where: { read: false },
    data: { read: true },
  });
}
