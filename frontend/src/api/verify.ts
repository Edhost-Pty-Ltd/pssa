import { api } from "../lib/api";

// Live certificate check: GET /api/verify/:certificateNumber (docs/api-contract.md 6.6).
// Public endpoint. It never returns ID numbers, banking details or addresses.
export type PublicMemberStatus = "active" | "suspended" | "expired" | "revoked" | "resigned";

export interface VerifiedChannel {
  kind: string;
  value: string;
}

/** What GET /api/verify/:certificateNumber returns (agreed with backend). */
interface VerificationResponse {
  verification: {
    number: string;
    firstName: string;
    lastName: string;
    tradingName: string | null;
    scope: string | null;
    status: PublicMemberStatus;
    validFrom?: string | null;
    validUntil: string;
    verifiedChannels: VerifiedChannel[];
  };
}

/** The shape the page uses. `checkedAt` is when this browser asked the server. */
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

/** Certificate numbers look like PSSA-2026-004821. */
export const CERTIFICATE_PATTERN = /^PSSA-\d{4}-\d{6}$/;

/** Uppercases and removes spaces, so "pssa-2026-004821 " still matches. */
export function normalizeCertificateNumber(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export async function checkCertificate(number: string, signal?: AbortSignal): Promise<{ certificate: CertificateCheck }> {
  const { verification: v } = await api<VerificationResponse>(`/verify/${encodeURIComponent(number)}`, { signal });
  return {
    certificate: {
      number: v.number,
      firstName: v.firstName,
      lastName: v.lastName,
      tradingName: v.tradingName,
      scope: v.scope,
      status: v.status,
      validFrom: v.validFrom ?? null,
      validUntil: v.validUntil,
      channels: v.verifiedChannels ?? [],
      checkedAt: new Date().toISOString(),
    },
  };
}
