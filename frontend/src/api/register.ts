import { api, qs } from "../lib/api";

// Public member register: GET /api/search/members?q= (docs/api-contract.md 6.7).
// Only active members are returned, with professional details only.
export interface RegisterChannel {
  kind: string;
  value: string;
}

export interface RegisterMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  tradingName: string | null;
  scope: string | null;
  memberStatus: string;
  validUntil: string | null;
  channels: RegisterChannel[];
}

export interface RegisterPage {
  items: RegisterMember[];
  page: number;
  pageSize: number;
  total: number;
}

export function searchRegister(q: string, signal?: AbortSignal) {
  return api<RegisterPage>(`/search/members${qs({ q, pageSize: 10 })}`, { signal });
}
