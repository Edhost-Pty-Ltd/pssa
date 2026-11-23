import { api } from "../lib/api";

export type RenewalState =
  | "not_started"
  | "window_closed"
  | "ineligible"
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

export interface RenewalDecision {
  id: string;
  status: "approved" | "rejected";
  decisionReason: string | null;
  decidedAt: string;
  declarationVersion: string | null;
}

export interface RenewalOverview {
  validUntil: string | null;
  windowOpensAt: string | null;
  status: RenewalState;
  checklist: ChecklistItem[];
  lastReminderAt: string | null;
  renewal: RenewalRecord | null;
  canStart: boolean;
  lastDecision?: RenewalDecision | null;
}

export const getRenewal = (signal?: AbortSignal) => api<RenewalOverview>("/member/renewal", { signal });

export const startRenewal = () => api<{ renewal: RenewalRecord }>("/member/renewal/start", { method: "POST", body: { confirm: true } });

export const submitDeclaration = (version: string, statements: string) =>
  api<{ renewal: RenewalRecord }>("/member/renewal/declaration", {
    method: "POST",
    body: { accepted: true, version, statements },
  });

// Placeholder declaration: replace when the official text is approved
export const DECLARATION = {
  version: "draft-2026-1",
  statements: [
    "The details on my profile and my verification documents are still correct.",
    "I will keep following the PSASA Code of Conduct and the Badge Rules.",
    "I will tell PSASA if my identity, address, bank details or trading channels change.",
  ],
} as const;
