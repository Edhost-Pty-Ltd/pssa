import type { AdminNotification, AdminNotificationType } from "@prisma/client";
import { prisma } from "./prisma.js";

export function serializeAdminNotification(row: AdminNotification) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    type: row.type,
    read: row.read,
    link: row.link,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Create inbox row when a new MEMBER account is registered (password or first OTP). */
export async function notifyAdminMemberSignup(input: {
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const name = [input.firstName, input.lastName].filter((part) => part && part.trim()).join(" ").trim();
  const who = name || input.email;
  await prisma.adminNotification.upsert({
    where: { sourceKey: `signup:${input.userId}` },
    create: {
      sourceKey: `signup:${input.userId}`,
      title: "New member signup",
      body: `${who} created a member account (${input.email}).`,
      type: "INFO",
      link: "/admin/verifications",
    },
    update: {
      title: "New member signup",
      body: `${who} created a member account (${input.email}).`,
      type: "INFO",
      link: "/admin/verifications",
    },
  });
}

/** Create inbox row when a member submits a verification application. */
export async function notifyAdminApplicationSubmitted(input: {
  applicationId: string;
  number: string;
  memberName: string;
  tradingName?: string | null;
}) {
  const trading = input.tradingName ? ` (${input.tradingName})` : "";
  await prisma.adminNotification.upsert({
    where: { sourceKey: `application:${input.applicationId}` },
    create: {
      sourceKey: `application:${input.applicationId}`,
      title: "New verification application",
      body: `${input.memberName}${trading} submitted ${input.number}.`,
      type: "INFO",
      link: `/admin/verifications/${input.applicationId}`,
    },
    update: {
      title: "New verification application",
      body: `${input.memberName}${trading} submitted ${input.number}.`,
      type: "INFO",
      link: `/admin/verifications/${input.applicationId}`,
      read: false,
    },
  });
}

/** Upsert inbox rows from open applications/complaints so the feed stays current on GET. */
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
        link: `/admin/verifications/${application.id}`,
        createdAt: application.updatedAt,
      },
      update: {
        title: "Verification application needs review",
        body: `${name}${trading} — ${application.number} is ${application.status.replaceAll("_", " ")}.`,
        type: "INFO",
        link: `/admin/verifications/${application.id}`,
      },
    });
  }

  for (const complaint of complaints) {
    const ref = complaint.referenceNumber ?? complaint.id;
    const type: AdminNotificationType =
      complaint.type === "impersonation" || complaint.type === "badge_misuse" ? "WARNING" : "INFO";
    await prisma.adminNotification.upsert({
      where: { sourceKey: `complaint:${complaint.id}` },
      create: {
        sourceKey: `complaint:${complaint.id}`,
        title: "Open complaint requires attention",
        body: `${ref} (${complaint.type.replaceAll("_", " ")}) is ${complaint.status.replaceAll("_", " ")}.`,
        type,
        link: `/admin/complaints`,
        createdAt: complaint.updatedAt,
      },
      update: {
        title: "Open complaint requires attention",
        body: `${ref} (${complaint.type.replaceAll("_", " ")}) is ${complaint.status.replaceAll("_", " ")}.`,
        type,
        link: `/admin/complaints`,
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
