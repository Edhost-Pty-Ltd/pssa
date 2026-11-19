import type { ShopperListingStatus, ShopperProfileListing } from "@prisma/client";
import { prisma } from "./prisma.js";

export function serializeListing(row: ShopperProfileListing) {
  return {
    id: row.id,
    title: row.title,
    shopperName: row.shopperName,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    city: row.city,
    specialtySummary: row.specialtySummary,
    status: row.status,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

/**
 * Keep one specialty card per active member so Shopper Profiles is not mock-only.
 * Does not invent a public marketplace or customer accounts.
 */
export async function ensureListingsFromActiveMembers() {
  const members = await prisma.memberProfile.findMany({
    where: { memberStatus: "active" },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      tradingName: true,
      city: true,
      scope: true,
      createdAt: true,
    },
  });

  for (const member of members) {
    const existing = await prisma.shopperProfileListing.findFirst({
      where: { memberProfileId: member.id },
      select: { id: true },
    });
    if (existing) continue;

    const shopperName = [member.firstName, member.lastName].filter(Boolean).join(" ") || "Member";
    const trading = member.tradingName?.trim();
    const scope = member.scope?.trim() || "General sourcing";

    await prisma.shopperProfileListing.create({
      data: {
        memberProfileId: member.id,
        title: trading ? `${trading} specialty profile` : `${shopperName} specialty profile`,
        shopperName,
        categoryId: "general",
        categoryName: scope,
        city: member.city?.trim() || "—",
        specialtySummary: scope,
        status: "PENDING",
        createdAt: member.createdAt,
      },
    });
  }
}

export async function listListings() {
  await ensureListingsFromActiveMembers();
  const rows = await prisma.shopperProfileListing.findMany({
    orderBy: [{ createdAt: "desc" }],
  });
  return rows.map(serializeListing);
}

export async function updateListingStatus(id: string, status: ShopperListingStatus) {
  const existing = await prisma.shopperProfileListing.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  const row = await prisma.shopperProfileListing.update({
    where: { id },
    data: { status },
  });
  return serializeListing(row);
}
