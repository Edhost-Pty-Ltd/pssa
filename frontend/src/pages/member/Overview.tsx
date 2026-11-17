import { Card, Notice } from "../../components/ui";
import { useAuth } from "../../context/auth-context";

// Member overview. The application dashboard (six steps, progress, action cards) is the next Phase 1 task;
// for now this shows who is signed in, from GET /api/auth/me.
export default function Overview() {
  const { user } = useAuth();
  if (!user) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <>
      <div className="workspace-title">
        <div>
          <span>Member portal</span>
          <h1>{name ? `Welcome, ${user.firstName}` : "Welcome"}</h1>
          <p>Your application and membership in one place.</p>
        </div>
      </div>
      <Notice tone="blue" title="Your application dashboard is on its way.">
        The steps for your application (profile, documents, tutorials, assessment and review) will appear here.
      </Notice>
      <Card>
        <h3 style={{ marginBottom: 14 }}>Signed in</h3>
        <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "10px 24px", margin: 0 }}>
          <dt className="muted">Email</dt>
          <dd style={{ margin: 0 }}>{user.email}</dd>
          <dt className="muted">Email confirmed</dt>
          <dd style={{ margin: 0 }}>{user.emailVerifiedAt ? "Yes" : "Not yet"}</dd>
        </dl>
      </Card>
    </>
  );
}
