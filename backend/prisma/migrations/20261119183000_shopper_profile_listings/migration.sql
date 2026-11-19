-- CreateEnum
CREATE TYPE "ShopperListingStatus" AS ENUM ('ACTIVE', 'PENDING', 'PAUSED', 'FLAGGED');

-- CreateTable
CREATE TABLE "shopper_profile_listings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shopper_name" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "category_name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "specialty_summary" TEXT NOT NULL,
    "status" "ShopperListingStatus" NOT NULL DEFAULT 'PENDING',
    "member_profile_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopper_profile_listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shopper_profile_listings_status_created_at_idx" ON "shopper_profile_listings"("status", "created_at");

-- CreateIndex
CREATE INDEX "shopper_profile_listings_member_profile_id_idx" ON "shopper_profile_listings"("member_profile_id");

-- AddForeignKey
ALTER TABLE "shopper_profile_listings" ADD CONSTRAINT "shopper_profile_listings_member_profile_id_fkey" FOREIGN KEY ("member_profile_id") REFERENCES "member_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
