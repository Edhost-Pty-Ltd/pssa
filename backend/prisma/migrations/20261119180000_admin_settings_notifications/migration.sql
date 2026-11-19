-- CreateEnum
CREATE TYPE "AdminNotificationType" AS ENUM ('INFO', 'WARNING', 'SUCCESS');

-- CreateTable
CREATE TABLE "association_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "association_name" TEXT NOT NULL,
    "support_email" TEXT NOT NULL,
    "annual_membership_fee_zar" INTEGER NOT NULL,
    "verification_sla_hours" INTEGER NOT NULL,
    "auto_publish_approved_listings" BOOLEAN NOT NULL DEFAULT false,
    "require_id_verification" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "association_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "AdminNotificationType" NOT NULL DEFAULT 'INFO',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "source_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_notifications_source_key_key" ON "admin_notifications"("source_key");

-- CreateIndex
CREATE INDEX "admin_notifications_read_created_at_idx" ON "admin_notifications"("read", "created_at");
