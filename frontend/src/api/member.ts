import { api } from "../lib/api";

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
    idNumber: string | null;
    physicalAddress: string | null;
    city: string | null;
    memberStatus: string | null;
    channels: Channel[];
  };
  documents: MemberDocument[];
}

export interface ProfileChanges {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  tradingName?: string | null;
  scope?: string | null;
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

export type StepKey = "profile" | "documents" | "tutorials" | "assessment" | "review" | "certified";
export type StepState = "complete" | "in_progress" | "action_needed" | "not_started" | "locked";

export interface ProgressStep {
  key: StepKey;
  label: string;
  state: StepState;
  detail: string;
}

export interface ActionItem {
  step: StepKey;
  title: string;
  detail: string | null;
  status: string;
}

export interface ApplicationReviewSummary {
  id: string;
  decision: "approved" | "rejected" | "needs_info" | string;
  reason: string;
  createdAt: string;
}

export interface ApplicationOverview {
  application: {
    id: string | null;
    number: string | null;
    status: string;
    submittedAt: string | null;
    agreementAcceptedAt: string | null;
    agreementVersion: string | null;
    latestReview?: ApplicationReviewSummary | null;
  };
  progress: {
    percent: number;
    steps: ProgressStep[];
    actions: ActionItem[];
    canSubmit: boolean;
  };
}

export const getApplication = (signal?: AbortSignal) => api<ApplicationOverview>("/member/application", { signal });

export const reapplyApplication = () => api<ApplicationOverview>("/member/application/reapply", { method: "POST" });

export const submitApplication = () => api<{ application: ApplicationOverview["application"] }>("/member/application/submit", { body: { confirm: true } });
