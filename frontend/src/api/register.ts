import { api } from "../lib/api";

// Public member register (GET /api/search/members). Returns active, verified members only.
export interface RegisterMember {
  id: string;
  firstName: string;
  lastName: string;
  businessName: string | null;
  category: string;
  verificationStatus: string;
  isActive: boolean;
  socialAccounts: { platform: string; url: string }[];
}

export function searchRegister(q: string, signal?: AbortSignal) {
  return api<RegisterMember[]>(`/search/members?q=${encodeURIComponent(q)}`, { signal });
}
