import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authLimiter } from "../lib/rateLimit.js";
import { createMember, memberRegistrationSchema, serializeUser, toLegacyMember, userSelect } from "../lib/members.js";
import { issueSession, requireRole } from "../middleware/auth.js";

/**
 * Endpoints the current frontend already calls (frontend/src/api/members.ts).
 * New code should use POST /api/auth/register.
 */
export const membersRouter = Router();

membersRouter.post("/register", authLimiter, async (req, res) => {
  const input = memberRegistrationSchema.parse(req.body);
  const user = await createMember(input);
  issueSession(res, user);
  res.status(201).json({ message: "Member registered successfully", member: toLegacyMember(user), user: serializeUser(user) });
});

/** Includes emails and phone numbers, so admins only. */
membersRouter.get("/", requireRole("ADMIN"), async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { member: { isNot: null } },
    orderBy: { createdAt: "desc" },
    select: userSelect,
  });
  res.json(users.map(toLegacyMember));
});
