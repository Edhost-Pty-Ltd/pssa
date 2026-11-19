import { api } from "../lib/api";

// Conduct tutorials and the entrance assessment (docs/api-contract.md 6.4).
// Shapes match backend routes/tutorials.ts, routes/exam.ts and lib/exam.ts.

/* Tutorials */

export interface Tutorial {
  id: string;
  title: string;
  durationSeconds: number | null;
  createdAt: string;
  completed: boolean;
  completedAt: string | null;
  watchedSeconds: number;
  /** Furthest point the member has watched in order. They can't skip past it. */
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

/** The video file. The backend supports Range requests, so the browser can stream and seek. */
export const tutorialStreamUrl = (id: string) => `/api/tutorials/${encodeURIComponent(id)}/stream`;

/** The backend only lets each report move forward a few seconds, so skipping ahead never counts. */
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
  /** Why the assessment can't start yet, in plain words. */
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

export const getExamStatus = (signal?: AbortSignal) => api<ExamStatus>("/exam/status", { signal });

export const getExamAttempts = (signal?: AbortSignal) => api<{ attempts: ExamAttempt[] }>("/exam/attempts", { signal });

/** Starts the entrance assessment, or resumes an unfinished attempt with the same questions and deadline. */
export const startExam = () =>
  api<{ attempt: ExamAttempt; questions: ExamQuestion[]; expiresAt: string }>("/exam/start", {
    method: "POST",
    body: { type: "entrance" },
  });

/** answers: { questionId: optionId }. Unanswered questions count as wrong; late submits are scored as a fail. */
export const submitExam = (attemptId: string, answers: Record<string, string>) =>
  api<{ attempt: ExamAttempt }>(`/exam/attempts/${encodeURIComponent(attemptId)}/submit`, {
    method: "POST",
    body: { answers },
  });
