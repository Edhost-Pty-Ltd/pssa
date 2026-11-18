import type { MemberStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export type PublicRegisterQuery = {
  q?: string;
  page?: number;
  pageSize?: number;
};

const PUBLIC_STATUSES: MemberStatus[] = ["active", "suspended", "expired", "revoked", "resigned"];

function maskPhone(value: string | null | undefined) {
  if (!value) return null;
  const visible = value.slice(-4);
  return `${"•".repeat(Math.max(0, value.length - 4))}${visible}`;
}

/** Stored Active is not enough. A passed validUntil must show as expired. */
export function liveMemberStatus(member: { memberStatus: MemberStatus | null; validUntil: Date | null }, now = new Date()): MemberStatus | null {
  if (!member.memberStatus) return null;
  if (member.memberStatus === "suspended" || member.memberStatus === "revoked" || member.memberStatus === "resigned") {
    return member.memberStatus;
  }
  if (member.validUntil && member.validUntil.getTime() <= now.getTime()) return "expired";
  return member.memberStatus;
}

function publicWhere(q?: string): Prisma.MemberProfileWhereInput {
  const term = q?.trim();
  return {
    memberStatus: { in: PUBLIC_STATUSES },
    ...(term
      ? {
          OR: [
            { firstName: { contains: term, mode: "insensitive" } },
            { lastName: { contains: term, mode: "insensitive" } },
            { tradingName: { contains: term, mode: "insensitive" } },
            { certificates: { some: { number: { contains: term, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
}

const publicSelect = {
  id: true,
  firstName: true,
  lastName: true,
  tradingName: true,
  phone: true,
  scope: true,
  memberStatus: true,
  validUntil: true,
  channels: { where: { status: "confirmed" as const }, select: { kind: true, value: true } },
  certificates: { orderBy: { issuedAt: "desc" as const }, take: 1, select: { number: true, scope: true, validUntil: true, status: true } },
} satisfies Prisma.MemberProfileSelect;

type PublicRow = Prisma.MemberProfileGetPayload<{ select: typeof publicSelect }>;

function toPublicMember(row: PublicRow) {
  const certificate = row.certificates[0] ?? null;
  const validUntil = certificate?.validUntil ?? row.validUntil;
  return {
    id: row.id,
    name: `${row.firstName} ${row.lastName}`.trim(),
    tradingName: row.tradingName,
    number: certificate?.number ?? null,
    scope: certificate?.scope ?? row.scope,
    status: liveMemberStatus({ memberStatus: row.memberStatus, validUntil }),
    validUntil,
    channels: row.channels.map((channel) => ({
      kind: channel.kind,
      value: /phone|mobile|sms/i.test(channel.kind) ? maskPhone(channel.value) : channel.value,
    })),
    phone: maskPhone(row.phone),
  };
}

/** Public register. Pending applicants are omitted. No ID, bank, address, or email. */
export async function searchPublicMembers(query: PublicRegisterQuery) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  const where = publicWhere(query.q);

  const [total, rows] = await prisma.$transaction([
    prisma.memberProfile.count({ where }),
    prisma.memberProfile.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: publicSelect,
    }),
  ]);

  return { items: rows.map(toPublicMember), page, pageSize, total };
}

/** One public profile by profile id or certificate number. Null means not publicly visible. */
export async function publicMember(ref: string) {
  const value = ref.trim();
  const row = await prisma.memberProfile.findFirst({
    where: {
      AND: [
        publicWhere(),
        { OR: [{ id: value }, { certificates: { some: { number: { equals: value, mode: "insensitive" } } } }] },
      ],
    },
    select: publicSelect,
  });
  return row ? toPublicMember(row) : null;
}
