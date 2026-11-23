import { api } from "../lib/api";

/* Tutorials */

export interface Tutorial {
  id: string;
  title: string;
  description: string | null;
  version: number;
  durationSeconds: number | null;
  createdAt: string;
  completed: boolean;
  completedAt: string | null;
  watchedSeconds: number;
  maxPositionSeconds: number;
}

export interface TutorialProgress {
  tutorialVideoId: string;
  watchedSeconds: number;
  maxPositionSeconds: number;
  lastPositionSeconds: number;
  completed: boolean;
  completedAt: string | null;
}

export const getTutorials = (signal?: AbortSignal) =>
  api<{ tutorials: Tutorial[]; reason?: string }>("/tutorials/active", { signal });

export const tutorialStreamUrl = (id: string) => `/api/tutorials/${encodeURIComponent(id)}/stream`;

export const reportProgress = (id: string, positionSeconds: number, durationSeconds?: number) =>
  api<{ progress: TutorialProgress }>(`/tutorials/${encodeURIComponent(id)}/progress`, {
    method: "POST",
    body: { positionSeconds, ...(durationSeconds ? { durationSeconds } : {}) },
  });

/* Entrance assessment */

export const EXAM_RULES = { questions: 30, minutes: 45, passPercent: 80 } as const;

export interface ExamStatus {
  open: boolean;
  passed: boolean;
  attempts: number;
  canStart: boolean;
  reason?: string;
  retakeOpensAt: string | null;
}

export interface ExamAttempt {
  id: string;
  type: "entrance" | "refresher";
  score: number | null;
  percent: number | null;
  passed: boolean | null;
  criticalFailed: boolean | null;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
}

export interface ExamQuestion {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
  isCritical: boolean;
  topic: string | null;
  sortOrder: number;
}

export type ExamType = "entrance" | "refresher";

export const getExamStatus = (signal?: AbortSignal, type: ExamType = "entrance") =>
  api<ExamStatus>(`/exam/status?type=${type}`, { signal });

export const getExamAttempts = (signal?: AbortSignal) => api<{ attempts: ExamAttempt[] }>("/exam/attempts", { signal });

export const startExam = (type: ExamType = "entrance") =>
  api<{ attempt: ExamAttempt; questions: ExamQuestion[]; expiresAt: string }>("/exam/start", {
    method: "POST",
    body: { type },
  });

export const submitExam = (attemptId: string, answers: Record<string, string>) =>
  api<{ attempt: ExamAttempt }>(`/exam/attempts/${encodeURIComponent(attemptId)}/submit`, {
    method: "POST",
    body: { answers },
  });
