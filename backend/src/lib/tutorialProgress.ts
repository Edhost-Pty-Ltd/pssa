import type { VideoProgress } from "@prisma/client";
import { prisma } from "./prisma.js";

/** Extra seconds allowed between two reports (network delay, rounding). */
const TOLERANCE_SECONDS = 3;
/** Longer gaps (e.g. after a pause) never allow more than this much forward movement. */
const MAX_GAP_SECONDS = 30;
/** The first report may start a little into the video (never more than a quarter of it). */
const FIRST_REPORT_MAX_SECONDS = 10;
/** Reaching this close to the end counts as watching to the end: 5% of the video, between 1 and 2 seconds. */
const endTolerance = (durationSeconds: number) => Math.min(2, Math.max(1, Math.round(durationSeconds * 0.05)));

type ProgressRow = Pick<
  VideoProgress,
  "watchedSeconds" | "maxPositionSeconds" | "durationSeconds" | "progressPercent" | "completed" | "completedAt" | "lastPositionSeconds" | "lastReportedAt"
>;

export function progressView(progress: ProgressRow | null) {
  if (!progress) return null;
  return {
    watchedSeconds: progress.watchedSeconds,
    progressPercent: progress.progressPercent,
    completed: progress.completed,
    completedAt: progress.completedAt,
  };
}

/**
 * Works out the new progress from one player report.
 * Only forward movement no faster than real time counts, and only when it continues from ground already
 * covered, so skipping ahead (or rewatching the same part) can never complete the video.
 */
export function nextProgress(existing: ProgressRow | null, positionSeconds: number, durationSeconds: number, now: Date) {
  const position = Math.floor(Math.min(positionSeconds, durationSeconds));
  let covered = existing?.maxPositionSeconds ?? 0;
  let watched = existing?.watchedSeconds ?? 0;
  const last = existing?.lastPositionSeconds ?? null;
  const lastAt = existing?.lastReportedAt ?? null;

  if (last === null || lastAt === null) {
    if (position <= Math.min(FIRST_REPORT_MAX_SECONDS, Math.floor(durationSeconds / 4)) && position > covered) {
      watched += position - covered;
      covered = position;
    }
  } else {
    const elapsed = Math.min(Math.max(0, (now.getTime() - lastAt.getTime()) / 1000), MAX_GAP_SECONDS);
    const delta = position - last;
    const realPlayback = delta > 0 && delta <= elapsed + TOLERANCE_SECONDS;
    if (realPlayback) {
      watched += delta;
      if (last <= covered + TOLERANCE_SECONDS && position > covered) covered = position;
    }
  }

  const completed = existing?.completed === true || covered >= durationSeconds - endTolerance(durationSeconds);
  return {
    watchedSeconds: watched,
    maxPositionSeconds: covered,
    durationSeconds,
    progressPercent: completed ? 100 : Math.min(99, Math.floor((covered / durationSeconds) * 100)),
    completed,
    completedAt: existing?.completedAt ?? (completed ? now : null),
    lastPositionSeconds: position,
    lastReportedAt: now,
  };
}

/** True when the member has completed the currently active tutorial video. */
export async function hasCompletedActiveTutorial(memberProfileId: string) {
  const video = await prisma.tutorialVideo.findFirst({ where: { isActive: true }, select: { id: true } });
  if (!video) return false;
  const progress = await prisma.videoProgress.findUnique({
    where: { memberProfileId_tutorialVideoId: { memberProfileId, tutorialVideoId: video.id } },
    select: { completed: true },
  });
  return progress?.completed === true;
}
