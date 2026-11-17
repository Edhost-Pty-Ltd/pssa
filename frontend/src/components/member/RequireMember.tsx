import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import { Button, ErrorState, LoadingState } from "../ui";

// Wraps every member page: only a signed-in MEMBER gets through.
// Anyone else is sent to sign-in, and comes back to the page they wanted afterwards.
export function RequireMember() {
  const { user, loading, error, refresh, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-page">
        <div style={{ width: "min(560px, 100%)" }}>
          <LoadingState rows={2} label="Checking your session" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-page">
        <div style={{ width: "min(560px, 100%)" }}>
          <ErrorState title="We couldn't check your session" text={error} onRetry={() => void refresh()} />
        </div>
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/member/sign-in?next=${next}`} replace />;
  }

  if (user.role !== "MEMBER") {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h1>This area is for members</h1>
          <p className="muted" style={{ margin: "10px 0 22px" }}>
            You're signed in as {user.email}, which isn't a member account. Sign out to continue as a member.
          </p>
          <Button full onClick={() => void signOut()}>Sign out</Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
