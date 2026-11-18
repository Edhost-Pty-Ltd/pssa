// Status values from docs/api-contract.md (section 4), with the label and colour shown on screen.
// Always send and receive the enum value (e.g. "needs_resubmission"); only the label is friendlier.
import type { StatusTone } from "./StatusBadge";

export type StatusMap = Record<string, { label: string; tone: StatusTone }>;

export const APPLICATION_STATUS: StatusMap = {
  draft: { label: "Draft", tone: "grey" },
  submitted: { label: "Submitted", tone: "blue" },
  under_review: { label: "Under review", tone: "blue" },
  needs_info: { label: "Action needed", tone: "amber" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Rejected", tone: "red" },
};

export const DOCUMENT_STATUS: StatusMap = {
  uploaded: { label: "Uploaded", tone: "grey" },
  under_review: { label: "Under review", tone: "blue" },
  accepted: { label: "Accepted", tone: "green" },
  needs_resubmission: { label: "Needs resubmission", tone: "amber" },
};

export const MEMBER_STATUS: StatusMap = {
  active: { label: "Active", tone: "green" },
  suspended: { label: "Suspended", tone: "amber" },
  expired: { label: "Expired", tone: "grey" },
  revoked: { label: "Revoked", tone: "red" },
  resigned: { label: "Resigned", tone: "grey" },
};

export const COMPLAINT_STATUS: StatusMap = {
  received: { label: "Received", tone: "blue" },
  under_review: { label: "Under review", tone: "blue" },
  awaiting_member_response: { label: "Awaiting response", tone: "amber" },
  decided: { label: "Decided", tone: "green" },
  under_appeal: { label: "Under appeal", tone: "amber" },
};
