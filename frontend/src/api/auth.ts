import { api } from "../lib/api";

// Auth endpoints, as in docs/api-contract.md section 6.1.
// Members sign in without a password: send a code to their email, then verify it.

export type Role = "MEMBER" | "ADMIN" | "CUSTOMER";

export interface MemberSummary {
  id: string;
  businessName: string | null;
  category: string;
  idNumber: string | null; // masked by the server, never the full number
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  createdAt: string;
  member: MemberSummary | null;
}

export interface CodeSent {
  sent: boolean;
  destination: string; // masked, e.g. t•••@gmail.com
  expiresAt: string;
}

/** Who is signed in. Returns { user: null } when nobody is. */
export const getSession = (signal?: AbortSignal) => api<{ user: User | null }>("/auth/me", { signal });

/** Step 1: email a one-time code. */
export const sendCode = (email: string) => api<CodeSent>("/auth/otp/send", { body: { email } });

/** Step 2: check the code. On success the server sets the session cookie. */
export const verifyCode = (email: string, code: string) => api<{ user: User }>("/auth/otp/verify", { body: { email, code } });

export const signOutRequest = () => api<{ ok: true }>("/auth/logout", { method: "POST" });
