import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { notFound } from "../lib/http.js";

/** Customers have no account. These routes never return private member data. */
const publicWhere = {
  verificationStatus: "verified" as const,
  isActive: true,
};

const publicSelect = {
  id: true,
  businessName: true,
  category: true,
  verificationStatus: true,
  isActive: true,
  user: { select: { firstName: true, lastName: true } },
  socialAccounts: { select: { platform: true, url: true }, orderBy: { platform: "asc" as const } },
} as const;

function toPublicMember(member: {
  id: string;
  businessName: string | null;
  category: string;
  verificationStatus: string;
  isActive: boolean;
  user: { firstName: string; lastName: string };
  socialAccounts: { platform: string; url: string }[];
}) {
  return {
    id: member.id,
    firstName: member.user.firstName,
    lastName: member.user.lastName,
    businessName: member.businessName,
    category: member.category,
    verificationStatus: member.verificationStatus,
    isActive: member.isActive,
    socialAccounts: member.socialAccounts,
  };
}

export const publicMembersRouter = Router();

publicMembersRouter.get("/members", async (req, res) => {
  const { q } = z.object({ q: z.string().trim().max(100).optional() }).parse(req.query);
  const members = await prisma.memberProfile.findMany({
    where: {
      ...publicWhere,
      ...(q
        ? {
            OR: [
              { businessName: { contains: q, mode: "insensitive" } },
              { user: { firstName: { contains: q, mode: "insensitive" } } },
              { user: { lastName: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    select: publicSelect,
    orderBy: { businessName: "asc" },
    take: 50,
  });
  res.json(members.map(toPublicMember));
});

publicMembersRouter.get("/members/:id", async (req, res) => {
  const member = await prisma.memberProfile.findFirst({
    where: { id: req.params.id, ...publicWhere },
    select: publicSelect,
  });
  if (!member) throw notFound("Member not found");
  res.json(toPublicMember(member));
});
