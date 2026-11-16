import { Router } from "express";
import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import type { SocialPlatform } from "@prisma/client";
import { z } from "zod";
import { badRequest, conflict, notFound } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { isValidSaIdNumber, maskIdNumber, MEMBER_CATEGORIES } from "../lib/members.js";
import { assertFileSignature, documentUpload, privateFilePath } from "../lib/uploads.js";
import { requireRole } from "../middleware/auth.js";

/**
 * The signed-in member's own profile, address, social links and private documents.
 * Verification status is read-only. Files stay on disk; the database stores the reference only.
 */
export const memberRouter = Router();
memberRouter.use(requireRole("MEMBER"));

const profileSelect = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  phone: true,
  emailVerifiedAt: true,
  phoneVerifiedAt: true,
  createdAt: true,
  member: {
    select: {
      id: true,
      businessName: true,
      category: true,
      idNumber: true,
      physicalAddress: true,
      verificationStatus: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      socialAccounts: { select: { platform: true, url: true }, orderBy: { platform: "asc" as const } },
      documents: {
        select: {
          id: true,
          documentType: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          reviewStatus: true,
          reviewerNote: true,
          uploadedAt: true,
        },
        orderBy: { uploadedAt: "desc" as const },
      },
    },
  },
} as const;

function serializeProfile(user: NonNullable<Awaited<ReturnType<typeof loadProfile>>>) {
  const member = user.member!;
  return {
    ...user,
    member: { ...member, idNumber: maskIdNumber(member.idNumber) },
  };
}

async function loadProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: profileSelect });
  if (!user?.member) throw notFound("Member profile not found.");
  return user;
}

const text = (max: number) => z.string().trim().min(1, "is required").max(max, `must be at most ${max} characters`);

const phoneSchema = z
  .string()
  .trim()
  .max(30, "must be at most 30 characters")
  .refine((value) => /^\+?[\d\s()-]+$/.test(value) && value.replace(/\D/g, "").length >= 7 && value.replace(/\D/g, "").length <= 15, "must be a valid phone number");

function isPlatformUrl(value: string, domains: string[]) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return ["http:", "https:"].includes(url.protocol) && domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function socialLink(label: string, domains: string[]) {
  return z.union([
    z.null(),
    z.literal("").transform(() => null),
    z.string().trim().refine((value) => isPlatformUrl(value, domains), `must be a valid ${label} link`),
  ]);
}

/** Omitted fields stay as they are. Null or "" clears phone, address or a social link. */
const updateSchema = z
  .object({
    firstName: text(100).optional(),
    lastName: text(100).optional(),
    phone: z.union([z.null(), z.literal("").transform(() => null), phoneSchema]).optional(),
    businessName: z.union([z.null(), z.literal("").transform(() => null), text(150)]).optional(),
    category: z.enum(MEMBER_CATEGORIES, { error: `must be one of: ${MEMBER_CATEGORIES.join(", ")}` }).optional(),
    idNumber: z
      .string()
      .transform((value) => value.replace(/\s/g, ""))
      .refine(isValidSaIdNumber, "must be a valid 13-digit South African ID number")
      .optional(),
    physicalAddress: z.union([z.null(), z.literal("").transform(() => null), text(300)]).optional(),
    facebookUrl: socialLink("Facebook", ["facebook.com", "fb.com"]).optional(),
    instagramUrl: socialLink("Instagram", ["instagram.com"]).optional(),
    tiktokUrl: socialLink("TikTok", ["tiktok.com"]).optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), { error: "Provide at least one field to update." });

memberRouter.get("/profile", async (req, res) => {
  res.json({ profile: serializeProfile(await loadProfile(req.user!.id)) });
});

memberRouter.patch("/profile", async (req, res) => {
  const body = updateSchema.parse(req.body ?? {});
  const current = await loadProfile(req.user!.id);
  const memberId = current.member!.id;

  if (body.idNumber && body.idNumber !== current.member!.idNumber) {
    const taken = await prisma.memberProfile.findUnique({ where: { idNumber: body.idNumber }, select: { id: true } });
    if (taken) throw conflict("A member with this ID number is already registered.", { fields: { idNumber: "is already registered" } });
  }

  const userFields = {
    ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
    ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
    ...(body.phone !== undefined ? { phone: body.phone } : {}),
    // A new phone number has to be verified again.
    ...(body.phone !== undefined && body.phone !== current.phone ? { phoneVerifiedAt: null } : {}),
  };
  const memberFields = {
    ...(body.businessName !== undefined ? { businessName: body.businessName } : {}),
    ...(body.category !== undefined ? { category: body.category } : {}),
    ...(body.idNumber !== undefined ? { idNumber: body.idNumber } : {}),
    ...(body.physicalAddress !== undefined ? { physicalAddress: body.physicalAddress } : {}),
  };
  const socials: Array<[SocialPlatform, string | null]> = (
    [
      ["facebook", body.facebookUrl],
      ["instagram", body.instagramUrl],
      ["tiktok", body.tiktokUrl],
    ] as const
  ).filter((entry): entry is [SocialPlatform, string | null] => entry[1] !== undefined);

  await prisma.$transaction(async (tx) => {
    if (Object.keys(userFields).length) await tx.user.update({ where: { id: current.id }, data: userFields });
    if (Object.keys(memberFields).length) await tx.memberProfile.update({ where: { id: memberId }, data: memberFields });
    for (const [platform, url] of socials) {
      if (url === null) {
        await tx.socialAccount.deleteMany({ where: { memberProfileId: memberId, platform } });
      } else {
        await tx.socialAccount.upsert({
          where: { memberProfileId_platform: { memberProfileId: memberId, platform } },
          create: { memberProfileId: memberId, platform, url },
          update: { url },
        });
      }
    }
  });

  res.json({ profile: serializeProfile(await loadProfile(current.id)) });
});

/* ---------------- Private documents ---------------- */

const documentJson = {
  id: true,
  documentType: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  reviewStatus: true,
  reviewerNote: true,
  uploadedAt: true,
} as const;

async function storeDocument(userId: string, file: Express.Multer.File | undefined, documentType: "id_document" | "proof_of_residence") {
  if (!file) throw badRequest("Choose a file to upload.");
  try {
    await assertFileSignature(file);
    const profile = await loadProfile(userId);
    const openApplication = await prisma.application.findFirst({
      where: { memberProfileId: profile.member!.id, status: { in: ["submitted", "under_review", "info_required"] } },
      orderBy: { submittedAt: "desc" },
      select: { id: true },
    });
    return await prisma.memberDocument.create({
      data: {
        memberProfileId: profile.member!.id,
        applicationId: openApplication?.id ?? null,
        documentType,
        originalName: file.originalname.slice(0, 180),
        storedName: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
      select: documentJson,
    });
  } catch (error) {
    await unlink(file.path).catch(() => {});
    throw error;
  }
}

memberRouter.post("/documents/id", documentUpload.single("file"), async (req, res) => {
  const document = await storeDocument(req.user!.id, req.file, "id_document");
  res.status(201).json({ document });
});

memberRouter.post("/documents/proof-of-residence", documentUpload.single("file"), async (req, res) => {
  const document = await storeDocument(req.user!.id, req.file, "proof_of_residence");
  res.status(201).json({ document });
});

memberRouter.get("/documents", async (req, res) => {
  const profile = await loadProfile(req.user!.id);
  res.json({ documents: profile.member!.documents });
});

memberRouter.get("/documents/:id/file", async (req, res) => {
  const profile = await loadProfile(req.user!.id);
  const document = await prisma.memberDocument.findFirst({
    where: { id: String(req.params.id), memberProfileId: profile.member!.id },
  });
  if (!document) throw notFound("Document not found.");
  const filePath = privateFilePath(document.storedName);
  if (!existsSync(filePath)) throw notFound("That file is no longer available.");
  res.type(document.mimeType);
  res.setHeader("Content-Disposition", contentDisposition(document.originalName));
  res.sendFile(filePath);
});

function contentDisposition(filename: string) {
  const safe = filename.replace(/["\r\n]/g, "");
  return `inline; filename="${safe}"`;
}
