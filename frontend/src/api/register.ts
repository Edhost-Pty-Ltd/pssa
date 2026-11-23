import { api, qs } from "../lib/api";
import type { PublicMemberStatus } from "./verify";

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
  number: string | null;
  channels: RegisterChannel[];
}

export interface RegisterPage {
  items: RegisterMember[];
  page: number;
  pageSize: number;
  total: number;
}

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
  const name = raw.name?.trim() || [raw.firstName, raw.lastName].filter(Boolean).join(" ") || raw.tradingName || "PSASA member";
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
