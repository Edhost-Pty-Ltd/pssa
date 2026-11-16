-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEMBER', 'CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('email', 'phone');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'under_review', 'info_required', 'verified', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('submitted', 'under_review', 'info_required', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('id_document', 'proof_of_residence');

-- CreateEnum
CREATE TYPE "DocumentReviewStatus" AS ENUM ('submitted', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('facebook', 'instagram', 'tiktok');

-- CreateEnum
CREATE TYPE "AdminDecision" AS ENUM ('approved', 'rejected', 'info_required');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "phone_verified_at" TIMESTAMP(3),
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "business_name" TEXT,
    "category" TEXT NOT NULL,
    "id_number" TEXT,
    "physical_address" TEXT,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "member_profile_id" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'submitted',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_documents" (
    "id" TEXT NOT NULL,
    "member_profile_id" TEXT NOT NULL,
    "application_id" TEXT,
    "document_type" "DocumentType" NOT NULL,
    "original_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "review_status" "DocumentReviewStatus" NOT NULL DEFAULT 'submitted',
    "reviewer_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "member_profile_id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutorial_videos" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "duration_seconds" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutorial_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_progress" (
    "id" TEXT NOT NULL,
    "member_profile_id" TEXT NOT NULL,
    "tutorial_video_id" TEXT NOT NULL,
    "watched_seconds" INTEGER NOT NULL DEFAULT 0,
    "max_position_seconds" INTEGER NOT NULL DEFAULT 0,
    "duration_seconds" INTEGER,
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "last_position_seconds" INTEGER,
    "last_reported_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" TEXT NOT NULL,
    "member_profile_id" TEXT NOT NULL,
    "total_questions" INTEGER,
    "question_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "answers" JSONB,
    "score" INTEGER,
    "passed" BOOLEAN,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_questions" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_option_id" TEXT NOT NULL,
    "topic" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_reviews" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "decision" "AdminDecision" NOT NULL,
    "reason" TEXT,
    "documents_checked" BOOLEAN NOT NULL DEFAULT false,
    "tutorial_completed" BOOLEAN NOT NULL DEFAULT false,
    "exam_passed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "member_profile_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "issued_by" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "otp_codes_user_id_channel_idx" ON "otp_codes"("user_id", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "member_profiles_user_id_key" ON "member_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_profiles_id_number_key" ON "member_profiles"("id_number");

-- CreateIndex
CREATE INDEX "member_profiles_verification_status_is_active_idx" ON "member_profiles"("verification_status", "is_active");

-- CreateIndex
CREATE INDEX "applications_member_profile_id_status_idx" ON "applications"("member_profile_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "member_documents_stored_name_key" ON "member_documents"("stored_name");

-- CreateIndex
CREATE INDEX "member_documents_member_profile_id_idx" ON "member_documents"("member_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_member_profile_id_platform_key" ON "social_accounts"("member_profile_id", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "tutorial_videos_stored_name_key" ON "tutorial_videos"("stored_name");

-- CreateIndex
CREATE UNIQUE INDEX "video_progress_member_profile_id_tutorial_video_id_key" ON "video_progress"("member_profile_id", "tutorial_video_id");

-- CreateIndex
CREATE INDEX "exam_attempts_member_profile_id_started_at_idx" ON "exam_attempts"("member_profile_id", "started_at");

-- CreateIndex
CREATE INDEX "exam_questions_is_active_idx" ON "exam_questions"("is_active");

-- CreateIndex
CREATE INDEX "admin_reviews_application_id_created_at_idx" ON "admin_reviews"("application_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_application_id_key" ON "certificates"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificate_number_key" ON "certificates"("certificate_number");

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_member_profile_id_fkey" FOREIGN KEY ("member_profile_id") REFERENCES "member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_documents" ADD CONSTRAINT "member_documents_member_profile_id_fkey" FOREIGN KEY ("member_profile_id") REFERENCES "member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_documents" ADD CONSTRAINT "member_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_member_profile_id_fkey" FOREIGN KEY ("member_profile_id") REFERENCES "member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutorial_videos" ADD CONSTRAINT "tutorial_videos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_progress" ADD CONSTRAINT "video_progress_member_profile_id_fkey" FOREIGN KEY ("member_profile_id") REFERENCES "member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_progress" ADD CONSTRAINT "video_progress_tutorial_video_id_fkey" FOREIGN KEY ("tutorial_video_id") REFERENCES "tutorial_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_member_profile_id_fkey" FOREIGN KEY ("member_profile_id") REFERENCES "member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_reviews" ADD CONSTRAINT "admin_reviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_reviews" ADD CONSTRAINT "admin_reviews_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_member_profile_id_fkey" FOREIGN KEY ("member_profile_id") REFERENCES "member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
