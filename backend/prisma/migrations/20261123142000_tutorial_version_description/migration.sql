-- AlterTable
ALTER TABLE "tutorial_videos"
ADD COLUMN "description" TEXT,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
