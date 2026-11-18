import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSession, signOutRequest, type User } from "../api/auth";
import { errorMessage } from "../lib/api";
import { AuthContext } from "./auth-context";

// Checks the session cookie once when the app loads (GET /api/auth/me),
// so a member who is still signed in doesn't have to sign in again.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Signing in (or any new session) clears the "you're signed out" message.
  const setUser = useCallback((next: User | null) => {
    setUserState(next);
    if (next) setSignedOut(false);
  }, []);

  // First check when the app starts. State is only set when the answer arrives.
  useEffect(() => {
    const controller = new AbortController();
    getSession(controller.signal)
      .then((session) => setUserState(session.user))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setUserState(null);
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
      setUserState(session.user);
    } catch (err) {
      setUserState(null);
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
      setSignedOut(true);
      setUserState(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, signedOut, refresh, setUser, signOut }),
    [user, loading, error, signedOut, refresh, setUser, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
