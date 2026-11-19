import { createContext, useContext } from "react";
import type { User } from "../api/auth";

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
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
