import { api } from "../lib/api";

// Live certificate check: GET /api/verify/:certificateNumber (docs/api-contract.md 6.6).
// Public endpoint. It never returns ID numbers, banking details or addresses.
export type PublicMemberStatus = "active" | "suspended" | "expired" | "revoked" | "resigned";

export interface VerifiedChannel {
  kind: string;
  value: string;
}

/** What GET /api/verify/:certificateNumber returns inside `{ certificate }` (backend lib/certificates.ts). */
export interface CertificateCheck {
  number: string;
  firstName: string;
  lastName: string;
  tradingName: string | null;
  scope: string | null;
  status: PublicMemberStatus;
  validFrom: string | null;
  validUntil: string;
  channels: VerifiedChannel[];
  /** When the server checked the status. */
  checkedAt: string;
}

/** Certificate numbers look like PSSA-2026-004821. */
export const CERTIFICATE_PATTERN = /^PSSA-\d{4}-\d{6}$/;

/** Uppercases and removes spaces, so "pssa-2026-004821 " still matches. */
export function normalizeCertificateNumber(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export function checkCertificate(number: string, signal?: AbortSignal) {
  return api<{ certificate: CertificateCheck }>(`/verify/${encodeURIComponent(number)}`, { signal });
}
