import { api } from "../lib/api";

export type PracticalTrack = "fashion_personal_styling" | "grocery_food_shopping" | "household_essentials";

export type PracticalAssessmentStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "NEEDS_RESUBMISSION"
  | "PASSED"
  | "NOT_PASSED";

export interface PracticalTrackOption {
  id: PracticalTrack;
  code: "A" | "B" | "C";
  label: string;
  budgetZar: number;
  summary: string;
}

export interface PracticalOptionItem {
  name: string;
  retailer: string;
  url: string;
  price: string;
  suitability: string;
}

export interface PracticalAnswers {
  briefSummary: string;
  options: PracticalOptionItem[];
  budget: {
    estimatedTotal: string;
    additionalCosts: string;
    remainingOrOver: string;
    assumptions: string;
    priceCheckedDate: string;
  };
  recommendation: {
    preferredPlan: string;
    backupOption: string;
  };
  customerMessage: string;
  responsibility: {
    priceChanges: string;
    commissionDisclosure: string;
    privacyProtection: string;
  };
}

export interface PracticalSubmission {
  id: string;
  status: PracticalAssessmentStatus;
  tutorialVersion: number;
  assignmentVersion: number;
  tutorialWatched: boolean;
  tutorialWatchedAt: string | null;
  tutorialWatchedSeconds: number;
  serviceTrack: PracticalTrack | null;
  answers: Partial<PracticalAnswers> | null;
  evidence: {
    fileName: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
    url: string;
  } | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  totalScore: number | null;
  passThresholdUsed: number | null;
  reviewerFeedback: string | null;
  updatedAt: string;
}

export interface PracticalState {
  declaredScope: string | null;
  suggestedTrack: PracticalTrack | null;
  tracks: PracticalTrackOption[];
  tutorial: {
    id: string;
    version: number;
    title: string;
    fileName: string;
    isFallback: boolean;
    streamUrl: string;
  };
  assignment: {
    id: string;
    version: number;
    title: string;
    fileName: string;
    isFallback: boolean;
    inlineUrl: string;
    downloadUrl: string;
  };
  submission: PracticalSubmission;
}

export const getPracticalState = (signal?: AbortSignal) =>
  api<PracticalState>("/practical-assessment/state", { signal });

export const reportPracticalTutorial = (watchedSeconds: number, completed: boolean) =>
  api<{ submission: PracticalSubmission }>("/practical-assessment/tutorial-progress", {
    method: "POST",
    body: { watchedSeconds, completed },
  });

export const savePracticalDraft = (serviceTrack: PracticalTrack | null, answers: PracticalAnswers) =>
  api<{ submission: PracticalSubmission }>("/practical-assessment/draft", {
    method: "PUT",
    body: { serviceTrack, answers },
  });

export const uploadPracticalEvidence = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api<{ submission: PracticalSubmission }>("/practical-assessment/evidence", {
    method: "POST",
    form,
  });
};

export const deletePracticalEvidence = () =>
  api<{ submission: PracticalSubmission }>("/practical-assessment/evidence", {
    method: "DELETE",
  });

export const submitPracticalAssessment = (
  payload: { serviceTrack: PracticalTrack } & PracticalAnswers & { idempotencyKey?: string },
) =>
  api<{ submission: PracticalSubmission; deduplicated: boolean }>("/practical-assessment/submit", {
    method: "POST",
    body: payload,
  });
