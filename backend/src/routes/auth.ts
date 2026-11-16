import { Router } from "express";
import { z } from "zod";
import { badRequest, conflict, HttpError, unauthorized } from "../lib/http.js";
import { MailNotConfiguredError } from "../lib/mailer.js";
import { emailOtp, generateOtp, hashOtp, maskDestination, OTP_SETTINGS, otpMatches } from "../lib/otp.js";
import { verifyPasswordOrDummy } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import { authLimiter } from "../lib/rateLimit.js";
import {
  createCustomer,
  createMember,
  customerRegistrationSchema,
  memberRegistrationSchema,
  serializeUser,
  signUpRoleSchema,
  userSelect,
} from "../lib/members.js";
import { clearSession, issueSession, requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

/**
 * POST /api/auth/register — public sign-up. `role` is "MEMBER" (default) or "CUSTOMER";
 * admin accounts can't be created here. Signs the new user in.
 */
authRouter.post("/register", authLimiter, async (req, res) => {
  const { role } = signUpRoleSchema.parse(req.body ?? {});
  const user =
    role === "CUSTOMER" ? await createCustomer(customerRegistrationSchema.parse(req.body)) : await createMember(memberRegistrationSchema.parse(req.body));
  issueSession(res, user);
  res.status(201).json({ message: role === "CUSTOMER" ? "Customer registered successfully" : "Member registered successfully", user: serializeUser(user) });
});

const loginSchema = z.object({
  email: z.string({ error: "is required" }).trim().toLowerCase().min(1, "is required"),
  password: z.string({ error: "is required" }).min(1, "is required"),
});

/** POST /api/auth/login — members, customers and admins. `user.role` tells the frontend which dashboard to open. */
authRouter.post("/login", authLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const account = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  const valid = await verifyPasswordOrDummy(password, account?.passwordHash);
  if (!account || !valid) throw unauthorized("Incorrect email or password.");
  const user = await prisma.user.update({ where: { id: account.id }, data: { lastLoginAt: new Date() }, select: userSelect });
  issueSession(res, user);
  res.json({ user: serializeUser(user) });
});

/**
 * POST /api/auth/logout — ends the session. Clears the cookie and bumps tokenVersion,
 * so any copy of the token (other tabs or devices) stops working too. Safe to call when signed out.
 */
authRouter.post("/logout", async (req, res) => {
  if (req.user) {
    await prisma.user.update({ where: { id: req.user.id }, data: { tokenVersion: { increment: 1 } } });
  }
  clearSession(res);
  res.json({ ok: true });
});

authRouter.get("/me", async (req, res) => {
  if (!req.user) return res.json({ user: null });
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: userSelect });
  res.json({ user: user ? serializeUser(user) : null });
});

/* ---------------- OTP: verify the email address or phone number ---------------- */

const channelSchema = z.object({
  channel: z.enum(["email", "phone"], { error: 'must be "email" or "phone"' }),
});

/**
 * POST /api/auth/otp/send — emails a 6-digit code to the signed-in user. A new code replaces any earlier one.
 * Phone codes need an SMS provider, which isn't connected yet.
 */
authRouter.post("/otp/send", requireAuth, authLimiter, async (req, res) => {
  const { channel } = channelSchema.parse(req.body ?? {});
  if (channel === "phone") {
    throw badRequest("Phone verification isn't available yet. Please verify your email address instead.", { fields: { channel: "phone verification isn't available yet" } });
  }
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user!.id },
    select: { id: true, email: true, phone: true, emailVerifiedAt: true, phoneVerifiedAt: true },
  });
  const destination = channel === "email" ? user.email : user.phone;
  if (!destination) throw badRequest("Add a phone number to your profile first.", { fields: { channel: "has no phone number to send to" } });
  if (channel === "email" ? user.emailVerifiedAt : user.phoneVerifiedAt) {
    throw conflict(channel === "email" ? "Your email address is already verified." : "Your phone number is already verified.");
  }

  const recent = await prisma.otpCode.findFirst({
    where: { userId: user.id, channel, createdAt: { gt: new Date(Date.now() - OTP_SETTINGS.resendAfterSeconds * 1000) } },
    select: { id: true },
  });
  if (recent) throw badRequest(`Please wait ${OTP_SETTINGS.resendAfterSeconds} seconds before requesting another code.`);

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_SETTINGS.expiresInMinutes * 60_000);
  const [, created] = await prisma.$transaction([
    prisma.otpCode.deleteMany({ where: { userId: user.id, channel, consumedAt: null } }),
    prisma.otpCode.create({ data: { userId: user.id, channel, codeHash: await hashOtp(code), expiresAt }, select: { id: true } }),
  ]);
  try {
    await emailOtp(destination, code);
  } catch (error) {
    // A code that never arrived must not block the next request or be guessable.
    await prisma.otpCode.delete({ where: { id: created.id } }).catch(() => {});
    console.error("[mail] Could not send the verification email:", error instanceof MailNotConfiguredError ? error.message : error);
    throw new HttpError(503, "We couldn't send the email. Please try again in a moment.");
  }

  res.json({ sent: true, channel, destination: maskDestination(channel, destination), expiresAt });
});

const verifySchema = channelSchema.extend({
  code: z.string({ error: "is required" }).trim().regex(/^\d{6}$/, "must be the 6-digit code"),
});

authRouter.post("/otp/verify", requireAuth, authLimiter, async (req, res) => {
  const { channel, code } = verifySchema.parse(req.body ?? {});
  const record = await prisma.otpCode.findFirst({
    where: { userId: req.user!.id, channel, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!record || record.expiresAt < new Date()) {
    throw badRequest("That code has expired. Request a new one.", { fields: { code: "has expired" } });
  }
  if (record.attempts >= OTP_SETTINGS.maxAttempts) {
    throw badRequest("Too many incorrect attempts. Request a new code.", { fields: { code: "has had too many attempts" } });
  }
  if (!(await otpMatches(code, record.codeHash))) {
    await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    throw badRequest("That code is incorrect.", { fields: { code: "is incorrect" } });
  }

  const now = new Date();
  const [, user] = await prisma.$transaction([
    prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: now } }),
    prisma.user.update({
      where: { id: req.user!.id },
      data: channel === "email" ? { emailVerifiedAt: now } : { phoneVerifiedAt: now },
      select: userSelect,
    }),
  ]);
  res.json({ user: serializeUser(user) });
});
