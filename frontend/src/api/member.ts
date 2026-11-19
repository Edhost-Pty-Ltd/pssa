import { api } from "../lib/api";

// The signed-in member's profile and application (docs/api-contract.md section 6.2).

export type ChannelKind = "facebook" | "instagram" | "tiktok";

export interface Channel {
  id: string;
  kind: ChannelKind | string;
  value: string;
  status: "code_sent" | "confirmed";
}

export interface MemberDocument {
  id: string;
  type: string;
  originalName: string;
  status: string;
  reviewerNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

/** GET /api/member/profile → { profile } */
/** SA ID number or a passport number (docs/api-contract.md 6.2). */
export type IdentityType = "sa_id" | "passport";

export interface MemberProfile {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  createdAt: string;
  memberProfile: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    tradingName: string | null;
    scope: string | null;
    identityType: IdentityType | null;
    idNumber: string | null; // masked by the server
    physicalAddress: string | null;
    city: string | null;
    memberStatus: string | null;
    channels: Channel[];
  };
  documents: MemberDocument[];
}

/** Fields the member can change. Leave a field out to keep it; null or "" clears optional fields. */
export interface ProfileChanges {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  tradingName?: string | null;
  scope?: string | null;
  /** Always sent together with idNumber. */
  identityType?: IdentityType;
  idNumber?: string;
  physicalAddress?: string | null;
  city?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
}

export const getProfile = (signal?: AbortSignal) => api<{ profile: MemberProfile }>("/member/profile", { signal });

export const updateProfile = (changes: ProfileChanges) => api<{ profile: MemberProfile }>("/member/profile", { method: "PATCH", body: changes });

/* Application progress (GET /api/member/application), as in docs/api-contract.md. */

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
