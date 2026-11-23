import type { DocumentType } from "@prisma/client";
import { prisma } from "./prisma.js";
import { removePrivateFile } from "./uploads.js";

const PRIVATE_FILE_TYPES = ["id_document", "bank_evidence"] as const;

/**
 * Interim retention window until the senior publishes the Privacy Policy schedule.
 * Identity and bank files are kept for this many years from upload, then eligible for purge.
 */
export const IDENTITY_BANK_RETENTION_YEARS = 7;

export function isPrivateRetentionType(type: DocumentType | string): type is (typeof PRIVATE_FILE_TYPES)[number] {
  return (PRIVATE_FILE_TYPES as readonly string[]).includes(type);
}

/** retainUntil for a new identity/bank upload (null for other document types). */
export function retainUntilForDocument(type: DocumentType | string, from = new Date()) {
  if (!isPrivateRetentionType(type)) return null;
  const until = new Date(from);
  until.setUTCFullYear(until.getUTCFullYear() + IDENTITY_BANK_RETENTION_YEARS);
  return until;
}

/** Identity and bank files whose retain-until date has passed and which are not purged yet. */
export async function identityAndBankFilesDue(now = new Date()) {
  return prisma.document.findMany({
    where: {
      type: { in: [...PRIVATE_FILE_TYPES] },
      purgedAt: null,
      retainUntil: { lte: now },
    },
    orderBy: { retainUntil: "asc" },
    select: {
      id: true,
      userId: true,
      type: true,
      storagePath: true,
      originalName: true,
      retainUntil: true,
    },
  });
}

/** Record that the private file has been removed. Call after deleting the disk file. */
export async function markPrivateFilePurged(documentId: string, purgedAt = new Date()) {
  return prisma.document.update({
    where: { id: documentId },
    data: { purgedAt, storagePath: "" },
    select: { id: true, type: true, purgedAt: true },
  });
}

/**
 * Backfill retainUntil on older identity/bank rows that never received a date
 * (createdAt + IDENTITY_BANK_RETENTION_YEARS), then purge anything due.
 */
export async function runRetentionPurge(now = new Date()) {
  const missing = await prisma.document.findMany({
    where: {
      type: { in: [...PRIVATE_FILE_TYPES] },
      purgedAt: null,
      retainUntil: null,
    },
    select: { id: true, createdAt: true },
  });

  let backfilled = 0;
  for (const row of missing) {
    await prisma.document.update({
      where: { id: row.id },
      data: { retainUntil: retainUntilForDocument("id_document", row.createdAt) },
    });
    backfilled += 1;
  }

  const due = await identityAndBankFilesDue(now);
  let purged = 0;
  for (const row of due) {
    if (row.storagePath) {
      await removePrivateFile(row.storagePath);
    }
    await markPrivateFilePurged(row.id, now);
    await prisma.auditLog.create({
      data: {
        actorId: null,
        action: "privacy.retention_purge",
        entityType: "document",
        entityId: row.id,
        reason: `Purged ${row.type} after retainUntil ${row.retainUntil?.toISOString() ?? "unknown"}`,
        conflictDeclared: false,
      },
    });
    purged += 1;
  }

  return { backfilled, due: due.length, purged, at: now.toISOString() };
}
