import { createContext, useContext } from "react";
import type { User } from "../api/auth";

// The signed-in user, shared with every page. AuthProvider (AuthProvider.tsx) fills it in.
export interface AuthState {
  user: User | null;
  /** True until the first session check has finished. */
  loading: boolean;
  /** Set when the session check failed (for example, the backend isn't running). */
  error: string | null;
  /** True right after the member pressed Sign out, so the sign-in page can say so. */
  signedOut: boolean;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
