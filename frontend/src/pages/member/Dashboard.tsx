import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ACCEPT_ATTRIBUTE,
  addChannel,
  confirmChannel,
  uploadDocument,
  type DocumentType,
} from "../../api/documents";
import {
  getPracticalState,
  reportPracticalTutorial,
  type PracticalState,
} from "../../api/practicalAssessment";
import {
  getApplication,
  getProfile,
  reapplyApplication,
  submitApplication,
  updateProfile,
  type ApplicationOverview,
  type Channel,
  type MemberProfile,
  type StepKey,
} from "../../api/member";
import { Icon, type IconName } from "../../components/Icon";
import { EntranceAutomatedTest } from "./Assessment";
import { useAuth } from "../../context/auth-context";
import { api, errorMessage } from "../../lib/api";

const EASE = [0.22, 1, 0.36, 1] as const;

const STEP_META: Record<StepKey, { icon: IconName; cover: string; subtitle: string }> = {
  profile: {
    icon: "user",
    cover: "/images/landing/shopper-editorial.jpg",
    subtitle: "Your name, trading identity, shopping scope, and city on the public register.",
  },
  documents: {
    icon: "shield",
    cover: "/images/landing/verification-officer.jpg",
    subtitle: "Confirm your trading channels and upload private verification documents.",
  },
  tutorials: {
    icon: "play",
    cover: "/images/landing/sourcing-market.jpg",
    subtitle: "Watch the 1-minute practical assessment tutorial before starting your assignment.",
  },
  assessment: {
    icon: "book",
    cover: "/images/landing/customer-phone.jpg",
    subtitle: "Complete one fictional shopping simulation track matching your service category.",
  },
  review: {
    icon: "eye",
    cover: "/images/landing/verification-officer.jpg",
    subtitle: "Accept the membership agreement and submit your file for PSASA officer review.",
  },
  certified: {
    icon: "badge",
    cover: "/images/landing/delivery-handover.jpg",
    subtitle: "Your live certificate, QR verification link, and annual renewal status.",
  },
};

function greeting() {
  const hour = Number(new Date().toLocaleString("en-ZA", { hour: "numeric", hour12: false, timeZone: "Africa/Johannesburg" }));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; app: ApplicationOverview; profile: MemberProfile | null }
  | { kind: "error"; message: string };

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getApplication(controller.signal), getProfile(controller.signal).catch(() => null)])
      .then(([app, profRes]) => {
        setState({ kind: "ready", app, profile: profRes?.profile ?? null });
        const firstIncomplete = app.progress.steps.findIndex((s) => s.state !== "complete");
        setActiveIndex((prev) => prev ?? (firstIncomplete === -1 ? app.progress.steps.length - 1 : firstIncomplete));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState({ kind: "error", message: errorMessage(err) });
      });
    return () => controller.abort();
  }, [attempt]);

  const reload = (advanceTo?: number) => {
    if (advanceTo !== undefined) setActiveIndex(advanceTo);
    setAttempt((n) => n + 1);
    void refresh();
  };

  if (state.kind === "loading") {
    return (
      <div className="mx-auto max-w-4xl rounded-[32px] border border-white/15 bg-white/[0.06] p-10 text-center backdrop-blur-2xl">
        <div className="mx-auto size-10 animate-spin rounded-full border-2 border-white/20 border-t-green" />
        <p className="mt-4 text-sm text-white/75">Preparing your PSASA application album…</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="mx-auto max-w-2xl rounded-[32px] border border-red-400/30 bg-red-950/40 p-8 text-white backdrop-blur-2xl">
        <h2 className="font-display text-2xl font-semibold text-white">We couldn't load your application</h2>
        <p className="mt-2 text-sm text-white/75">{state.message}</p>
        <button
          type="button"
          onClick={() => reload()}
          className="mt-5 rounded-full bg-green px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-dark"
        >
          Try again
        </button>
      </div>
    );
  }

  const { app, profile } = state;
  const steps = app.progress.steps;
  const firstIncomplete = steps.findIndex((s) => s.state !== "complete");
  const lastUnlocked = steps.reduce((acc, s, idx) => (s.state !== "locked" ? idx : acc), 0);
  const highestUnlocked = Math.max(firstIncomplete === -1 ? steps.length - 1 : firstIncomplete, lastUnlocked);
  const currentIdx = Math.min(activeIndex ?? (firstIncomplete === -1 ? steps.length - 1 : firstIncomplete), highestUnlocked);

  return (
    <AlbumApplication
      firstName={user?.firstName?.trim()}
      app={app}
      profile={profile}
      currentIdx={currentIdx}
      highestUnlocked={highestUnlocked}
      justSubmitted={justSubmitted}
      onSelectIndex={(idx) => {
        if (idx <= highestUnlocked) setActiveIndex(idx);
      }}
      onReload={reload}
      onApplicationSubmitted={() => {
        setJustSubmitted(true);
        reload();
      }}
    />
  );
}

function AlbumApplication({
  firstName,
  app,
  profile,
  currentIdx,
  highestUnlocked,
  justSubmitted,
  onSelectIndex,
  onReload,
  onApplicationSubmitted,
}: {
  firstName?: string;
  app: ApplicationOverview;
  profile: MemberProfile | null;
  currentIdx: number;
  highestUnlocked: number;
  justSubmitted: boolean;
  onSelectIndex: (idx: number) => void;
  onReload: (advanceTo?: number) => void;
  onApplicationSubmitted: () => void;
}) {
  const { application, progress } = app;
  const steps = progress.steps;
  const currentStep = steps[currentIdx];
  const pct = Math.round(Math.min(100, Math.max(0, progress.percent)));
  const prevStep = currentIdx > 0 ? steps[currentIdx - 1] : null;
  const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;
  const nextLocked = currentIdx + 1 > highestUnlocked;

  const isApproved = application.status === "approved" || profile?.memberProfile?.memberStatus === "active";
  const isRejected = !isApproved && application.status === "rejected";
  const isUnderReview = !isApproved && (application.status === "submitted" || application.status === "under_review");

  const [showSteps, setShowSteps] = useState(false);
  const [showRejectionReason, setShowRejectionReason] = useState(true);
  const [reapplying, setReapplying] = useState(false);
  const [reapplyError, setReapplyError] = useState<string | null>(null);

  async function handleReapply() {
    setReapplying(true);
    setReapplyError(null);
    try {
      await reapplyApplication();
      setShowSteps(true);
      onReload(0);
    } catch (err) {
      setReapplyError(errorMessage(err));
    } finally {
      setReapplying(false);
    }
  }

  if (isApproved && !showSteps) {
    const mp = profile?.memberProfile;
    const fullName = [mp?.firstName, mp?.lastName].filter(Boolean).join(" ") || "Verified Personal Shopper";
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="relative overflow-hidden rounded-[32px] border border-green/35 bg-white/[0.08] p-8 shadow-[0_30px_90px_-24px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:p-10"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, #18a269 0%, transparent 70%)" }}
          />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-green/45 bg-green/20 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-green">
              <span className="size-2 rounded-full bg-green" />
              Approved · Active Personal Shopper
            </div>
            <button
              type="button"
              onClick={() => setShowSteps(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.08] px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md transition hover:border-green/50 hover:bg-white/15 hover:text-white"
            >
              <Icon name="eye" size={13} />
              Application status
            </button>
          </div>

          <h1 className="relative z-10 mt-5 font-display text-3xl font-semibold text-white sm:text-4xl">
            {fullName}
          </h1>
          <p className="relative z-10 mt-2 text-sm text-white/75 sm:text-base">
            {mp?.tradingName ? `${mp.tradingName} · ` : ""}
            {mp?.scope || "Accredited Personal Shopper"}
            {mp?.city ? ` · ${mp.city}` : ""}
          </p>

          <div className="relative z-10 mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { to: "/member/certificate", title: "Certificate & QR", desc: "Download PDF & public verification link", icon: "badge" as const },
              { to: "/member/renewal", title: "Annual Renewal", desc: "View validity & renewal status", icon: "clock" as const },
              { to: "/member/profile", title: "Shopper Profile", desc: "Manage your public register details", icon: "user" as const },
              { to: "/member/complaints", title: "Complaints & Appeals", desc: "View notices or respond to cases", icon: "shield" as const },
            ].map((item, idx) => (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.08 + idx * 0.05, ease: EASE }}
              >
                <Link
                  to={item.to}
                  className="group flex h-full flex-col justify-between rounded-2xl border border-white/15 bg-white/[0.05] p-4 transition hover:-translate-y-0.5 hover:border-green/50 hover:bg-white/[0.1]"
                >
                  <div>
                    <div className="flex size-9 items-center justify-center rounded-xl bg-green/20 text-green">
                      <Icon name={item.icon} size={16} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/65">{item.desc}</p>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-green transition group-hover:translate-x-0.5">
                    Open <Icon name="arrow" size={12} />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if ((isUnderReview || isRejected) && !showSteps) {
    const latestReview = application.latestReview ?? null;
    const statusLabel = isRejected
      ? "Rejected"
      : application.status === "under_review"
        ? "Pending · Under review"
        : justSubmitted
          ? "Review Submitted"
          : "Pending · Application review in progress";

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="relative overflow-hidden rounded-[32px] border border-white/15 bg-white/[0.07] p-8 shadow-[0_30px_90px_-24px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:p-10"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-25 blur-3xl"
            style={{
              background: isRejected
                ? "radial-gradient(circle, #ef4444 0%, transparent 70%)"
                : "radial-gradient(circle, #18a269 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                isRejected
                  ? "border-red-400/40 bg-red-500/15 text-red-200"
                  : "border-green/40 bg-green/15 text-green"
              }`}
            >
              <span
                className={`size-2 rounded-full ${
                  isRejected ? "bg-red-400" : "animate-pulse bg-green"
                }`}
              />
              {statusLabel}
            </div>

            <button
              type="button"
              onClick={() => setShowSteps(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.08] px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md transition hover:border-green/50 hover:bg-white/15 hover:text-white"
            >
              <Icon name="eye" size={13} />
              Application status
            </button>
          </div>

          <h1 className="relative z-10 mt-5 font-display text-3xl font-semibold text-white sm:text-4xl">
            {isRejected
              ? "Application not approved"
              : justSubmitted
                ? "Review Submitted"
                : "Application review in progress"}
          </h1>

          <p className="relative z-10 mt-3 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
            {isRejected
              ? "Your application was reviewed by a PSASA officer and was not approved at this time. Review the feedback below and apply again whenever you're ready."
              : justSubmitted
                ? "Your entire application, verification documents, and practical assessment have been submitted for review. You can now wait for your PSASA certificate — we will update your account as soon as an officer completes your review."
                : "Your application, verification documents, and practical assessment are currently being reviewed by a PSASA verification officer. Your certificate will unlock here automatically once approved."}
          </p>

          {/* 3-State Review Outcome Bar */}
          <div className="relative z-10 mt-6 grid grid-cols-3 gap-2.5">
            {[
              { key: "pending", label: "Pending", active: isUnderReview, tone: "green", icon: "clock" as const },
              { key: "approved", label: "Approved", active: false, tone: "green", icon: "check" as const },
              { key: "rejected", label: "Rejected", active: isRejected, tone: "red", icon: "flag" as const },
            ].map((item) => (
              <div
                key={item.key}
                className={`flex items-center justify-center gap-2 rounded-2xl border px-3.5 py-2.5 text-center text-xs font-semibold transition ${
                  item.active
                    ? item.tone === "red"
                      ? "border-red-400/50 bg-red-500/20 text-red-100 shadow-sm"
                      : "border-green/50 bg-green/20 text-white shadow-sm"
                    : "border-white/10 bg-white/[0.03] text-white/45"
                }`}
              >
                <Icon name={item.icon} size={13} />
                {item.label}
              </div>
            ))}
          </div>

          {!isRejected && (
            <div className="relative z-10 mt-5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
                <span>Submission progress</span>
                <span className="text-green">{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/15">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.75, ease: EASE }}
                  className="h-full rounded-full bg-gradient-to-r from-green to-[#6ee7b7]"
                />
              </div>
            </div>
          )}

          <div className="relative z-10 mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/12 bg-white/[0.05] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">Application</p>
              <p className="mt-1 font-mono text-sm font-semibold text-white">{application.number ?? "Submitted"}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/[0.05] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
                {isRejected ? "Reviewed" : "Progress"}
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {isRejected
                  ? latestReview?.createdAt
                    ? new Date(latestReview.createdAt).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Completed"
                  : `${pct}% Complete`}
              </p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/[0.05] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
                {isRejected ? "Outcome" : "Next milestone"}
              </p>
              <p className={`mt-1 text-sm font-semibold ${isRejected ? "text-red-300" : "text-green"}`}>
                {isRejected ? "Action available" : "PSASA Certificate"}
              </p>
            </div>
          </div>

          {isRejected && (
            <div className="relative z-10 mt-6 space-y-4">
              {reapplyError && (
                <div className="rounded-2xl border border-red-400/40 bg-red-950/50 p-4 text-sm text-red-100">
                  {reapplyError}
                </div>
              )}

              <AnimatePresence initial={false}>
                {showRejectionReason && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden rounded-2xl border border-red-400/30 bg-red-950/35 p-5"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-200">
                      Reviewer reason
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-white/90">
                      {latestReview?.reason ||
                        "No detailed reason was recorded. Please review your verification documents and practical assessment before applying again."}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={reapplying}
                  onClick={() => void handleReapply()}
                  className="inline-flex items-center gap-2 rounded-full bg-green px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_-10px_rgba(24,162,105,0.75)] transition hover:bg-green-dark disabled:opacity-60"
                >
                  {reapplying ? "Preparing new application…" : "Apply again"}
                  {!reapplying && <Icon name="arrow" size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectionReason((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/12"
                >
                  {showRejectionReason ? "Hide rejection reason" : "Review why it was rejected"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {(isApproved || isUnderReview || isRejected) && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2.5 backdrop-blur-xl">
          <span className="text-xs font-medium text-white/80">
            {isApproved
              ? "Your PSASA Personal Shopper Account is active."
              : isRejected
                ? "Application not approved — review feedback or apply again."
                : "Your application review is in progress."}
          </span>
          <button
            type="button"
            onClick={() => setShowSteps(false)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-green-dark"
          >
            ← {isApproved ? "Back to shopper account" : "Back to review status"}
          </button>
        </div>
      )}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-green">
            PSASA Shopper Application · {application.number}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-5xl">
            {firstName ? `${greeting()}, ${firstName}.` : "Become a Verified Shopper."}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            Save &amp; continue through each numbered session in order. Your progress is persisted automatically at every step.
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/[0.07] px-5 py-3.5 backdrop-blur-xl">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">Progress</p>
            <p className="font-display text-2xl font-bold text-green">{pct}%</p>
          </div>
          <div className="h-10 w-px bg-white/15" />
          <div className="w-32">
            <div className="h-2 overflow-hidden rounded-full bg-white/15">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, ease: EASE }}
                className="h-full rounded-full bg-gradient-to-r from-green to-[#6ee7b7]"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-white/65">
              Session 0{currentIdx + 1} of 0{steps.length}
            </p>
          </div>
        </div>
      </div>

      {/* Numbered Album Rail */}
      <ol className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6" aria-label="Numbered application sessions">
        {steps.map((step, i) => {
          const done = step.state === "complete";
          const active = i === currentIdx;
          const locked = i > highestUnlocked;
          return (
            <li key={step.key}>
              <button
                type="button"
                disabled={locked}
                onClick={() => onSelectIndex(i)}
                className={`group flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left backdrop-blur-xl transition ${
                  active
                    ? "border-green bg-green/20 text-white shadow-[0_12px_32px_-10px_rgba(24,162,105,0.65)]"
                    : done
                      ? "border-white/20 bg-white/[0.08] text-white hover:border-green/50"
                      : locked
                        ? "cursor-not-allowed border-white/10 bg-white/[0.03] text-white/40"
                        : "border-white/15 bg-white/[0.06] text-white/80 hover:bg-white/[0.12]"
                }`}
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                    done
                      ? "bg-green text-white"
                      : active
                        ? "bg-white text-navy"
                        : "bg-white/10 text-white/65"
                  }`}
                >
                  {done ? <Icon name="check" size={14} /> : locked ? <Icon name="lock" size={13} /> : `0${i + 1}`}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{step.label}</p>
                  <p className="truncate text-[10.5px] opacity-70">
                    {done ? "Saved" : locked ? "Locked" : active ? "Current" : "Unlocked"}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Interactive Album Carousel Stage */}
      <div className="relative flex items-stretch gap-4">
        {/* Previous peeking album card */}
        <button
          type="button"
          disabled={!prevStep}
          onClick={() => prevStep && onSelectIndex(currentIdx - 1)}
          aria-label={prevStep ? `Go back to ${prevStep.label}` : "First session"}
          className={`hidden w-24 shrink-0 flex-col justify-between rounded-[28px] border border-white/10 bg-white/[0.04] p-4 text-left backdrop-blur-xl transition lg:flex ${
            prevStep ? "opacity-60 hover:scale-[0.98] hover:border-white/25 hover:opacity-90" : "pointer-events-none opacity-0"
          }`}
        >
          <span className="font-display text-2xl font-bold text-white/40">0{currentIdx}</span>
          <div>
            <Icon name="chevron" size={18} />
            <p className="mt-2 line-clamp-2 text-xs font-semibold text-white/75">{prevStep?.label}</p>
          </div>
        </button>

        {/* Active Center Album Card */}
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.key}
              initial={{ opacity: 0, x: 28, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -28, scale: 0.98 }}
              transition={{ duration: 0.38, ease: EASE }}
              className="overflow-hidden rounded-[32px] border border-white/20 bg-white/[0.08] shadow-[0_40px_100px_-28px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
            >
              <div className="relative h-44 overflow-hidden sm:h-52">
                <img
                  src={STEP_META[currentStep.key].cover}
                  alt=""
                  className="h-full w-full object-cover object-center opacity-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/55 to-transparent" />
                <div className="absolute inset-x-6 bottom-5 flex flex-wrap items-end justify-between gap-4 sm:inset-x-8">
                  <div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-navy/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-green backdrop-blur-md">
                      <Icon name={STEP_META[currentStep.key].icon} size={13} />
                      Session 0{currentIdx + 1} of 0{steps.length}
                    </span>
                    <h2 className="mt-2.5 font-display text-3xl font-semibold text-white sm:text-4xl">
                      {currentStep.label}
                    </h2>
                  </div>
                  <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
                    {currentStep.state === "complete" ? "Completed" : currentStep.detail}
                  </span>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <p className="mb-6 text-sm leading-relaxed text-white/75 sm:text-base">
                  {STEP_META[currentStep.key].subtitle}
                </p>

                {currentStep.key === "profile" && (
                  <SessionProfile
                    profile={profile}
                    onSaved={() => onReload(1)}
                  />
                )}
                {currentStep.key === "documents" && (
                  <SessionVerification
                    profile={profile}
                    stepComplete={currentStep.state === "complete"}
                    onUpdated={() => onReload()}
                    onContinue={() => onReload(2)}
                  />
                )}
                {currentStep.key === "tutorials" && (
                  <SessionTutorials
                    stepComplete={currentStep.state === "complete"}
                    onContinue={() => onReload(3)}
                  />
                )}
                {currentStep.key === "assessment" && (
                  <SessionAssessment
                    stepComplete={currentStep.state === "complete"}
                    onSubmitted={() => onReload(4)}
                    onContinue={() => onReload(4)}
                  />
                )}
                {currentStep.key === "review" && (
                  <SessionAgreementSubmit
                    app={app}
                    onSubmitted={onApplicationSubmitted}
                  />
                )}
                {currentStep.key === "certified" && (
                  <SessionCertified app={app} profile={profile} />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next peeking album card */}
        <button
          type="button"
          disabled={!nextStep || nextLocked}
          onClick={() => nextStep && !nextLocked && onSelectIndex(currentIdx + 1)}
          aria-label={nextStep ? `Next: ${nextStep.label}` : "Final session"}
          className={`hidden w-24 shrink-0 flex-col justify-between rounded-[28px] border border-white/10 bg-white/[0.04] p-4 text-left backdrop-blur-xl transition lg:flex ${
            !nextStep
              ? "pointer-events-none opacity-0"
              : nextLocked
                ? "cursor-not-allowed opacity-35"
                : "opacity-65 hover:scale-[0.98] hover:border-green/50 hover:opacity-95"
          }`}
        >
          <span className="font-display text-2xl font-bold text-white/40">0{currentIdx + 2}</span>
          <div>
            <Icon name={nextLocked ? "lock" : "arrow"} size={18} />
            <p className="mt-2 line-clamp-2 text-xs font-semibold text-white/75">{nextStep?.label}</p>
          </div>
        </button>
      </div>
    </div>
  );
}

/* ---------------- Session 01: Profile ---------------- */

function SessionProfile({ profile, onSaved }: { profile: MemberProfile | null; onSaved: () => void }) {
  const mp = profile?.memberProfile;
  const [firstName, setFirstName] = useState(mp?.firstName ?? "");
  const [lastName, setLastName] = useState(mp?.lastName ?? "");
  const [tradingName, setTradingName] = useState(mp?.tradingName ?? "");
  const [scope, setScope] = useState(mp?.scope ?? "");
  const [city, setCity] = useState(mp?.city ?? "");
  const [phone, setPhone] = useState(mp?.phone ?? "");
  const [identityType, setIdentityType] = useState<"sa_id" | "passport">(mp?.identityType ?? "sa_id");
  const [idNumber, setIdNumber] = useState("");
  const [physicalAddress, setPhysicalAddress] = useState(mp?.physicalAddress ?? "");
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
        physicalAddress: physicalAddress.trim() || null,
        ...(idNumber.trim() ? { identityType, idNumber: idNumber.trim() } : mp?.identityType ? {} : { identityType }),
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <div className="rounded-2xl border border-red-400/40 bg-red-950/50 p-4 text-sm text-red-100">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <GlassInput label="First name *" required value={firstName} onChange={setFirstName} />
        <GlassInput label="Last name *" required value={lastName} onChange={setLastName} />
        <GlassInput label="Trading / business name *" required value={tradingName} onChange={setTradingName} placeholder="e.g. Curated by Lerato" />
        <GlassInput label="Shopping scope *" required value={scope} onChange={setScope} placeholder="e.g. Luxury fashion & footwear" />
        <GlassInput label="City *" required value={city} onChange={setCity} placeholder="e.g. Johannesburg" />
        <GlassInput label="Phone number *" required value={phone} onChange={setPhone} placeholder="+27 82 000 0000" />
        <label className="block text-sm">
          <span className="font-semibold text-white/85">Identity type</span>
          <select
            value={identityType}
            onChange={(e) => setIdentityType(e.target.value as "sa_id" | "passport")}
            className="mt-1.5 w-full rounded-xl border border-white/15 bg-navy/70 px-3.5 py-2.5 text-white outline-none focus:border-green"
          >
            <option value="sa_id">South African ID</option>
            <option value="passport">Passport</option>
          </select>
        </label>
        <GlassInput
          label={mp?.idNumber ? `Identity number (saved: ${mp.idNumber})` : "Identity number *"}
          required={!mp?.idNumber}
          value={idNumber}
          onChange={setIdNumber}
          placeholder={mp?.idNumber ? "Leave blank to keep saved ID" : "13-digit SA ID or passport"}
        />
      </div>
      <GlassInput label="Physical address *" required value={physicalAddress} onChange={setPhysicalAddress} placeholder="Street address, suburb, postal code" />
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <p className="text-xs text-white/55">ID numbers and addresses stay private and are never shown on the public register.</p>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-green px-7 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_-10px_rgba(24,162,105,0.8)] transition hover:bg-green-dark disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save & continue to 02"} <Icon name="arrow" size={16} />
        </button>
      </div>
    </form>
  );
}

/* ---------------- Session 02: Channels & Documents ---------------- */

const REQUIRED_DOCS: { type: DocumentType; label: string }[] = [
  { type: "id_document", label: "ID or Passport copy" },
  { type: "proof_of_residence", label: "Proof of residence (≤ 3 months)" },
  { type: "bank_evidence", label: "Bank account confirmation" },
];

function SessionVerification({
  profile,
  stepComplete,
  onUpdated,
  onContinue,
}: {
  profile: MemberProfile | null;
  stepComplete: boolean;
  onUpdated: () => void;
  onContinue: () => void;
}) {
  const channels = profile?.memberProfile?.channels ?? [];
  const docs = profile?.documents ?? [];
  const [platform, setPlatform] = useState("instagram");
  const [handle, setHandle] = useState("");
  const [pending, setPending] = useState<Channel | null>(null);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<DocumentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onAddChannel(e: FormEvent) {
    e.preventDefault();
    if (!handle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = (await addChannel(platform, handle.trim())) as { channel: Channel; devCode?: string };
      setPending(res.channel);
      setDevCode(res.devCode ?? null);
      setHandle("");
      onUpdated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm(e: FormEvent) {
    e.preventDefault();
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      await confirmChannel(pending.id, code.trim());
      setPending(null);
      setCode("");
      setDevCode(null);
      onUpdated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(type: DocumentType, file: File | undefined) {
    if (!file) return;
    setUploading(type);
    setError(null);
    try {
      await uploadDocument(type, file);
      onUpdated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(null);
    }
  }

  const hasAllDocs = REQUIRED_DOCS.every((d) => docs.some((uploaded) => uploaded.type === d.type));
  const canProceed = stepComplete || hasAllDocs;

  return (
    <div className="space-y-6">
      {error && <div className="rounded-2xl border border-red-400/40 bg-red-950/50 p-4 text-sm text-red-100">{error}</div>}

      <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-5">
        <p className="text-sm font-semibold text-white">1. Trading channels <span className="text-xs font-normal text-white/55">(optional)</span></p>
        <form onSubmit={onAddChannel} className="mt-3 flex flex-col gap-2.5 sm:flex-row">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="rounded-xl border border-white/15 bg-navy/80 px-3 py-2.5 text-sm text-white"
          >
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="facebook">Facebook</option>
          </select>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@handle or https://..."
            className="flex-1 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/45 outline-none focus:border-green"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-navy transition hover:bg-green hover:text-white"
          >
            Send code
          </button>
        </form>

        {pending && (
          <form onSubmit={onConfirm} className="mt-3 flex flex-col gap-2.5 rounded-xl border border-green/40 bg-green/15 p-3.5 sm:flex-row sm:items-center">
            <div className="flex-1 text-xs text-white">
              Enter 6-digit code for <strong>{pending.value}</strong>
              {devCode && <span className="ml-2 rounded bg-navy px-2 py-0.5 font-mono text-green">Dev: {devCode}</span>}
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              placeholder="000000"
              className="w-32 rounded-xl border border-white/20 bg-navy/80 px-3 py-2 font-mono text-sm text-white outline-none focus:border-green"
            />
            <button type="submit" disabled={busy} className="rounded-xl bg-green px-4 py-2 text-xs font-semibold text-white">
              Verify
            </button>
          </form>
        )}

        {channels.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {channels.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs">
                <span className={`size-2 rounded-full ${c.status === "confirmed" ? "bg-green" : "bg-amber-400"}`} />
                {c.kind}: {c.value}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white">2. Upload verification documents</p>
          <Link to="/member/verification" className="text-xs font-semibold text-green underline">
            Manage all files
          </Link>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {REQUIRED_DOCS.map((item) => {
            const existing = docs.find((d) => d.type === item.type);
            return (
              <label key={item.type} className="flex cursor-pointer flex-col justify-between rounded-xl border border-white/15 bg-white/[0.04] p-3.5 transition hover:border-green/50">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-green">
                    {existing ? existing.status.replace(/_/g, " ") : "Required"}
                  </span>
                  <p className="mt-1 text-xs font-semibold text-white">{item.label}</p>
                  {existing && <p className="mt-1 truncate text-[11px] text-white/60">{existing.originalName}</p>}
                </div>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/80">
                  <Icon name="upload" size={13} /> {uploading === item.type ? "Uploading…" : existing ? "Replace file" : "Choose file"}
                </span>
                <input
                  type="file"
                  accept={ACCEPT_ATTRIBUTE}
                  className="sr-only"
                  onChange={(e) => void onUpload(item.type, e.target.files?.[0])}
                />
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-white/60">
          {canProceed ? "Required documents uploaded." : "Upload the 3 required documents to unlock 03 (channels are optional)."}
        </p>
        <button
          type="button"
          disabled={!canProceed}
          onClick={onContinue}
          className="inline-flex items-center gap-2 rounded-full bg-green px-7 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_-10px_rgba(24,162,105,0.8)] transition hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-45"
        >
          Save &amp; continue to 03 <Icon name="arrow" size={16} />
        </button>
      </div>
    </div>
  );
}

/* ---------------- Session 03: Inline Practical Tutorial ---------------- */

function SessionTutorials({ stepComplete, onContinue }: { stepComplete: boolean; onContinue: () => void }) {
  const [state, setState] = useState<PracticalState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSent = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    getPracticalState(controller.signal)
      .then((res) => {
        setState(res);
        setError(null);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function syncProgress(seconds: number, completed: boolean) {
    if (completed) setSaving(true);
    try {
      const res = await reportPracticalTutorial(seconds, completed);
      setState((prev) => (prev ? { ...prev, submission: res.submission } : prev));
    } catch (err) {
      if (completed) setError(errorMessage(err));
    } finally {
      if (completed) setSaving(false);
    }
  }

  const allDone = stepComplete || state?.submission.tutorialWatched === true;

  return (
    <div className="space-y-5">
      {loading && <p className="text-sm text-white/70">Loading practical assessment tutorial…</p>}
      {error && <div className="rounded-2xl border border-red-400/40 bg-red-950/50 p-4 text-sm text-red-100">{error}</div>}

      {state && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/15 bg-black/50">
            <video
              ref={videoRef}
              controls
              playsInline
              preload="metadata"
              src={state.tutorial.streamUrl}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                const current = Math.floor(v.currentTime);
                const duration = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
                if (duration > 0 && v.currentTime / duration >= 0.9 && !allDone) {
                  lastSent.current = current;
                  void syncProgress(current, true);
                } else if (current - lastSent.current >= 5) {
                  lastSent.current = current;
                  void syncProgress(current, false);
                }
              }}
              onEnded={(e) => void syncProgress(Math.floor(e.currentTarget.currentTime || 60), true)}
              className="aspect-video w-full"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-white">
                {state.tutorial.title}{" "}
                <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-green">
                  v{state.tutorial.version}
                </span>
              </p>
              <p className="mt-1 text-xs text-white/65">
                {allDone ? "Watched & completed" : "Watch this 1-minute walkthrough to unlock the practical assignment."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!videoRef.current) return;
                  videoRef.current.currentTime = 0;
                  void videoRef.current.play();
                }}
                className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
              >
                Replay tutorial
              </button>
              {!allDone && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void syncProgress(Math.floor(videoRef.current?.currentTime ?? 60), true)}
                  className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-navy hover:bg-green hover:text-white disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Mark tutorial watched"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 pt-2">
        <p className="text-xs text-white/60">
          {allDone ? "Tutorial complete." : "Complete the tutorial to unlock 04."}
        </p>
        <button
          type="button"
          disabled={!allDone}
          onClick={onContinue}
          className="inline-flex items-center gap-2 rounded-full bg-green px-7 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_-10px_rgba(24,162,105,0.8)] transition hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-45"
        >
          Save &amp; continue to 04 <Icon name="arrow" size={16} />
        </button>
      </div>
    </div>
  );
}

/* ---------------- Session 04: Inline Practical Assessment ---------------- */

function SessionAssessment({
  stepComplete,
  onSubmitted,
  onContinue,
}: {
  stepComplete: boolean;
  onSubmitted: () => void;
  onContinue: () => void;
}) {
  const [state, setState] = useState<PracticalState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getPracticalState(controller.signal)
      .then((res) => {
        setState(res);
        setError(null);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      });
    return () => controller.abort();
  }, []);

  const submission = state?.submission;
  const submittedOrPassed =
    stepComplete ||
    submission?.status === "SUBMITTED" ||
    submission?.status === "UNDER_REVIEW" ||
    submission?.status === "PASSED";

  return (
    <div className="space-y-5">
      <EntranceAutomatedTest tone="glass" onCompleted={onSubmitted} />
      {error && <div className="rounded-2xl border border-red-400/40 bg-red-950/50 p-4 text-sm text-red-100">{error}</div>}

      {state && (
        <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">
              Assignment Brief (v{state.assignment.version})
            </p>
            <div className="flex gap-3">
              <a
                href={state.assignment.downloadUrl}
                download={state.assignment.fileName}
                className="text-xs font-semibold text-green underline"
              >
                Download PDF
              </a>
              <Link to="/member/assessment" className="text-xs font-semibold text-white/80 underline">
                Full-screen view
              </Link>
            </div>
          </div>
          <iframe
            title="PSSA Practical Assignment Brief"
            src={state.assignment.inlineUrl}
            className="h-72 w-full rounded-xl border border-white/10 bg-white"
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-4 pt-2">
        <p className="text-xs text-white/60">
          {submittedOrPassed ? "Assessment submitted — you can continue to 05." : "Submit the automated test to continue to 05."}
        </p>
        <button
          type="button"
          disabled={!submittedOrPassed}
          onClick={onContinue}
          className="inline-flex items-center gap-2 rounded-full bg-green px-7 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_-10px_rgba(24,162,105,0.8)] transition hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-45"
        >
          Save &amp; continue to 05 <Icon name="arrow" size={16} />
        </button>
      </div>
    </div>
  );
}

/* ---------------- Session 05: Agreement & Submit ---------------- */

function SessionAgreementSubmit({ app, onSubmitted }: { app: ApplicationOverview; onSubmitted: () => void }) {
  const { application, progress } = app;
  const [accepted, setAccepted] = useState(Boolean(application.agreementAcceptedAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveAndSubmit() {
    setBusy(true);
    setError(null);
    try {
      if (!application.agreementAcceptedAt && accepted) {
        await api("/member/application/agreement", { body: { accepted: true, version: "v1.0" } });
      }
      await submitApplication();
      onSubmitted();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const submitted = application.status !== "draft" && application.status !== "needs_info";

  return (
    <div className="space-y-5">
      {error && <div className="rounded-2xl border border-red-400/40 bg-red-950/50 p-4 text-sm text-red-100">{error}</div>}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {progress.steps.slice(0, 4).map((step) => {
          const done = step.state === "complete";
          return (
            <div
              key={step.key}
              className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-medium ${
                done ? "border-green/35 bg-green/15 text-white" : "border-white/12 bg-white/[0.04] text-white/60"
              }`}
            >
              <span className={`flex size-5 shrink-0 items-center justify-center rounded-full ${done ? "bg-green text-white" : "bg-white/10"}`}>
                <Icon name={done ? "check" : "clock"} size={11} />
              </span>
              <span className="truncate">{step.label}</span>
            </div>
          );
        })}
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/15 bg-white/[0.05] p-5">
        <input
          type="checkbox"
          checked={accepted}
          disabled={Boolean(application.agreementAcceptedAt) || submitted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 size-4 accent-green"
        />
        <span className="text-sm leading-relaxed text-white/85">
          I agree to the PSASA Code of Conduct, Verification Standard, and Complaints &amp; Appeals rules.
        </span>
      </label>

      {submitted ? (
        <div className="rounded-2xl border border-green/40 bg-green/15 p-5 text-sm text-white">
          <strong>Application review in progress</strong> ({application.number}). A verification officer is reviewing your application and practical assessment.
        </div>
      ) : (
        <button
          type="button"
          disabled={busy || !accepted || (!progress.canSubmit && !application.agreementAcceptedAt)}
          onClick={() => void handleSaveAndSubmit()}
          className="inline-flex items-center gap-2 rounded-full bg-green px-7 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_-10px_rgba(24,162,105,0.8)] transition hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy ? "Submitting…" : "Save & submit application"} <Icon name="arrow" size={16} />
        </button>
      )}
    </div>
  );
}

/* ---------------- Session 06: Certified ---------------- */

function SessionCertified({ app, profile }: { app: ApplicationOverview; profile: MemberProfile | null }) {
  const mp = profile?.memberProfile;
  const approved = app.application.status === "approved";
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-green/40 bg-green/15 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-green">
          {approved ? "Active PSASA Verification" : "Pending Final Officer Activation"}
        </p>
        <h3 className="mt-2 font-display text-2xl font-semibold text-white">
          {[mp?.firstName, mp?.lastName].filter(Boolean).join(" ") || "PSASA Member"}
        </h3>
        <p className="mt-1 text-sm text-white/75">{mp?.tradingName || "Verified Personal Shopper"}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/member/certificate"
          className="inline-flex items-center gap-2 rounded-full bg-green px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-dark"
        >
          View certificate &amp; QR <Icon name="arrow" size={16} />
        </Link>
        <Link
          to="/member/renewal"
          className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Renewal status
        </Link>
      </div>
    </div>
  );
}

function GlassInput({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="font-semibold text-white/85">{label}</span>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-white placeholder:text-white/40 outline-none backdrop-blur-md transition focus:border-green focus:bg-white/15"
      />
    </label>
  );
}
