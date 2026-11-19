import { prisma } from "./prisma.js";

export const DEFAULT_ASSOCIATION_SETTINGS = {
  associationName: "Personal Shoppers & Sourcing Association",
  supportEmail: "compliance@pssa.org.za",
  annualMembershipFeeZar: 1200,
  verificationSlaHours: 48,
  autoPublishApprovedListings: false,
  requireIdVerification: true,
} as const;

export type AssociationSettingsInput = {
  associationName: string;
  supportEmail: string;
  annualMembershipFeeZar: number;
  verificationSlaHours: number;
  autoPublishApprovedListings: boolean;
  requireIdVerification: boolean;
};

export function serializeAssociationSettings(row: AssociationSettingsInput) {
  return {
    associationName: row.associationName,
    supportEmail: row.supportEmail,
    annualMembershipFeeZar: row.annualMembershipFeeZar,
    verificationSlaHours: row.verificationSlaHours,
    autoPublishApprovedListings: row.autoPublishApprovedListings,
    requireIdVerification: row.requireIdVerification,
  };
}

export async function getAssociationSettings() {
  const existing = await prisma.associationSettings.findUnique({ where: { id: "default" } });
  if (existing) return serializeAssociationSettings(existing);

  const created = await prisma.associationSettings.create({
    data: { id: "default", ...DEFAULT_ASSOCIATION_SETTINGS },
  });
  return serializeAssociationSettings(created);
}

export async function saveAssociationSettings(input: AssociationSettingsInput) {
  const saved = await prisma.associationSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...input },
    update: { ...input },
  });
  return serializeAssociationSettings(saved);
}
