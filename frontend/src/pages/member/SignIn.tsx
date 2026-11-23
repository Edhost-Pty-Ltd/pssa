import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { sendCode, verifyCode, type CodeSent } from "../../api/auth";
import { Icon } from "../../components/Icon";
import { Wordmark } from "../../components/site/Wordmark";
import { useAuth } from "../../context/auth-context";
import { ApiError, errorMessage } from "../../lib/api";
import { fieldMessage } from "../../lib/fieldMessage";
import { safeNext } from "../../lib/safeNext";
import { GrainOverlay } from "../public/landing/ui";

const RESEND_SECONDS = 30;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EASE = [0.22, 1, 0.36, 1] as const;

const JOURNEY_GATES = [
  { num: "01", title: "Identity & Scope", desc: "Name, trading profile, and city." },
  { num: "02", title: "Verification Files", desc: "ID, proof of address, and optional channels." },
  { num: "03", title: "Conduct & Exam", desc: "Video lessons and 80% assessment." },
  { num: "04", title: "Officer Approval", desc: "Public register & QR certificate unlock." },
];

type CodeSentWithDev = CodeSent & { devCode?: string };

function friendlyError(err: unknown) {
  if (err instanceof ApiError && err.status === 429) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  return errorMessage(err);
}

function expiryTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  });
}

export default function SignIn() {
  const { user, setUser, signedOut } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));

  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [sent, setSent] = useState<CodeSentWithDev | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ email?: string; code?: string }>({});
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (sent) {
      otpRefs.current[0]?.focus();
    }
  }, [sent]);

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
      const result = (await sendCode(value)) as CodeSentWithDev;
      setEmail(value);
      setSent(result);
      setDigits(["", "", "", "", "", ""]);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      if (err instanceof ApiError && err.fields.email) {
        setFieldError({ email: fieldMessage("That email address", err.fields.email) });
      } else {
        setError(friendlyError(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setFieldError({ code: "Enter all 6 digits from your email." });
      return;
    }
    setFieldError({});
    setBusy(true);
    try {
      const { user: signedInUser } = await verifyCode(email, code);
      setUser(signedInUser);
      navigate(next, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.fields.code) {
        setFieldError({ code: fieldMessage("That code", err.fields.code) });
      } else {
        setError(friendlyError(err));
      }
    } finally {
      setBusy(false);
    }
  }

  function handleDigitChange(index: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (!clean) {
      setDigits((prev) => {
        const nextDigits = [...prev];
        nextDigits[index] = "";
        return nextDigits;
      });
      return;
    }
    if (clean.length > 1) {
      const chars = clean.slice(0, 6 - index).split("");
      setDigits((prev) => {
        const nextDigits = [...prev];
        chars.forEach((ch, offset) => {
          nextDigits[index + offset] = ch;
        });
        return nextDigits;
      });
      const focusIdx = Math.min(5, index + chars.length);
      otpRefs.current[focusIdx]?.focus();
      return;
    }
    setDigits((prev) => {
      const nextDigits = [...prev];
      nextDigits[index] = clean;
      return nextDigits;
    });
    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const padded = Array.from({ length: 6 }, (_, i) => pasted[i] ?? "");
    setDigits(padded);
    otpRefs.current[Math.min(5, pasted.length - 1)]?.focus();
  }

  function fillDevCode(devCode: string) {
    const clean = devCode.replace(/\D/g, "").slice(0, 6);
    setDigits(Array.from({ length: 6 }, (_, i) => clean[i] ?? ""));
    setFieldError({});
  }

  function switchEmail() {
    setSent(null);
    setDigits(["", "", "", "", "", ""]);
    setError(null);
    setFieldError({});
  }

  return (
    <div className="landing relative flex min-h-screen flex-col justify-between overflow-hidden bg-navy font-body text-white">
      {/* Admin-matched atmospheric navy + forest-river backdrop */}
      <img
        src="/images/forest-river-bg.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 h-full w-full scale-105 object-cover opacity-28 mix-blend-luminosity"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-gradient-to-br from-navy/92 via-navy/82 to-navy-2/90"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-32 right-[-10%] h-[480px] w-[480px] rounded-full opacity-35 blur-3xl"
        style={{ background: "radial-gradient(circle, #18a269 0%, transparent 70%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-32 left-[-8%] h-[440px] w-[440px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #efe6d4 0%, transparent 70%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-15"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <GrainOverlay />

      {/* Top minimal editorial bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-7">
        <Wordmark />
        <Link
          to="/register"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 backdrop-blur-md transition hover:border-green/50 hover:bg-white/10 hover:text-white"
        >
          Public register <Icon name="arrow" size={13} />
        </Link>
      </header>

      {/* Main split frosted-glass stage */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-10">
        <div className="grid w-full items-stretch gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          {/* Left: Editorial luxury story & 4-gate preview */}
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: EASE }}
            className="relative hidden overflow-hidden rounded-3xl border border-white/15 bg-white/[0.06] p-8 shadow-[0_30px_90px_-24px_rgba(0,0,0,0.65)] backdrop-blur-2xl lg:flex lg:flex-col lg:justify-between"
          >
            <img
              src="/images/shopper-editorial.jpg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-22 mix-blend-luminosity"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy via-navy/75 to-navy/50"
            />

            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-green/40 bg-green/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-green">
                <span className="size-1.5 rounded-full bg-green" />
                Passwordless Member Access
              </span>
              <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-white">
                South Africa’s accredited personal shopper standard.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
                Start your verification application or resume where you left off. Your member account unlocks once an
                officer approves your file.
              </p>
            </div>

            <div className="relative z-10 mt-10 grid grid-cols-2 gap-3">
              {JOURNEY_GATES.map((gate) => (
                <div
                  key={gate.num}
                  className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 backdrop-blur-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold tracking-widest text-green">
                      GATE {gate.num}
                    </span>
                    <Icon name="check" size={13} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">{gate.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/65">{gate.desc}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Right: Frosted Glass Passwordless OTP Card */}
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: EASE }}
            className="flex flex-col justify-center rounded-3xl border border-white/20 bg-white/94 p-8 text-navy shadow-[0_30px_90px_-20px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-10"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-navy/6 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-navy/70">
                <Icon name="lock" size={12} />
                {sent ? "Step 02 · Verify Code" : "Step 01 · Email OTP"}
              </span>
              <span className="text-xs font-medium text-navy/50">No password required</span>
            </div>

            {(signedOut || params.get("signedOut")) && !sent && (
              <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-green/30 bg-green/10 px-4 py-3 text-sm font-medium text-green-dark">
                <Icon name="check" size={16} />
                You’ve been signed out safely.
              </div>
            )}

            <AnimatePresence mode="wait">
              {!sent ? (
                <motion.div
                  key="step-email"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <h2 className="font-display text-3xl font-semibold tracking-tight text-navy">
                    Enter the Member Portal
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-navy/68">
                    New to PSASA or returning to your application? Enter your email and we’ll send a one-time 6-digit
                    code.
                  </p>

                  {error && (
                    <div
                      role="alert"
                      className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                    >
                      <strong className="font-semibold">We couldn’t send a code.</strong> {error}
                    </div>
                  )}

                  <form onSubmit={requestCode} noValidate className="mt-6 space-y-5">
                    <div>
                      <label htmlFor="member-email" className="block text-xs font-bold uppercase tracking-[0.12em] text-navy/70">
                        Email address
                      </label>
                      <div className="relative mt-2">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy/40">
                          <Icon name="mail" size={17} />
                        </span>
                        <input
                          id="member-email"
                          type="email"
                          autoComplete="email"
                          autoFocus
                          placeholder="you@example.co.za"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (fieldError.email) setFieldError({});
                          }}
                          className={`w-full rounded-2xl border bg-white py-3.5 pl-11 pr-4 text-sm text-navy outline-none transition placeholder:text-navy/35 focus:ring-4 ${
                            fieldError.email
                              ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                              : "border-navy/15 focus:border-green focus:ring-green/15"
                          }`}
                          required
                        />
                      </div>
                      {fieldError.email && <p className="mt-1.5 text-xs font-medium text-red-600">{fieldError.email}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={busy}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-green px-6 py-3.5 text-sm font-semibold text-white shadow-[0_14px_32px_-10px_rgba(24,162,105,0.65)] transition hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? "Sending one-time code…" : "Send one-time code"}
                      {!busy && <Icon name="arrow" size={16} />}
                    </button>
                  </form>

                  <div className="mt-7 rounded-2xl border border-navy/10 bg-sand/45 p-4 text-xs leading-relaxed text-navy/75">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-navy text-white">
                        <Icon name="shield" size={13} />
                      </span>
                      <div>
                        <p className="font-semibold text-navy">Application-first verification</p>
                        <p className="mt-0.5 text-navy/65">
                          First-time emails automatically open a new application. Account features unlock once PSASA
                          approves your file.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step-otp"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <h2 className="font-display text-3xl font-semibold tracking-tight text-navy">Check your inbox</h2>
                  <p className="mt-2 text-sm leading-relaxed text-navy/68">
                    Enter the 6-digit code sent to <strong className="text-navy">{sent.destination}</strong>. Expires at{" "}
                    <span className="font-medium text-navy">{expiryTime(sent.expiresAt)}</span>.
                  </p>

                  {sent.devCode && (
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-green/30 bg-green-soft px-4 py-2.5 text-xs text-green-dark">
                      <span>
                        Dev code: <strong className="font-mono tracking-widest">{sent.devCode}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => fillDevCode(sent.devCode!)}
                        className="rounded-full bg-green px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-green-dark"
                      >
                        Auto-fill
                      </button>
                    </div>
                  )}

                  {error && (
                    <div
                      role="alert"
                      className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                    >
                      <strong className="font-semibold">That didn’t work.</strong> {error}
                    </div>
                  )}

                  <form onSubmit={submitCode} noValidate className="mt-6 space-y-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.12em] text-navy/70">
                        6-digit verification code
                      </label>
                      <div className="mt-2.5 grid grid-cols-6 gap-2 sm:gap-2.5">
                        {digits.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => {
                              otpRefs.current[index] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            autoComplete={index === 0 ? "one-time-code" : "off"}
                            maxLength={6}
                            aria-label={`Digit ${index + 1}`}
                            value={digit}
                            onChange={(e) => handleDigitChange(index, e.target.value)}
                            onKeyDown={(e) => handleDigitKeyDown(index, e)}
                            onPaste={handleDigitPaste}
                            className={`h-13 w-full rounded-2xl border bg-white text-center font-mono text-xl font-bold text-navy outline-none transition focus:ring-4 sm:h-14 ${
                              fieldError.code
                                ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                                : "border-navy/15 focus:border-green focus:ring-green/15"
                            }`}
                          />
                        ))}
                      </div>
                      {fieldError.code && <p className="mt-2 text-xs font-medium text-red-600">{fieldError.code}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={busy}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-green px-6 py-3.5 text-sm font-semibold text-white shadow-[0_14px_32px_-10px_rgba(24,162,105,0.65)] transition hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? "Verifying…" : "Verify & continue"}
                      {!busy && <Icon name="arrow" size={16} />}
                    </button>
                  </form>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-navy/10 pt-5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={switchEmail}
                      className="text-navy/65 transition hover:text-navy"
                    >
                      ← Use a different email
                    </button>
                    <button
                      type="button"
                      onClick={() => void requestCode()}
                      disabled={cooldown > 0 || busy}
                      className="text-green-dark transition hover:text-green disabled:cursor-not-allowed disabled:text-navy/40"
                    >
                      {cooldown > 0 ? `Resend code in ${cooldown}s` : "Send a new code"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </div>
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 pb-6 text-xs text-white/45">
        <span>Personal Shoppers Association of South Africa</span>
        <Link to="/" className="transition hover:text-white/80">
          Back to home
        </Link>
      </footer>
    </div>
  );
}
