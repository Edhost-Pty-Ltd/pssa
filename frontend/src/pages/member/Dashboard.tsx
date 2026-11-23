import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { addChannel, confirmChannel } from "../../api/documents";
import {
  getApplication,
  getProfile,
  submitApplication,
  updateProfile,
  type ApplicationOverview,
  type Channel,
  type MemberProfile,
  type StepKey,
} from "../../api/member";
import { Icon, type IconName } from "../../components/Icon";
import { APPLICATION_STATUS, Button, ButtonLink, ErrorState, LoadingState, Notice, Status } from "../../components/ui";
import { useAuth } from "../../context/auth-context";
import { ApiError, errorMessage } from "../../lib/api";

const EASE = [0.22, 1, 0.36, 1] as const;

const STEP_ICON: Record<StepKey, IconName> = {
  profile: "user",
  documents: "shield",
  tutorials: "play",
  assessment: "book",
  review: "eye",
  certified: "badge",
};

const STEP_LINK: Partial<Record<StepKey, string>> = {
  profile: "/member/profile",
  documents: "/member/verification",
  tutorials: "/member/tutorials",
  assessment: "/member/assessment",
  certified: "/member/certificate",
};

const STEP_WHY: Record<StepKey, string> = {
  profile: "Your name, trading name, city, and scope are what customers see when they check the live PSASA register.",
  documents: "We verify your SA ID or passport, address, bank confirmation, and channel ownership privately so customers never have to.",
  tutorials: "Short conduct lessons prepared by PSASA so every verified personal shopper shares the same customer-care standard.",
  assessment: "A timed 30-question conduct check (80% pass mark) before your file enters human verification review.",
  review: "A PSASA verification officer checks your documents and assessment before activating your public certificate.",
  certified: "Your live certificate and QR verification link are active—customers can confirm your status in seconds.",
};

function greeting() {
  const hour = Number(new Date().toLocaleString("en-ZA", { hour: "numeric", hour12: false, timeZone: "Africa/Johannesburg" }));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; app: ApplicationOverview; profile: MemberProfile | null }
  | { kind: "not_available" }
  | { kind: "error"; message: string };

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [selectedStep, setSelectedStep] = useState<StepKey | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getApplication(controller.signal), getProfile(controller.signal).catch(() => null)])
      .then(([app, profRes]) => {
        setState({ kind: "ready", app, profile: profRes?.profile ?? null });
        const next = app.progress.steps.find((s) => s.state !== "complete");
        setSelectedStep((prev) => prev ?? next?.key ?? "certified");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 404) setState({ kind: "not_available" });
        else setState({ kind: "error", message: errorMessage(err) });
      });
    return () => controller.abort();
  }, [attempt]);

  const reload = () => {
    setState({ kind: "loading" });
    setAttempt((n) => n + 1);
    void refresh();
  };

  const firstName = user?.firstName?.trim();

  if (state.kind === "loading") return <LoadingState rows={3} label="Loading your verification application" />;
  if (state.kind === "error") return <ErrorState title="We couldn't load your application" text={state.message} onRetry={reload} />;
  if (state.kind === "not_available") {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl bg-gradient-to-br from-navy via-navy-2 to-navy-3 p-8 text-white shadow-2xl sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-green">Step 1 of 6</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
          {firstName ? `${greeting()}, ${firstName}.` : "Welcome to PSASA."}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-white/75">
          Let's build your verified personal shopper application step by step. Your progress saves automatically so you can pause and continue anytime.
        </p>
        <div className="mt-7">
          <ButtonLink to="/member/profile" variant="green" iconRight="arrow">
            Start your application
          </ButtonLink>
        </div>
      </div>
    );
  }

  const { app, profile } = state;
  const activeStepKey = selectedStep ?? app.progress.steps.find((s) => s.state !== "complete")?.key ?? "certified";

  return (
    <ApplicationWizard
      firstName={firstName}
      app={app}
      profile={profile}
      activeStepKey={activeStepKey}
      onSelectStep={setSelectedStep}
      onReload={reload}
    />
  );
}

function ApplicationWizard({
  firstName,
  app,
  profile,
  activeStepKey,
  onSelectStep,
  onReload,
}: {
  firstName?: string;
  app: ApplicationOverview;
  profile: MemberProfile | null;
  activeStepKey: StepKey;
  onSelectStep: (key: StepKey) => void;
  onReload: () => void;
}) {
  const { application, progress } = app;
  const pct = Math.round(Math.min(100, Math.max(0, progress.percent)));
  const activeIndex = Math.max(0, progress.steps.findIndex((s) => s.key === activeStepKey));
  const currentStep = progress.steps[activeIndex] ?? progress.steps[0];
  const completedCount = progress.steps.filter((s) => s.state === "complete").length;
  const isCertified = application.status === "approved" && progress.steps.every((s) => s.state === "complete");

  const mp = profile?.memberProfile;
  const previewName = [mp?.firstName, mp?.lastName].filter(Boolean).join(" ") || firstName || "Your Name";
  const previewTrading = mp?.tradingName || "Your Trading Name";
  const previewScope = mp?.scope || "Personal shopping & sourcing";
  const previewCity = mp?.city || "South Africa";
  const confirmedChannels = (mp?.channels ?? []).filter((c) => c.status === "confirmed");

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-navy via-navy-2 to-navy-3 p-7 text-white shadow-[0_30px_80px_-28px_rgba(11,32,55,0.65)] sm:p-10"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-green/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-sand/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-green backdrop-blur-md">
                <span className="size-2 rounded-full bg-green" />
                {isCertified ? "Verified PSASA Member" : "Become a Verified Shopper"}
              </span>
              <Status of={APPLICATION_STATUS} value={application.status} />
            </div>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-tight text-white sm:text-5xl">
              {isCertified
                ? `You're verified, ${firstName || "member"}.`
                : firstName
                  ? `${greeting()}, ${firstName}.`
                  : "Your PSASA application."}
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-white/75">
              {isCertified
                ? "Your public certificate and register listing are live. Manage renewals, downloads, and status checks below."
                : "Complete each milestone at your own pace. Everything saves automatically so you can pick up right where you left off."}
            </p>
          </div>

          <div className="min-w-[230px] rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Completion</span>
              <strong className="font-display text-3xl font-bold text-green">{pct}%</strong>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, ease: EASE }}
                className="h-full rounded-full bg-gradient-to-r from-green to-[#6ee7b7]"
              />
            </div>
            <p className="mt-2 text-xs text-white/70">
              {completedCount} of {progress.steps.length} milestones complete
            </p>
          </div>
        </div>

        <ol className="relative z-10 mt-8 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-6" aria-label="Application steps">
          {progress.steps.map((step, i) => {
            const done = step.state === "complete";
            const selected = step.key === activeStepKey;
            const locked = step.state === "locked";
            return (
              <li key={step.key}>
                <button
                  type="button"
                  onClick={() => onSelectStep(step.key)}
                  className={`flex h-full w-full flex-col justify-between rounded-2xl border p-3.5 text-left transition ${
                    selected
                      ? "border-green bg-white text-navy shadow-lg"
                      : done
                        ? "border-green/45 bg-green/15 text-white hover:bg-green/25"
                        : "border-white/15 bg-white/5 text-white/75 hover:bg-white/10"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`flex size-8 items-center justify-center rounded-xl text-xs font-bold ${
                        selected || done ? "bg-green text-white" : "bg-white/10 text-white/75"
                      }`}
                    >
                      <Icon name={done ? "check" : locked ? "lock" : STEP_ICON[step.key]} size={15} />
                    </span>
                    <span className={`text-[10.5px] font-bold uppercase tracking-[0.14em] ${selected ? "text-green-dark" : "text-white/55"}`}>
                      0{i + 1}
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className={`text-sm font-semibold leading-snug ${selected ? "text-navy" : "text-white"}`}>{step.label}</p>
                    <p className={`mt-1 line-clamp-1 text-xs ${selected ? "text-muted" : "text-white/65"}`}>{step.detail}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </motion.section>

      <div className="grid gap-8 lg:grid-cols-[1.35fr_0.85fr] lg:items-start">
        <div className="space-y-6">
          {progress.actions.length > 0 && (
            <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-[var(--amber-soft)] text-[#9a6700]">
                  <Icon name="warning" size={20} />
                </span>
                <div>
                  <h2 className="font-display text-xl font-semibold text-navy">Attention needed</h2>
                  <p className="text-sm text-muted">Resolve these items so your verification stays on track.</p>
                </div>
              </div>
              <div className="mt-4 space-y-2.5">
                {progress.actions.map((item) => {
                  const link = STEP_LINK[item.step];
                  return (
                    <div key={`${item.step}-${item.title}`} className="flex flex-col justify-between gap-3 rounded-2xl border border-line bg-soft/60 p-4 sm:flex-row sm:items-center">
                      <div>
                        <p className="font-semibold text-navy">{item.title}</p>
                        {item.detail && <p className="mt-0.5 text-sm text-muted">{item.detail}</p>}
                      </div>
                      {link && (
                        <ButtonLink to={link} variant="green" iconRight="arrow">
                          Fix now
                        </ButtonLink>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStepKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="rounded-[28px] border border-line/80 bg-white p-6 shadow-[0_20px_50px_-24px_rgba(11,32,55,0.16)] sm:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-dark">
                    Step 0{activeIndex + 1} of 0{progress.steps.length}
                  </p>
                  <h2 className="mt-1 font-display text-3xl font-semibold text-navy">{currentStep.label}</h2>
                </div>
                <span className="rounded-full bg-green-soft px-3.5 py-1 text-xs font-semibold text-green-dark">
                  {currentStep.state === "complete" ? "Completed" : currentStep.detail}
                </span>
              </div>

              <p className="mt-5 rounded-2xl bg-sand/45 px-4 py-3 text-sm text-navy/90">
                <strong>Why we ask for this:</strong> {STEP_WHY[activeStepKey]}
              </p>

              <div className="mt-6">
                {activeStepKey === "profile" && (
                  <InlineProfileStep
                    profile={profile}
                    onSaved={() => {
                      onReload();
                      onSelectStep("documents");
                    }}
                  />
                )}
                {activeStepKey === "documents" && (
                  <InlineVerificationStep
                    profile={profile}
                    onUpdated={onReload}
                    onContinue={() => onSelectStep("tutorials")}
                  />
                )}
                {activeStepKey === "tutorials" && (
                  <StepLaunchPanel
                    title="Watch PSASA conduct tutorials"
                    description="Complete every active conduct lesson so you're ready for the verification assessment. Progress saves automatically as you watch."
                    ctaLabel="Open tutorial player"
                    to="/member/tutorials"
                    secondaryLabel="Next: Assessment"
                    onSecondary={() => onSelectStep("assessment")}
                  />
                )}
                {activeStepKey === "assessment" && (
                  <StepLaunchPanel
                    title="Complete the conduct assessment"
                    description="30 questions in 45 minutes. You need 80% overall and every critical customer-protection question correct."
                    ctaLabel="Open assessment"
                    to="/member/assessment"
                    secondaryLabel="Next: Submit & Review"
                    onSecondary={() => onSelectStep("review")}
                  />
                )}
                {activeStepKey === "review" && (
                  <InlineSubmitStep app={app} onSubmitted={onReload} />
                )}
                {activeStepKey === "certified" && (
                  <StepLaunchPanel
                    title={isCertified ? "Your PSASA certificate is live" : "Certificate & public badge"}
                    description={
                      isCertified
                        ? "Download your official QR certificate PDF or check your annual renewal status."
                        : "Your live certificate and QR verification link are issued automatically once all four gates are approved."
                    }
                    ctaLabel="View certificate & QR"
                    to="/member/certificate"
                    secondaryLabel="Check renewal status"
                    secondaryTo="/member/renewal"
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-8">
          <div className="overflow-hidden rounded-[28px] border border-navy/15 bg-gradient-to-b from-navy via-navy-2 to-navy p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-green">Public Register Preview</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green/20 px-2.5 py-1 text-[11px] font-semibold text-green">
                <span className="size-1.5 rounded-full bg-green" /> {isCertified ? "Live" : "Preview"}
              </span>
            </div>

            <div className="mt-5 flex items-center gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-green/20 font-display text-xl font-bold text-green">
                {previewName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() ?? "")
                  .join("") || "P"}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-semibold text-white">{previewName}</p>
                <p className="truncate text-sm text-white/70">{previewTrading}</p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5 border-t border-white/10 pt-4 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-white/55">Scope</span>
                <span className="text-right font-medium text-white">{previewScope}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-white/55">City</span>
                <span className="text-right font-medium text-white">{previewCity}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-white/55">Confirmed channels</span>
                <span className="text-right font-medium text-green">{confirmedChannels.length} verified</span>
              </div>
            </div>

            <p className="mt-5 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-white/65">
              ID numbers, bank confirmations, and home addresses are never published on the public register.
            </p>
          </div>

          <div className="rounded-3xl border border-sand-dark/60 bg-sand/45 p-6">
            <h3 className="font-display text-lg font-semibold text-navy">Need a break?</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/75">
              Every field you save is stored safely in PostgreSQL. Sign back in anytime with your email to continue from this exact step.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/#membership" className="text-xs font-bold text-green-dark underline">
                Read the four gates
              </Link>
              <span className="text-muted">·</span>
              <Link to="/policies/verification" className="text-xs font-bold text-green-dark underline">
                Verification Standard
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function InlineProfileStep({ profile, onSaved }: { profile: MemberProfile | null; onSaved: () => void }) {
  const mp = profile?.memberProfile;
  const [firstName, setFirstName] = useState(mp?.firstName ?? "");
  const [lastName, setLastName] = useState(mp?.lastName ?? "");
  const [tradingName, setTradingName] = useState(mp?.tradingName ?? "");
  const [scope, setScope] = useState(mp?.scope ?? "");
  const [city, setCity] = useState(mp?.city ?? "");
  const [phone, setPhone] = useState(mp?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        tradingName: tradingName.trim() || null,
        scope: scope.trim() || null,
        city: city.trim() || null,
        phone: phone.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Notice tone="red" title="Could not save profile">{error}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold text-navy">First name</span>
          <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 outline-none focus:border-green" />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-navy">Last name</span>
          <input required value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 outline-none focus:border-green" />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-navy">Trading / business name</span>
          <input value={tradingName} onChange={(e) => setTradingName(e.target.value)} placeholder="e.g. Curated by Lerato" className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 outline-none focus:border-green" />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-navy">Shopping scope / category</span>
          <input value={scope} onChange={(e) => setScope(e.target.value)} placeholder="e.g. Luxury fashion & footwear" className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 outline-none focus:border-green" />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-navy">City</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Johannesburg" className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 outline-none focus:border-green" />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-navy">Phone number</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27 82 000 0000" className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 outline-none focus:border-green" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" variant="green" iconRight="arrow" loading={busy}>
          Save &amp; continue
        </Button>
        <ButtonLink to="/member/profile" variant="outline">
          Full identity &amp; address form
        </ButtonLink>
      </div>
    </form>
  );
}

function InlineVerificationStep({
  profile,
  onUpdated,
  onContinue,
}: {
  profile: MemberProfile | null;
  onUpdated: () => void;
  onContinue: () => void;
}) {
  const channels = profile?.memberProfile?.channels ?? [];
  const docs = profile?.documents ?? [];
  const [platform, setPlatform] = useState("instagram");
  const [handle, setHandle] = useState("");
  const [pendingChannel, setPendingChannel] = useState<Channel | null>(null);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAddChannel(e: FormEvent) {
    e.preventDefault();
    if (!handle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = (await addChannel(platform, handle.trim())) as { channel: Channel; devCode?: string };
      setPendingChannel(res.channel);
      setDevCode(res.devCode ?? null);
      setHandle("");
      onUpdated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmCode(e: FormEvent) {
    e.preventDefault();
    if (!pendingChannel) return;
    setBusy(true);
    setError(null);
    try {
      await confirmChannel(pendingChannel.id, code.trim());
      setPendingChannel(null);
      setCode("");
      setDevCode(null);
      onUpdated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <Notice tone="red" title="Channel check failed">{error}</Notice>}

      <div className="rounded-2xl border border-line bg-soft/60 p-5">
        <h3 className="font-semibold text-navy">1. Confirm a trading channel</h3>
        <p className="mt-1 text-sm text-muted">Add the Instagram, TikTok, or Facebook page you trade on, then enter the 6-digit code emailed to you.</p>
        <form onSubmit={onAddChannel} className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm">
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="facebook">Facebook</option>
          </select>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@yourshopperhandle or https://..."
            className="flex-1 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-green"
          />
          <Button type="submit" variant="dark" loading={busy}>
            Send code
          </Button>
        </form>

        {pendingChannel && (
          <form onSubmit={onConfirmCode} className="mt-4 flex flex-col gap-2.5 rounded-xl border border-green/30 bg-green-soft/60 p-4 sm:flex-row sm:items-center">
            <div className="flex-1 text-sm text-navy">
              Enter the 6-digit code for <strong>{pendingChannel.value}</strong>
              {devCode && <span className="ml-2 rounded bg-white px-2 py-0.5 font-mono text-xs text-green-dark">Dev code: {devCode}</span>}
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              maxLength={6}
              className="w-36 rounded-xl border border-line bg-white px-3 py-2 font-mono text-sm outline-none focus:border-green"
            />
            <Button type="submit" variant="green" loading={busy}>
              Verify
            </Button>
          </form>
        )}

        {channels.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {channels.map((ch) => (
              <li key={ch.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-navy">
                <span className={`size-2 rounded-full ${ch.status === "confirmed" ? "bg-green" : "bg-amber-500"}`} />
                {ch.kind}: {ch.value}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-soft/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-navy">2. Verification documents ({docs.length} uploaded)</h3>
            <p className="mt-1 text-sm text-muted">Upload your ID, proof of residence, and bank confirmation letter.</p>
          </div>
          <ButtonLink to="/member/verification" variant="green" iconRight="arrow">
            Upload documents
          </ButtonLink>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" iconRight="chevron" onClick={onContinue}>
          Continue to tutorials
        </Button>
      </div>
    </div>
  );
}

function StepLaunchPanel({
  title,
  description,
  ctaLabel,
  to,
  secondaryLabel,
  secondaryTo,
  onSecondary,
}: {
  title: string;
  description: string;
  ctaLabel: string;
  to: string;
  secondaryLabel?: string;
  secondaryTo?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-2xl font-semibold text-navy">{title}</h3>
        <p className="mt-2 text-base leading-relaxed text-muted">{description}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <ButtonLink to={to} variant="green" iconRight="arrow">
          {ctaLabel}
        </ButtonLink>
        {secondaryLabel && secondaryTo && (
          <ButtonLink to={secondaryTo} variant="outline">
            {secondaryLabel}
          </ButtonLink>
        )}
        {secondaryLabel && onSecondary && (
          <Button variant="outline" iconRight="chevron" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

function InlineSubmitStep({ app, onSubmitted }: { app: ApplicationOverview; onSubmitted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { application, progress } = app;

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await submitApplication();
      onSubmitted();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {application.agreementAcceptedAt ? (
        <Notice
          tone="green"
          title={`Membership agreement accepted on ${new Date(application.agreementAcceptedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}`}
        >
          Version {application.agreementVersion}
        </Notice>
      ) : (
        <Notice tone="blue" title="Membership agreement">
          Accept the membership agreement on your Verification page before submitting.
        </Notice>
      )}
      {error && <Notice tone="red" title="We couldn't submit your application">{error}</Notice>}
      {application.status === "draft" || application.status === "needs_info" ? (
        <Button variant="green" iconRight="arrow" disabled={!progress.canSubmit} loading={busy} onClick={() => void onSubmit()}>
          Submit application for review
        </Button>
      ) : (
        <p className="text-sm font-medium text-muted">
          Your application ({application.number}) is currently <strong>{application.status.replace(/_/g, " ")}</strong>.
        </p>
      )}
    </div>
  );
}
