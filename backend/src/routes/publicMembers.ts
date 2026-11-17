import { Router } from "express";
import { z } from "zod";
import { notFound } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";

/** Public member register — only Active members are listed. */
export const publicMembersRouter = Router();

const searchSchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

publicMembersRouter.get("/members", async (req, res) => {
  const { q, page, pageSize } = searchSchema.parse(req.query);
  const where = {
    memberStatus: "active" as const,
    ...(q
      ? {
          OR: [
            { tradingName: { contains: q, mode: "insensitive" as const } },
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.memberProfile.count({ where }),
    prisma.memberProfile.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tradingName: true,
        scope: true,
        memberStatus: true,
        validUntil: true,
        channels: {
          where: { status: "confirmed" },
          select: { kind: true, value: true, status: true },
        },
      },
    }),
  ]);

  res.json({ items, page, pageSize, total });
});

publicMembersRouter.get("/members/:id", async (req, res) => {
  const member = await prisma.memberProfile.findFirst({
    where: { id: String(req.params.id), memberStatus: "active" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      tradingName: true,
      scope: true,
      memberStatus: true,
      validFrom: true,
      validUntil: true,
      channels: {
        where: { status: "confirmed" },
        select: { kind: true, value: true, status: true },
      },
    },
  });
  if (!member) throw notFound("Member not found.");
  res.json({ member });
});
