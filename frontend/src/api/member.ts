import { api } from "../lib/api";

// The signed-in member's profile and application (docs/api-contract.md section 6.2).

/** Must match MEMBER_CATEGORIES in backend/src/lib/members.ts. */
export const MEMBER_CATEGORIES = ["Home & Errands", "Food & Cooking", "Style & Events", "Other"] as const;
export type MemberCategory = (typeof MEMBER_CATEGORIES)[number];

export type SocialPlatform = "facebook" | "instagram" | "tiktok";

export interface MemberDocumentSummary {
  id: string;
  documentType: string;
  originalName: string;
  reviewStatus: string;
  reviewerNote: string | null;
  uploadedAt: string;
}

/** GET /api/member/profile → { profile } */
export interface MemberProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  createdAt: string;
  member: {
    id: string;
    businessName: string | null;
    category: string;
    idNumber: string | null; // masked by the server
    physicalAddress: string | null;
    verificationStatus: string;
    socialAccounts: { platform: SocialPlatform; url: string }[];
    documents: MemberDocumentSummary[];
  };
}

/** Fields the member can change. Leave a field out to keep it; null or "" clears optional fields. */
export interface ProfileChanges {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  businessName?: string | null;
  category?: MemberCategory;
  idNumber?: string;
  physicalAddress?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
}

export const getProfile = (signal?: AbortSignal) => api<{ profile: MemberProfile }>("/member/profile", { signal });

export const updateProfile = (changes: ProfileChanges) => api<{ profile: MemberProfile }>("/member/profile", { method: "PATCH", body: changes });

/* Application progress (GET /api/member/application). Proposed shape, to be confirmed in the contract. */

export type StepKey = "profile" | "documents" | "tutorials" | "assessment" | "review" | "certified";
export type StepState = "complete" | "in_progress" | "action_needed" | "not_started" | "locked";

export interface ProgressStep {
  key: StepKey;
  label: string;
  state: StepState;
  /** Short text under the step, e.g. "3 of 4 complete". */
  detail: string;
}

export interface ActionItem {
  step: StepKey;
  title: string;
  detail: string | null;
  /** A status value from the contract, e.g. "needs_resubmission". */
  status: string;
}

export interface ApplicationOverview {
  application: {
    id: string | null;
    number: string | null; // APP-YYYY-XXXX once submitted
    status: string; // draft | submitted | under_review | needs_info | approved | rejected
    submittedAt: string | null;
    agreementAcceptedAt: string | null;
    agreementVersion: string | null;
  };
  progress: {
    percent: number;
    steps: ProgressStep[];
    actions: ActionItem[];
    /** True when every gate before Review has passed. */
    canSubmit: boolean;
  };
}

export const getApplication = (signal?: AbortSignal) => api<ApplicationOverview>("/member/application", { signal });

export const submitApplication = () => api<{ application: ApplicationOverview["application"] }>("/member/application/submit", { body: { confirm: true } });
