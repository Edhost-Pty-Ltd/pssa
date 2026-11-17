import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { sendCode, verifyCode, type CodeSent } from "../../api/auth";
import { Icon } from "../../components/Icon";
import { Logo } from "../../components/Logo";
import "../../components/member/member.css";
import { Button, Notice, TextField } from "../../components/ui";
import { useAuth } from "../../context/auth-context";
import { ApiError, errorMessage } from "../../lib/api";
import { fieldMessage } from "../../lib/fieldMessage";
import { safeNext } from "../../lib/safeNext";

// Member sign-in, as in the Figma file: email → one-time code → signed in. No password.
// New members use the same flow: verifying a new email starts their application.
// API: POST /api/auth/otp/send and POST /api/auth/otp/verify (docs/api-contract.md 6.1).

const RESEND_SECONDS = 30;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendlyError(err: unknown) {
  if (err instanceof ApiError && err.status === 429) return "Too many attempts. Please wait a few minutes and try again.";
  return errorMessage(err);
}

function expiryTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" });
}

export default function SignIn() {
  const { user, setUser, signedOut } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<CodeSent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ email?: string; code?: string }>({});
  const [cooldown, setCooldown] = useState(0);

  // Count down the resend wait.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Already signed in as a member: go straight to the portal.
  if (user?.role === "MEMBER") return <Navigate to={next} replace />;

  async function requestCode(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    const value = email.trim().toLowerCase();
    if (!EMAIL.test(value)) {
      setFieldError({ email: "Enter a valid email address." });
      return;
    }
    setFieldError({});
    setBusy(true);
    try {
      const result = await sendCode(value);
      setEmail(value);
      setSent(result);
      setCode("");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      if (err instanceof ApiError && err.fields.email) setFieldError({ email: fieldMessage("That email address", err.fields.email) });
      else setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setFieldError({ code: "Enter the 6-digit code from the email." });
      return;
    }
    setFieldError({});
    setBusy(true);
    try {
      const { user } = await verifyCode(email, code);
      setUser(user);
      navigate(next, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.fields.code) setFieldError({ code: fieldMessage("That code", err.fields.code) });
      else setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  function switchEmail() {
    setSent(null);
    setCode("");
    setError(null);
    setFieldError({});
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Logo />
        <p className="kicker">Member portal</p>

        {(signedOut || params.get("signedOut")) && !sent && (
          <Notice tone="green" title="You're signed out." />
        )}

        {!sent ? (
          <>
            <h1>Welcome back</h1>
            <p>Sign in to continue your application or manage your membership.</p>
            {error && <Notice tone="red" title="We couldn't send a code">{error}</Notice>}
            <form onSubmit={requestCode} noValidate>
              <TextField
                label="Email address"
                type="email"
                icon="mail"
                autoComplete="email"
                placeholder="you@example.co.za"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldError.email}
                required
              />
              <div style={{ marginTop: 18 }}>
                <Button type="submit" variant="green" full loading={busy} iconRight="arrow">
                  Continue with email
                </Button>
              </div>
            </form>
            <div className="auth-divider">
              <span>Secure sign in</span>
            </div>
            <div className="otp-note">
              <Icon name="mail" />
              <p>We'll send a one-time code to your email. No password needed. New to PSSA? Enter your email to start an application.</p>
            </div>
          </>
        ) : (
          <>
            <h1>Check your email</h1>
            <p>
              We sent a 6-digit code to <b>{sent.destination}</b>. It expires at {expiryTime(sent.expiresAt)}.
            </p>
            {error && <Notice tone="red" title="That didn't work">{error}</Notice>}
            <form onSubmit={submitCode} noValidate>
              <div className="code-input">
                <TextField
                  autoFocus
                  label="6-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="••••••"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  error={fieldError.code}
                  required
                />
              </div>
              <div style={{ marginTop: 18 }}>
                <Button type="submit" variant="green" full loading={busy}>
                  Sign in
                </Button>
              </div>
            </form>
            <div className="auth-links">
              <button type="button" className="link-button" onClick={switchEmail}>
                Use a different email
              </button>
              <button type="button" className="link-button" onClick={() => void requestCode()} disabled={cooldown > 0 || busy}>
                {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
