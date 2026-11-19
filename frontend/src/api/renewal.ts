import { api } from "../lib/api";

// Annual renewal: GET /api/member/renewal, POST /api/member/renewal/start,
// POST /api/member/renewal/declaration (docs/api-contract.md 6.9; backend lib/renewals.ts).
// The window opens 60 days before validUntil. A fee or payment never renews membership by itself.

export type RenewalState =
  | "not_started" // window open, nothing started yet
  | "window_closed" // too early: the window hasn't opened
  | "ineligible" // not active yet, or suspended / revoked / resigned
  | "draft"
  | "submitted"
  | "needs_info"
  | "approved"
  | "rejected";

export interface RenewalRecord {
  id: string;
  status: "draft" | "submitted" | "needs_info" | "approved" | "rejected";
  windowOpensAt: string;
  startedAt: string;
  submittedAt: string | null;
  declarationAcceptedAt: string | null;
  declarationVersion: string | null;
  decisionReason: string | null;
  decidedAt: string | null;
}

export interface ChecklistItem {
  key: "documents" | "refresher" | "declaration";
  label: string;
  complete: boolean;
  detail: string;
}

export interface RenewalOverview {
  validUntil: string | null;
  windowOpensAt: string | null;
  status: RenewalState;
  checklist: ChecklistItem[];
  lastReminderAt: string | null;
  renewal: RenewalRecord | null;
  canStart: boolean;
}

export const getRenewal = (signal?: AbortSignal) => api<RenewalOverview>("/member/renewal", { signal });

export const startRenewal = () => api<{ renewal: RenewalRecord }>("/member/renewal/start", { method: "POST", body: { confirm: true } });

export const submitDeclaration = (version: string, statements: string) =>
  api<{ renewal: RenewalRecord }>("/member/renewal/declaration", {
    method: "POST",
    body: { accepted: true, version, statements },
  });

/**
 * PLACEHOLDER WORDING: the official annual declaration must come from the PSSA senior.
 * Replace the text and bump the version when it arrives. The text is sent with the declaration
 * so the record shows exactly what the member agreed to.
 */
export const DECLARATION = {
  version: "draft-2026-1",
  statements: [
    "The details on my profile and my verification documents are still correct.",
    "I will keep following the PSSA Code of Conduct and the Badge Rules.",
    "I will tell PSSA if my identity, address, bank details or trading channels change.",
  ],
} as const;
