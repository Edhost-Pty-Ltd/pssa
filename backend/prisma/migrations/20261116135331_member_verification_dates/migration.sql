-- AlterTable
ALTER TABLE "member_profiles" ADD COLUMN     "verification_expires_at" TIMESTAMP(3),
ADD COLUMN     "verified_at" TIMESTAMP(3);
