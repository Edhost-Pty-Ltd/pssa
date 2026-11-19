import { api } from "../lib/api";
import type { PublicMemberStatus } from "./verify";

export interface MemberCertificate {
  id: string;
  number: string;
  issuedAt: string;
  validFrom: string;
  validUntil: string;
  scope: string | null;
  qrTargetUrl: string;
  status: PublicMemberStatus;
  hasPdf: boolean;
}

export const getCertificate = (signal?: AbortSignal) =>
  api<{ certificate: MemberCertificate | null; reason?: string }>("/member/certificate", { signal });
