import { api } from "../lib/api";
import type { PublicMemberStatus } from "./verify";

// The member's own certificate: GET /api/member/certificate (backend lib/certificates.ts serializeCertificate).
// `status` is the live status (it changes the moment membership is suspended or expires).
export interface MemberCertificate {
  id: string;
  number: string;
  issuedAt: string;
  validFrom: string;
  validUntil: string;
  scope: string | null;
  /** The public live-check page, e.g. http://localhost:5174/verify/PSSA-2026-000001. Also the QR target. */
  qrTargetUrl: string;
  status: PublicMemberStatus;
  hasPdf: boolean;
}

export const getCertificate = (signal?: AbortSignal) =>
  api<{ certificate: MemberCertificate | null; reason?: string }>("/member/certificate", { signal });
