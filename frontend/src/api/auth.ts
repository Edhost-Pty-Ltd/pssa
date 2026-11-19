import { api } from "../lib/api";

export type Role = "MEMBER" | "ADMIN" | "CUSTOMER";

export interface MemberSummary {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  tradingName: string | null;
  scope: string | null;
  idNumber: string | null;
  city: string | null;
  memberStatus: string | null;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  createdAt: string;
  memberProfile: MemberSummary | null;
}

export interface CodeSent {
  sent: boolean;
  destination: string;
  expiresAt: string;
}

export const getSession = (signal?: AbortSignal) => api<{ user: User | null }>("/auth/me", { signal });

export const sendCode = (email: string) => api<CodeSent>("/auth/otp/send", { body: { email } });

export const verifyCode = (email: string, code: string) => api<{ user: User }>("/auth/otp/verify", { body: { email, code } });

export const signOutRequest = () => api<{ ok: true }>("/auth/logout", { method: "POST" });
