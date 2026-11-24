-- CreateEnum
CREATE TYPE "PracticalTrack" AS ENUM ('fashion_personal_styling', 'grocery_food_shopping', 'household_essentials');

-- CreateEnum
CREATE TYPE "PracticalAssetKind" AS ENUM ('tutorial_video', 'assignment_brief', 'assessor_guide');

-- CreateEnum
CREATE TYPE "PracticalAssessmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_RESUBMISSION', 'PASSED', 'NOT_PASSED');

-- AlterTable
ALTER TABLE "association_settings" ADD COLUMN     "practical_pass_threshold" INTEGER NOT NULL DEFAULT 70;

-- CreateTable
CREATE TABLE "practical_assessment_assets" (
    "id" TEXT NOT NULL,
    "kind" "PracticalAssetKind" NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practical_assessment_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practical_assessment_submissions" (
    "id" TEXT NOT NULL,
    "member_profile_id" TEXT NOT NULL,
    "tutorial_version" INTEGER NOT NULL DEFAULT 1,
    "assignment_version" INTEGER NOT NULL DEFAULT 1,
    "tutorial_watched" BOOLEAN NOT NULL DEFAULT false,
    "tutorial_watched_at" TIMESTAMP(3),
    "tutorial_watched_seconds" INTEGER NOT NULL DEFAULT 0,
    "status" "PracticalAssessmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "service_track" "PracticalTrack",
    "answers" JSONB,
    "evidence_file_name" TEXT,
    "evidence_mime_type" TEXT,
    "evidence_size_bytes" INTEGER,
    "evidence_storage_path" TEXT,
    "idempotency_key" TEXT,
    "submitted_at" TIMESTAMP(3),
    "reviewer_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rubric_scores" JSONB,
    "total_score" INTEGER,
    "pass_threshold_used" INTEGER,
    "reviewer_feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practical_assessment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "practical_assessment_assets_kind_is_active_idx" ON "practical_assessment_assets"("kind", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "practical_assessment_assets_kind_version_key" ON "practical_assessment_assets"("kind", "version");

-- CreateIndex
CREATE UNIQUE INDEX "practical_assessment_submissions_idempotency_key_key" ON "practical_assessment_submissions"("idempotency_key");

-- CreateIndex
CREATE INDEX "practical_assessment_submissions_member_profile_id_created__idx" ON "practical_assessment_submissions"("member_profile_id", "created_at");

-- CreateIndex
CREATE INDEX "practical_assessment_submissions_status_submitted_at_idx" ON "practical_assessment_submissions"("status", "submitted_at");

-- AddForeignKey
ALTER TABLE "practical_assessment_assets" ADD CONSTRAINT "practical_assessment_assets_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practical_assessment_submissions" ADD CONSTRAINT "practical_assessment_submissions_member_profile_id_fkey" FOREIGN KEY ("member_profile_id") REFERENCES "member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practical_assessment_submissions" ADD CONSTRAINT "practical_assessment_submissions_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
