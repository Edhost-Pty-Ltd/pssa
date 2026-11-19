import { api } from "../lib/api";

export type PublicMemberStatus = "active" | "suspended" | "expired" | "revoked" | "resigned";

export interface VerifiedChannel {
  kind: string;
  value: string;
}

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
  checkedAt: string;
}

export const CERTIFICATE_PATTERN = /^PSSA-\d{4}-\d{6}$/;

export function normalizeCertificateNumber(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export function checkCertificate(number: string, signal?: AbortSignal) {
  return api<{ certificate: CertificateCheck }>(`/verify/${encodeURIComponent(number)}`, { signal });
}
