import { api, qs } from "../lib/api";
import type { PublicMemberStatus } from "./verify";

// Public member register: GET /api/search/members?q=&page=&pageSize= (docs/api-contract.md 6.7).
// Only professional details: never ID numbers, banking, home addresses or email.
//
// The backend is moving from its first response shape (firstName/lastName/memberStatus) to the
// fuller one in lib/publicRegisterQueries.ts (name/status/number). This file accepts both and
// hands the pages one shape, so the switch-over doesn't break the site.

export interface RegisterChannel {
  kind: string;
  value: string;
}

export interface RegisterMember {
  id: string;
  name: string;
  tradingName: string | null;
  scope: string | null;
  status: PublicMemberStatus;
  validUntil: string | null;
  /** Certificate number (PSSA-YYYY-XXXXXX), when the backend sends it. */
  number: string | null;
  channels: RegisterChannel[];
}

export interface RegisterPage {
  items: RegisterMember[];
  page: number;
  pageSize: number;
  total: number;
}

/** Either backend shape for one member. */
interface RawMember {
  id: string;
  name?: string;
  firstName?: string | null;
  lastName?: string | null;
  tradingName?: string | null;
  scope?: string | null;
  status?: PublicMemberStatus | null;
  memberStatus?: PublicMemberStatus | null;
  validUntil?: string | null;
  number?: string | null;
  channels?: RegisterChannel[];
}

function toMember(raw: RawMember): RegisterMember {
  const name = raw.name?.trim() || [raw.firstName, raw.lastName].filter(Boolean).join(" ") || raw.tradingName || "PSSA member";
  return {
    id: raw.id,
    name,
    tradingName: raw.tradingName ?? null,
    scope: raw.scope ?? null,
    status: raw.status ?? raw.memberStatus ?? "active",
    validUntil: raw.validUntil ?? null,
    number: raw.number ?? null,
    channels: (raw.channels ?? []).map((c) => ({ kind: c.kind, value: c.value })),
  };
}

export async function searchRegister(q: string, options: { page?: number; pageSize?: number; signal?: AbortSignal } = {}): Promise<RegisterPage> {
  const data = await api<{ items: RawMember[]; page: number; pageSize: number; total: number }>(
    `/search/members${qs({ q: q.trim() || undefined, page: options.page, pageSize: options.pageSize ?? 10 })}`,
    { signal: options.signal },
  );
  return { ...data, items: data.items.map(toMember) };
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "P";
