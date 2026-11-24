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
  deletePracticalEvidence,
  getPracticalState,
  reportPracticalTutorial,
  savePracticalDraft,
  submitPracticalAssessment,
  uploadPracticalEvidence,
  type PracticalAnswers,
  type PracticalOptionItem,
  type PracticalState,
  type PracticalTrack,
} from "../../api/practicalAssessment";
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
  const isUnderReview = !isApproved && (application.status === "submitted" || application.status === "under_review");

  if (isUnderReview) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-[32px] border border-white/15 bg-white/[0.07] p-8 shadow-[0_30px_90px_-24px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-green/40 bg-green/15 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-green">
            <span className="size-1.5 rounded-full bg-green" />
            {justSubmitted ? "Review Submitted" : "Application review in progress"}
          </div>

          <h1 className="mt-4 font-display text-3xl font-semibold text-white sm:text-4xl">
            {justSubmitted ? "Review Submitted" : "Application review in progress"}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
            {justSubmitted
              ? "Your entire application, verification documents, and practical assessment have been submitted for review. You can now wait for your PSASA certificate — we will update your account as soon as an officer approves your file."
              : "Your application, verification documents, and practical assessment are currently being reviewed by a PSASA verification officer. Your certificate will unlock here automatically once approved."}
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/12 bg-white/[0.05] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">Application</p>
              <p className="mt-1 font-mono text-sm font-semibold text-white">{application.number ?? "Submitted"}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/[0.05] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">Submitted</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {application.submittedAt
                  ? new Date(application.submittedAt).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Recently"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/[0.05] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">Next milestone</p>
              <p className="mt-1 text-sm font-semibold text-green">PSASA Certificate</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
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

const EMPTY_PRACTICAL_OPTION = (): PracticalOptionItem => ({
  name: "",
  retailer: "",
  url: "",
  price: "",
  suitability: "",
});

function initPracticalAnswers(existing: Partial<PracticalAnswers> | null | undefined): PracticalAnswers {
  const opts = Array.isArray(existing?.options) ? existing.options : [];
  const normalized =
    opts.length >= 3
      ? opts.map((o) => ({
          name: o?.name ?? "",
          retailer: o?.retailer ?? "",
          url: o?.url ?? "",
          price: o?.price ?? "",
          suitability: o?.suitability ?? "",
        }))
      : [
          ...opts.map((o) => ({
            name: o?.name ?? "",
            retailer: o?.retailer ?? "",
            url: o?.url ?? "",
            price: o?.price ?? "",
            suitability: o?.suitability ?? "",
          })),
          ...Array.from({ length: Math.max(0, 3 - opts.length) }, EMPTY_PRACTICAL_OPTION),
        ];

  return {
    briefSummary: existing?.briefSummary ?? "",
    options: normalized,
    budget: {
      estimatedTotal: existing?.budget?.estimatedTotal ?? "",
      additionalCosts: existing?.budget?.additionalCosts ?? "",
      remainingOrOver: existing?.budget?.remainingOrOver ?? "",
      assumptions: existing?.budget?.assumptions ?? "",
      priceCheckedDate: existing?.budget?.priceCheckedDate ?? new Date().toISOString().slice(0, 10),
    },
    recommendation: {
      preferredPlan: existing?.recommendation?.preferredPlan ?? "",
      backupOption: existing?.recommendation?.backupOption ?? "",
    },
    customerMessage: existing?.customerMessage ?? "",
    responsibility: {
      priceChanges: existing?.responsibility?.priceChanges ?? "",
      commissionDisclosure: existing?.responsibility?.commissionDisclosure ?? "",
      privacyProtection: existing?.responsibility?.privacyProtection ?? "",
    },
  };
}

function SessionAssessment({ stepComplete, onContinue }: { stepComplete: boolean; onContinue: () => void }) {
  const [state, setState] = useState<PracticalState | null>(null);
  const [serviceTrack, setServiceTrack] = useState<PracticalTrack | null>(null);
  const [answers, setAnswers] = useState<PracticalAnswers>(() => initPracticalAnswers(null));
  const [busy, setBusy] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  useEffect(() => {
    const controller = new AbortController();
    getPracticalState(controller.signal)
      .then((res) => {
        setState(res);
        setServiceTrack(res.submission.serviceTrack ?? res.suggestedTrack ?? null);
        setAnswers(initPracticalAnswers(res.submission.answers));
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
  const editable = !submittedOrPassed;

  async function handleSaveDraft() {
    setSavingDraft(true);
    setError(null);
    setNotice(null);
    try {
      const res = await savePracticalDraft(serviceTrack, answers);
      setState((prev) => (prev ? { ...prev, submission: res.submission } : prev));
      setNotice("Draft saved. Your answers are preserved if you refresh or sign out.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleSubmit() {
    if (!editable || busy) return;
    setError(null);
    setNotice(null);
    if (!serviceTrack) {
      setError("Please select the service track that matches your category.");
      return;
    }
    setBusy(true);
    try {
      const res = await submitPracticalAssessment({
        serviceTrack,
        ...answers,
        idempotencyKey: idempotencyKeyRef.current,
      });
      setState((prev) => (prev ? { ...prev, submission: res.submission } : prev));
      setNotice("Practical assessment submitted! You can now continue to 05 while PSSA reviews your submission.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && <div className="rounded-2xl border border-red-400/40 bg-red-950/50 p-4 text-sm text-red-100">{error}</div>}
      {notice && <div className="rounded-2xl border border-green/40 bg-green/15 p-4 text-sm text-white">{notice}</div>}

      {state && (
        <>
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
              className="h-64 w-full rounded-xl border border-white/10 bg-white"
            />
          </div>

          {submittedOrPassed ? (
            <div className="rounded-2xl border border-green/40 bg-green/15 p-5 text-sm text-white space-y-2">
              <p className="font-semibold">
                {submission?.status === "PASSED"
                  ? `Practical assessment passed${submission.totalScore !== null ? ` (${submission.totalScore}/100)` : ""}.`
                  : "Practical assessment submitted — awaiting PSSA review."}
              </p>
              <p className="text-xs text-white/80">
                Submitting the practical assessment does not automatically approve membership. You may continue to Step 05 while PSSA reviews your submission.
              </p>
            </div>
          ) : (
            <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
              <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-green">1. Service Track *</p>
                {state.tracks.map((t) => (
                  <label
                    key={t.id}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs ${
                      serviceTrack === t.id ? "border-green bg-green/20 text-white" : "border-white/15 bg-white/[0.03] text-white/80"
                    }`}
                  >
                    <input
                      type="radio"
                      name="dashTrack"
                      checked={serviceTrack === t.id}
                      onChange={() => setServiceTrack(t.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-semibold">
                        Track {t.code}: {t.label} (Max R{t.budgetZar.toLocaleString("en-ZA")})
                      </div>
                      <div className="mt-0.5 opacity-80">{t.summary}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-4 space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-green">
                  2. Customer Brief Summary *
                </label>
                <textarea
                  rows={3}
                  value={answers.briefSummary}
                  onChange={(e) => setAnswers({ ...answers, briefSummary: e.target.value })}
                  placeholder="Restate the fictional customer's needs, budget, preferences, and constraints..."
                  className="w-full rounded-xl border border-white/20 bg-navy/70 p-2.5 text-xs text-white outline-none focus:border-green"
                />
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-green">
                    3. Research Options (min 3) *
                  </span>
                  {answers.options.length < 10 && (
                    <button
                      type="button"
                      onClick={() => setAnswers({ ...answers, options: [...answers.options, EMPTY_PRACTICAL_OPTION()] })}
                      className="text-xs font-semibold text-green underline"
                    >
                      + Add option
                    </button>
                  )}
                </div>
                {answers.options.map((opt, idx) => (
                  <div key={idx} className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        placeholder={`Option ${idx + 1} name`}
                        value={opt.name}
                        onChange={(e) => {
                          const next = [...answers.options];
                          next[idx] = { ...opt, name: e.target.value };
                          setAnswers({ ...answers, options: next });
                        }}
                        className="rounded-lg border border-white/20 bg-navy/70 px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        placeholder="Retailer / source"
                        value={opt.retailer}
                        onChange={(e) => {
                          const next = [...answers.options];
                          next[idx] = { ...opt, retailer: e.target.value };
                          setAnswers({ ...answers, options: next });
                        }}
                        className="rounded-lg border border-white/20 bg-navy/70 px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        placeholder="Public URL (https://...)"
                        value={opt.url}
                        onChange={(e) => {
                          const next = [...answers.options];
                          next[idx] = { ...opt, url: e.target.value };
                          setAnswers({ ...answers, options: next });
                        }}
                        className="rounded-lg border border-white/20 bg-navy/70 px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        placeholder="Listed price (e.g. R499)"
                        value={opt.price}
                        onChange={(e) => {
                          const next = [...answers.options];
                          next[idx] = { ...opt, price: e.target.value };
                          setAnswers({ ...answers, options: next });
                        }}
                        className="rounded-lg border border-white/20 bg-navy/70 px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <input
                      placeholder="Why this option fits the brief..."
                      value={opt.suitability}
                      onChange={(e) => {
                        const next = [...answers.options];
                        next[idx] = { ...opt, suitability: e.target.value };
                        setAnswers({ ...answers, options: next });
                      }}
                      className="w-full rounded-lg border border-white/20 bg-navy/70 px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-green">4. Budget Calculation *</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    placeholder="Estimated total"
                    value={answers.budget.estimatedTotal}
                    onChange={(e) => setAnswers({ ...answers, budget: { ...answers.budget, estimatedTotal: e.target.value } })}
                    className="rounded-lg border border-white/20 bg-navy/70 px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    placeholder="Delivery / travel / extra costs"
                    value={answers.budget.additionalCosts}
                    onChange={(e) => setAnswers({ ...answers, budget: { ...answers.budget, additionalCosts: e.target.value } })}
                    className="rounded-lg border border-white/20 bg-navy/70 px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    placeholder="Remaining budget or difference"
                    value={answers.budget.remainingOrOver}
                    onChange={(e) => setAnswers({ ...answers, budget: { ...answers.budget, remainingOrOver: e.target.value } })}
                    className="rounded-lg border border-white/20 bg-navy/70 px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="date"
                    value={answers.budget.priceCheckedDate}
                    onChange={(e) => setAnswers({ ...answers, budget: { ...answers.budget, priceCheckedDate: e.target.value } })}
                    className="rounded-lg border border-white/20 bg-navy/70 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="Costing assumptions..."
                  value={answers.budget.assumptions}
                  onChange={(e) => setAnswers({ ...answers, budget: { ...answers.budget, assumptions: e.target.value } })}
                  className="w-full rounded-lg border border-white/20 bg-navy/70 p-2 text-xs text-white"
                />
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-green">5. Recommendation &amp; Backup *</p>
                <textarea
                  rows={2}
                  placeholder="Recommended option or combination and why..."
                  value={answers.recommendation.preferredPlan}
                  onChange={(e) => setAnswers({ ...answers, recommendation: { ...answers.recommendation, preferredPlan: e.target.value } })}
                  className="w-full rounded-lg border border-white/20 bg-navy/70 p-2 text-xs text-white"
                />
                <textarea
                  rows={2}
                  placeholder="At least one realistic backup/substitute option..."
                  value={answers.recommendation.backupOption}
                  onChange={(e) => setAnswers({ ...answers, recommendation: { ...answers.recommendation, backupOption: e.target.value } })}
                  className="w-full rounded-lg border border-white/20 bg-navy/70 p-2 text-xs text-white"
                />
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-green">
                  6. Sample Customer Approval Message (Draft Only) *
                </p>
                <textarea
                  rows={2}
                  placeholder="Write a clear, courteous approval request (simulation only; never sends to a real customer)..."
                  value={answers.customerMessage}
                  onChange={(e) => setAnswers({ ...answers, customerMessage: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-navy/70 p-2 text-xs text-white"
                />
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-green">7. Responsible Practice *</p>
                <textarea
                  rows={2}
                  placeholder="How you handle price changes before purchase..."
                  value={answers.responsibility.priceChanges}
                  onChange={(e) => setAnswers({ ...answers, responsibility: { ...answers.responsibility, priceChanges: e.target.value } })}
                  className="w-full rounded-lg border border-white/20 bg-navy/70 p-2 text-xs text-white"
                />
                <textarea
                  rows={2}
                  placeholder="How you disclose commission or commercial relationships..."
                  value={answers.responsibility.commissionDisclosure}
                  onChange={(e) => setAnswers({ ...answers, responsibility: { ...answers.responsibility, commissionDisclosure: e.target.value } })}
                  className="w-full rounded-lg border border-white/20 bg-navy/70 p-2 text-xs text-white"
                />
                <textarea
                  rows={2}
                  placeholder="How you protect customer personal information..."
                  value={answers.responsibility.privacyProtection}
                  onChange={(e) => setAnswers({ ...answers, responsibility: { ...answers.responsibility, privacyProtection: e.target.value } })}
                  className="w-full rounded-lg border border-white/20 bg-navy/70 p-2 text-xs text-white"
                />
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.05] p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
                  Optional Supporting Evidence (not required)
                </p>
                {submission?.evidence ? (
                  <div className="flex items-center justify-between text-xs text-white">
                    <a href={submission.evidence.url} target="_blank" rel="noreferrer" className="underline">
                      {submission.evidence.fileName}
                    </a>
                    <button
                      type="button"
                      disabled={uploadingFile}
                      onClick={() =>
                        void deletePracticalEvidence().then((res) =>
                          setState((prev) => (prev ? { ...prev, submission: res.submission } : prev)),
                        )
                      }
                      className="text-red-300 underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    disabled={uploadingFile}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setUploadingFile(true);
                      void uploadPracticalEvidence(f)
                        .then((res) => setState((prev) => (prev ? { ...prev, submission: res.submission } : prev)))
                        .catch((err) => setError(errorMessage(err)))
                        .finally(() => setUploadingFile(false));
                    }}
                    className="text-xs text-white/80"
                  />
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={savingDraft || busy}
                  onClick={() => void handleSaveDraft()}
                  className="rounded-full border border-white/25 px-5 py-2.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                >
                  {savingDraft ? "Saving…" : "Save draft"}
                </button>
                <button
                  type="button"
                  disabled={busy || savingDraft}
                  onClick={() => void handleSubmit()}
                  className="rounded-full bg-green px-6 py-2.5 text-xs font-semibold text-white hover:bg-green-dark disabled:opacity-50"
                >
                  {busy ? "Submitting…" : "Submit Practical Assessment"}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-between gap-4 pt-2">
        <p className="text-xs text-white/60">
          {submittedOrPassed ? "Assessment submitted — you can continue to 05." : "Submit your practical assessment to continue to 05."}
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
