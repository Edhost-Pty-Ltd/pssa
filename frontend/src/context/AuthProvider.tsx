import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSession, signOutRequest, type User } from "../api/auth";
import { errorMessage } from "../lib/api";
import { AuthContext } from "./auth-context";

// Checks the session cookie once when the app loads (GET /api/auth/me),
// so a member who is still signed in doesn't have to sign in again.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // First check when the app starts. State is only set when the answer arrives.
  useEffect(() => {
    const controller = new AbortController();
    getSession(controller.signal)
      .then((session) => setUser(session.user))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setUser(null);
        setError(errorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  // "Try again" after a failed check.
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await getSession();
      setUser(session.user);
    } catch (err) {
      setUser(null);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await signOutRequest();
    } finally {
      // Even if the request fails, forget the user on this device.
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, error, refresh, setUser, signOut }), [user, loading, error, refresh, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
