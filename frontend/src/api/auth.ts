import { api } from "../lib/api";

export type Role = "MEMBER" | "ADMIN";

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

export const signInWithPassword = (email: string, password: string) =>
  api<{ user: User }>("/auth/login", { body: { email, password } });

export const registerMember = (input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) => api<{ user: User; message: string }>("/auth/register", { body: { ...input, role: "MEMBER" } });

export const sendRegistrationCode = (input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) => api<CodeSent>("/auth/register/otp", { body: input });

export const verifyRegistrationCode = (input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  code: string;
}) => api<{ user: User; message: string }>("/auth/register/verify", { body: input });

export const sendCode = (email: string) => api<CodeSent>("/auth/otp/send", { body: { email } });

export const verifyCode = (email: string, code: string) => api<{ user: User }>("/auth/otp/verify", { body: { email, code } });

export const signOutRequest = () => api<{ ok: true }>("/auth/logout", { method: "POST" });
