import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PracticalAssetKind, PracticalAssessmentStatus, PracticalTrack } from "@prisma/client";
import { z } from "zod";
import { badRequest } from "./http.js";
import { prisma } from "./prisma.js";
import { privateFilePath } from "./uploads.js";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BUNDLED_ASSETS_DIR = path.join(backendRoot, "assets", "practical-assessment");

export const BUNDLED_DEFAULTS: Record<
  PracticalAssetKind,
  { title: string; fileName: string; mimeType: string; storagePath: string }
> = {
  tutorial_video: {
    title: "PSSA Practical Assessment Tutorial",
    fileName: "PSSA_Practical_Assessment_Tutorial.mp4",
    mimeType: "video/mp4",
    storagePath: "bundled:PSSA_Practical_Assessment_Tutorial.mp4",
  },
  assignment_brief: {
    title: "PSSA Practical Assignment Brief",
    fileName: "PSSA_Practical_Assignment.pdf",
    mimeType: "application/pdf",
    storagePath: "bundled:PSSA_Practical_Assignment.pdf",
  },
  assessor_guide: {
    title: "PSSA Assessor Guide (Internal Only)",
    fileName: "PSSA_Assessor_Guide.pdf",
    mimeType: "application/pdf",
    storagePath: "bundled:PSSA_Assessor_Guide.pdf",
  },
};

export const PRACTICAL_TRACKS: {
  id: PracticalTrack;
  code: "A" | "B" | "C";
  label: string;
  budgetZar: number;
  summary: string;
}[] = [
  {
    id: "fashion_personal_styling",
    code: "A",
    label: "Fashion & personal styling",
    budgetZar: 1800,
    summary:
      "Fictional customer Zinhle (size 14, shoe size 6) starting an office role. Smart-casual outfit plan, max R1,800, neutral colours, comfortable flats (no heels), available within 10 days.",
  },
  {
    id: "grocery_food_shopping",
    code: "B",
    label: "Grocery & food shopping",
    budgetZar: 1200,
    summary:
      "Fictional household of two adults and one child needing ingredients for five evening meals. Max R1,200. One adult prefers vegetarian meals. Ordinary SA grocery retailers; no medical/clinical dietary advice.",
  },
  {
    id: "household_essentials",
    code: "C",
    label: "Household essentials",
    budgetZar: 1500,
    summary:
      "Fictional customer setting up a small apartment needing practical kitchen, cleaning, and laundry essentials. Max R1,500. Durable basics, avoid fragile glass items, manageable starter set.",
  },
];

export const PRACTICAL_RUBRIC_AREAS = [
  {
    key: "understandingBrief",
    label: "Understanding the brief",
    maxPoints: 15,
    guidance: "Identifies key needs, budget, preferences, deadline, and restrictions.",
  },
  {
    key: "researchSources",
    label: "Research and source quality",
    maxPoints: 20,
    guidance: "Uses at least three relevant options, credible public sources, usable links, and transparent price/date info.",
  },
  {
    key: "budgetAccuracy",
    label: "Budget and cost accuracy",
    maxPoints: 20,
    guidance: "Calculations are correct; additional costs and assumptions visible; respects budget or explains deviations.",
  },
  {
    key: "recommendationAlternatives",
    label: "Recommendation and alternatives",
    maxPoints: 15,
    guidance: "Recommendation is relevant and reasoned; a practical substitute is provided.",
  },
  {
    key: "professionalCommunication",
    label: "Professional communication",
    maxPoints: 15,
    guidance: "Message is clear, respectful, concise, and seeks approval before any purchase.",
  },
  {
    key: "ethicsDisclosurePrivacy",
    label: "Ethics, disclosure, and privacy",
    maxPoints: 15,
    guidance: "Explains handling of price changes, commission/relationships, consent, and personal information responsibly.",
  },
] as const;

export type RubricScores = Record<(typeof PRACTICAL_RUBRIC_AREAS)[number]["key"], number>;

export function resolvePracticalAssetPath(storagePath: string): string {
  if (storagePath.startsWith("bundled:")) {
    const fileName = path.basename(storagePath.slice("bundled:".length));
    const full = path.join(BUNDLED_ASSETS_DIR, fileName);
    if (path.dirname(full) !== BUNDLED_ASSETS_DIR) throw badRequest("Invalid bundled asset reference.");
    return full;
  }
  return privateFilePath(storagePath);
}

/** Ensures each asset kind has at least a seeded default row if the table has none for that kind. */
export async function ensureDefaultPracticalAssets() {
  const kinds: PracticalAssetKind[] = ["tutorial_video", "assignment_brief", "assessor_guide"];
  for (const kind of kinds) {
    const count = await prisma.practicalAssessmentAsset.count({ where: { kind } });
    if (count > 0) continue;
    const def = BUNDLED_DEFAULTS[kind];
    const fullPath = resolvePracticalAssetPath(def.storagePath);
    const sizeBytes = existsSync(fullPath) ? statSync(fullPath).size : 0;
    await prisma.practicalAssessmentAsset.create({
      data: {
        kind,
        version: 1,
        title: def.title,
        fileName: def.fileName,
        mimeType: def.mimeType,
        sizeBytes,
        storagePath: def.storagePath,
        isActive: true,
        isDefault: true,
      },
    });
  }
}

export async function getActivePracticalAsset(kind: PracticalAssetKind) {
  await ensureDefaultPracticalAssets();
  const active = await prisma.practicalAssessmentAsset.findFirst({
    where: { kind, isActive: true },
    orderBy: { version: "desc" },
  });
  if (active) {
    return { asset: active, isFallback: false };
  }
  const def = BUNDLED_DEFAULTS[kind];
  const fullPath = resolvePracticalAssetPath(def.storagePath);
  const sizeBytes = existsSync(fullPath) ? statSync(fullPath).size : 0;
  return {
    asset: {
      id: `fallback-${kind}`,
      kind,
      version: 1,
      title: def.title,
      fileName: def.fileName,
      mimeType: def.mimeType,
      sizeBytes,
      storagePath: def.storagePath,
      isActive: true,
      isDefault: true,
      uploadedById: null,
      createdAt: new Date(0),
    },
    isFallback: true,
  };
}

export function suggestTrackFromScope(scope: string | null | undefined): PracticalTrack | null {
  if (!scope) return null;
  const s = scope.toLowerCase();
  if (/(fashion|cloth|apparel|styl|wardrobe|shoe|outfit)/.test(s)) return "fashion_personal_styling";
  if (/(grocer|food|meal|supermarket|pantry|produce)/.test(s)) return "grocery_food_shopping";
  if (/(household|home|kitchen|clean|laundry|apartment|essential)/.test(s)) return "household_essentials";
  return null;
}

const httpUrlSchema = z
  .string()
  .trim()
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be a valid public http:// or https:// URL");

export const practicalOptionSchema = z.object({
  name: z.string().trim().min(2, "Option name is required").max(150),
  retailer: z.string().trim().min(2, "Retailer or source is required").max(120),
  url: httpUrlSchema,
  price: z.string().trim().min(1, "Listed price is required").max(60),
  suitability: z.string().trim().min(5, "Explain why this option fits the brief").max(600),
});

export const practicalAnswersSubmitSchema = z.object({
  serviceTrack: z.enum(["fashion_personal_styling", "grocery_food_shopping", "household_essentials"], {
    error: "Please select the service track that matches your category.",
  }),
  briefSummary: z.string().trim().min(20, "Customer brief summary must be at least 20 characters.").max(2000),
  options: z
    .array(practicalOptionSchema)
    .min(3, "Provide at least 3 product or basket options with public source links.")
    .max(10),
  budget: z.object({
    estimatedTotal: z.string().trim().min(1, "Estimated total is required.").max(100),
    additionalCosts: z.string().trim().min(1, "Delivery, travel, or additional costs are required.").max(300),
    remainingOrOver: z.string().trim().min(1, "Remaining budget or difference explanation is required.").max(300),
    assumptions: z.string().trim().min(5, "State your costing assumptions.").max(800),
    priceCheckedDate: z.string().trim().min(4, "Record the date prices were checked.").max(40),
  }),
  recommendation: z.object({
    preferredPlan: z.string().trim().min(15, "Explain your recommended option or combination.").max(2000),
    backupOption: z.string().trim().min(10, "Provide at least one realistic substitute/backup option.").max(1200),
  }),
  customerMessage: z
    .string()
    .trim()
    .min(20, "Write a sample customer approval message (at least 20 characters).")
    .max(2000),
  responsibility: z.object({
    priceChanges: z.string().trim().min(10, "Explain how you would handle a price change.").max(1000),
    commissionDisclosure: z
      .string()
      .trim()
      .min(10, "Explain how you would disclose any commission or commercial relationship.")
      .max(1000),
    privacyProtection: z.string().trim().min(10, "Explain how you protect customer information.").max(1000),
  }),
});

export const practicalAnswersDraftSchema = z.object({
  serviceTrack: z.enum(["fashion_personal_styling", "grocery_food_shopping", "household_essentials"]).nullable().optional(),
  answers: z.record(z.string(), z.unknown()).optional(),
});

export async function getOrCreateCurrentPracticalSubmission(memberProfileId: string) {
  const existing = await prisma.practicalAssessmentSubmission.findFirst({
    where: { memberProfileId },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  const [tutorial, assignment] = await Promise.all([
    getActivePracticalAsset("tutorial_video"),
    getActivePracticalAsset("assignment_brief"),
  ]);

  return prisma.practicalAssessmentSubmission.create({
    data: {
      memberProfileId,
      tutorialVersion: tutorial.asset.version,
      assignmentVersion: assignment.asset.version,
      status: "NOT_STARTED",
    },
  });
}

export function isPracticalSubmissionEditable(status: PracticalAssessmentStatus) {
  return status === "NOT_STARTED" || status === "IN_PROGRESS" || status === "NEEDS_RESUBMISSION";
}
