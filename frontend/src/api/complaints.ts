import { api } from "../lib/api";

// Complaints and appeals (docs/api-contract.md 6.8). Always free.
// Shapes match backend routes/complaints.ts and lib/complaints.ts (serializePublicComplaint).

export type ComplaintType = "misconduct" | "impersonation" | "badge_misuse";
export type ComplaintStatus = "received" | "under_review" | "awaiting_member_response" | "decided" | "under_appeal";
export type ComplaintOutcome = "no_breach" | "corrective_action" | "suspension" | "revocation";

export interface PublicComplaint {
  id: string;
  referenceNumber: string | null;
  type: ComplaintType;
  status: ComplaintStatus;
  isDraft: boolean;
  description: string | null;
  acknowledgedAt: string | null;
  memberResponseDueAt: string | null;
  decisionDueAt: string | null;
  decidedAt: string | null;
  appealDeadline: string | null;
  outcome: ComplaintOutcome | null;
  createdAt: string;
  updatedAt: string;
  /** Plain-language "what happens next" from the backend. */
  nextSteps: string;
  member: { firstName: string; lastName: string; tradingName: string | null } | null;
  /** Name or social handle, when the person isn't on the register. */
  subjectLabel?: string | null;
  evidenceCount: number;
  responseCount: number;
  appeals: { id: string; lodgedAt: string; decidedAt: string | null; decision: string | null }[];
}

export const COMPLAINT_TYPES: { value: ComplaintType; label: string; hint: string }[] = [
  { value: "misconduct", label: "Misconduct", hint: "Unfair or harmful conduct by a member" },
  { value: "impersonation", label: "Impersonation", hint: "Someone posing as a PSSA member" },
  { value: "badge_misuse", label: "Badge misuse", hint: "Wrong use of the PSSA name, certificate or badge" },
];

export const OUTCOME_LABELS: Record<ComplaintOutcome, string> = {
  no_breach: "No breach found",
  corrective_action: "Corrective action required",
  suspension: "Membership suspended",
  revocation: "Membership revoked",
};

export const MAX_EVIDENCE_FILES = 5;

/** Types that can name someone who isn't on the register (a name or social handle). Misconduct can't. */
export const FREE_TEXT_SUBJECT_TYPES: ComplaintType[] = ["impersonation", "badge_misuse"];

export interface NewComplaint {
  type: ComplaintType;
  description: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  /** One of these identifies the member. */
  memberProfileId?: string;
  certificateNumber?: string;
  /** Impersonation or badge misuse by someone not on the register. */
  subjectLabel?: string;
  consent: boolean;
  evidence: File[];
}

/** Sends the report as multipart form data, so evidence files go with it. */
export function submitComplaint(report: NewComplaint) {
  const form = new FormData();
  form.set("type", report.type);
  form.set("description", report.description);
  form.set("contactName", report.contactName);
  form.set("contactEmail", report.contactEmail);
  if (report.contactPhone) form.set("contactPhone", report.contactPhone);
  if (report.memberProfileId) form.set("memberProfileId", report.memberProfileId);
  if (report.certificateNumber) form.set("certificateNumber", report.certificateNumber);
  if (report.subjectLabel) form.set("subjectLabel", report.subjectLabel);
  form.set("consent", report.consent ? "true" : "false");
  for (const file of report.evidence) form.append("evidence", file);
  return api<{ complaint: PublicComplaint; referenceNumber: string | null }>("/complaints", { form });
}

/** The complainant proves it's their report with the email they used on it. */
export function getComplaint(reference: string, email: string, signal?: AbortSignal) {
  const query = email ? `?email=${encodeURIComponent(email)}` : "";
  return api<{ complaint: PublicComplaint }>(`/complaints/${encodeURIComponent(reference)}${query}`, { signal });
}

export function lodgeAppeal(complaintId: string, reason: string, email?: string) {
  return api<{ appeal: { id: string; reason: string; lodgedAt: string } }>(`/complaints/${encodeURIComponent(complaintId)}/appeal`, {
    method: "POST",
    body: { reason, ...(email ? { email } : {}) },
  });
}

/** The backend marks fields that passed as "ok"; keep only real problems. */
export function realFieldErrors(fields: Record<string, string>) {
  return Object.fromEntries(Object.entries(fields).filter(([, message]) => message !== "ok"));
}

/* Member side: complaints that name the signed-in member. */

/** Cases about the signed-in member, newest first (backend PR #46). */
export const getMyComplaints = (signal?: AbortSignal) => api<{ complaints: PublicComplaint[] }>("/member/complaints", { signal });

/** The member's side of the story. Allowed while the case is awaiting their response or under review. */
export function respondToComplaint(complaintId: string, body: string, files: File[] = []) {
  const path = `/member/complaints/${encodeURIComponent(complaintId)}/response`;
  if (files.length === 0) return api<{ complaint: PublicComplaint }>(path, { method: "POST", body: { body } });
  const form = new FormData();
  form.set("body", body);
  for (const file of files) form.append("files", file);
  return api<{ complaint: PublicComplaint }>(path, { form });
}
