import { api } from "../lib/api";

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
  nextSteps: string;
  member: { firstName: string; lastName: string; tradingName: string | null } | null;
  subjectLabel?: string | null;
  evidenceCount: number;
  responseCount: number;
  appeals: { id: string; lodgedAt: string; decidedAt: string | null; decision: string | null }[];
}

export const COMPLAINT_TYPES: { value: ComplaintType; label: string; hint: string }[] = [
  { value: "misconduct", label: "Misconduct", hint: "Unfair or harmful conduct by a member" },
  { value: "impersonation", label: "Impersonation", hint: "Someone posing as a PSASA member" },
  { value: "badge_misuse", label: "Badge misuse", hint: "Wrong use of the PSASA name, certificate or badge" },
];

export const OUTCOME_LABELS: Record<ComplaintOutcome, string> = {
  no_breach: "No breach found",
  corrective_action: "Corrective action required",
  suspension: "Membership suspended",
  revocation: "Membership revoked",
};

export const MAX_EVIDENCE_FILES = 5;

export const FREE_TEXT_SUBJECT_TYPES: ComplaintType[] = ["impersonation", "badge_misuse"];

export interface NewComplaint {
  type: ComplaintType;
  description: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  memberProfileId?: string;
  certificateNumber?: string;
  subjectLabel?: string;
  consent: boolean;
  evidence: File[];
}

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

export function realFieldErrors(fields: Record<string, string>) {
  return Object.fromEntries(Object.entries(fields).filter(([, message]) => message !== "ok"));
}

export const getMyComplaints = (signal?: AbortSignal) => api<{ complaints: PublicComplaint[] }>("/member/complaints", { signal });

export function respondToComplaint(complaintId: string, body: string, files: File[] = []) {
  const path = `/member/complaints/${encodeURIComponent(complaintId)}/response`;
  if (files.length === 0) return api<{ complaint: PublicComplaint }>(path, { method: "POST", body: { body } });
  const form = new FormData();
  form.set("body", body);
  for (const file of files) form.append("files", file);
  return api<{ complaint: PublicComplaint }>(path, { form });
}
