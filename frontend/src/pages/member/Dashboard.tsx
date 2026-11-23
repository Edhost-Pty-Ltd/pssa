import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { getApplication, submitApplication, type ApplicationOverview, type StepKey } from "../../api/member";
import { Icon, type IconName } from "../../components/Icon";
import { APPLICATION_STATUS, Button, ButtonLink, DOCUMENT_STATUS, ErrorState, LoadingState, Notice, Status, type StatusMap } from "../../components/ui";
import { useAuth } from "../../context/auth-context";
import { ApiError, errorMessage } from "../../lib/api";

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
  profile: "Your name, trading name, and confirmed channels are what customers check on the public register.",
  documents: "We verify your identity, address, and bank confirmation privately so customers never have to.",
  tutorials: "Short conduct lessons prepared by PSASA so every member shares the same customer-care standard.",
  assessment: "A timed 30-question conduct check (80% pass mark) before your file goes to human review.",
  review: "A PSASA verification officer reviews your documents and assessment before activating your certificate.",
  certified: "Your live certificate and QR link are active—customers can check your status in seconds.",
};

const ACTION_STATUS: StatusMap = {
  ...APPLICATION_STATUS,
  ...DOCUMENT_STATUS,
  in_progress: { label: "In progress", tone: "blue" },
  not_started: { label: "Not started", tone: "grey" },
};

function greeting() {
  const hour = Number(new Date().toLocaleString("en-ZA", { hour: "numeric", hour12: false, timeZone: "Africa/Johannesburg" }));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

type LoadState = { kind: "loading" } | { kind: "ready"; data: ApplicationOverview } | { kind: "not_available" } | { kind: "error"; message: string };

export default function Dashboard() {
  const { user } = useAuth();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getApplication(controller.signal)
      .then((data) => setState({ kind: "ready", data }))
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
  };

  async function onSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitApplication();
      reload();
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const firstName = user?.firstName?.trim();

  return (
    <div className="space-y-6">
      {state.kind === "loading" && <LoadingState rows={3} label="Loading your verification journey" />}
      {state.kind === "error" && <ErrorState title="We couldn't load your verification journey" text={state.message} onRetry={reload} />}
      {state.kind === "not_available" && <NotAvailable firstName={firstName} />}

      {state.kind === "ready" && (
        <JourneyView
          firstName={firstName}
          data={state.data}
          submitting={submitting}
          submitError={submitError}
          onSubmit={onSubmit}
        />
      )}
    </div>
  );
}

function JourneyView({
  firstName,
  data,
  submitting,
  submitError,
  onSubmit,
}: {
  firstName?: string;
  data: ApplicationOverview;
  submitting: boolean;
  submitError: string | null;
  onSubmit: () => void;
}) {
  const { application, progress } = data;
  const pct = Math.round(Math.min(100, Math.max(0, progress.percent)));
  const activeIndex = progress.steps.findIndex((s) => s.state !== "complete");
  const currentStep = activeIndex === -1 ? progress.steps[progress.steps.length - 1] : progress.steps[activeIndex];
  const nextLink = currentStep ? STEP_LINK[currentStep.key] : undefined;
  const isCertified = application.status === "approved" && progress.steps.every((s) => s.state === "complete");
  const completedCount = progress.steps.filter((s) => s.state === "complete").length;

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy-2 to-navy-3 p-7 text-white shadow-xl sm:p-9"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-green/20 blur-3xl"
        />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-green">
                <span className="size-2 rounded-full bg-green" />
                {isCertified ? "Verified PSASA Member" : "Verification Journey"}
              </span>
              <Status of={APPLICATION_STATUS} value={application.status} />
            </div>
            <h1 className="mt-4 font-display text-3xl font-semibold text-white sm:text-4xl">
              {firstName ? `${greeting()}, ${firstName}.` : `${greeting()}.`}
            </h1>
            <p className="mt-2 text-base leading-relaxed text-white/75">
              {isCertified
                ? "Your profile, verification checks, and conduct assessment are complete. Customers can check your live status anytime."
                : "Follow each step at your own pace—your progress saves automatically so you can pause and continue anytime."}
            </p>
          </div>

          <div className="min-w-[210px] rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Journey progress</span>
              <strong className="font-display text-2xl font-bold text-green">{pct}%</strong>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-green to-[#6ee7b7]"
              />
            </div>
            <p className="mt-2 text-xs text-white/70">
              {completedCount} of {progress.steps.length} milestones complete
            </p>
          </div>
        </div>

        <ol className="relative z-10 mt-8 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-6" aria-label="Onboarding steps">
          {progress.steps.map((step, i) => {
            const done = step.state === "complete";
            const current = i === activeIndex;
            const locked = step.state === "locked";
            const link = STEP_LINK[step.key];
            const card = (
              <div
                className={`flex h-full flex-col justify-between rounded-2xl border p-3.5 transition ${
                  current
                    ? "border-green bg-white text-navy shadow-lg"
                    : done
                      ? "border-green/40 bg-green/15 text-white hover:bg-green/25"
                      : "border-white/10 bg-white/5 text-white/65"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex size-8 items-center justify-center rounded-xl text-xs font-bold ${
                      current
                        ? "bg-green text-white"
                        : done
                          ? "bg-green text-white"
                          : "bg-white/10 text-white/70"
                    }`}
                  >
                    <Icon name={done ? "check" : locked ? "lock" : STEP_ICON[step.key]} size={15} />
                  </span>
                  <span className={`text-[10.5px] font-bold uppercase tracking-[0.14em] ${current ? "text-green-dark" : "text-white/50"}`}>
                    Step {i + 1}
                  </span>
                </div>
                <div className="mt-3">
                  <p className={`text-sm font-semibold leading-snug ${current ? "text-navy" : "text-white"}`}>{step.label}</p>
                  <p className={`mt-1 line-clamp-2 text-xs ${current ? "text-muted" : "text-white/65"}`}>{step.detail}</p>
                </div>
              </div>
            );

            return (
              <li key={step.key}>
                {link && !locked ? <Link to={link} className="block h-full">{card}</Link> : card}
              </li>
            );
          })}
        </ol>
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr] lg:items-start">
        <div className="space-y-6">
          {progress.actions.length > 0 ? (
            <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-[var(--amber-soft)] text-[#9a6700]">
                  <Icon name="warning" size={20} />
                </span>
                <div>
                  <h2 className="font-display text-2xl font-semibold text-navy">Action needed</h2>
                  <p className="text-sm text-muted">Resolve these items to keep your verification moving forward.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {progress.actions.map((item) => {
                  const link = STEP_LINK[item.step];
                  return (
                    <div key={`${item.step}-${item.title}`} className="flex flex-col justify-between gap-3 rounded-2xl border border-line bg-soft/60 p-4 sm:flex-row sm:items-center">
                      <div>
                        <Status of={ACTION_STATUS} value={item.status} />
                        <p className="mt-2 font-semibold text-navy">{item.title}</p>
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
          ) : (
            currentStep && (
              <section className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-dark">
                  {isCertified ? "You're verified" : `Up next · Step ${activeIndex + 1} of ${progress.steps.length}`}
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold text-navy">{currentStep.label}</h2>
                <p className="mt-2 text-base leading-relaxed text-ink/80">{currentStep.detail}</p>
                <p className="mt-4 rounded-2xl bg-sand/45 px-4 py-3 text-sm text-navy/85">
                  <strong>Why we ask for this:</strong> {STEP_WHY[currentStep.key]}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {nextLink && (
                    <ButtonLink to={nextLink} variant="green" iconRight="arrow">
                      {isCertified ? "View certificate & QR" : currentStep.state === "not_started" ? `Start ${currentStep.label}` : `Continue ${currentStep.label}`}
                    </ButtonLink>
                  )}
                  {isCertified && (
                    <ButtonLink to="/member/renewal" variant="outline">
                      Check renewal status
                    </ButtonLink>
                  )}
                </div>
              </section>
            )
          )}

          {application.status === "draft" && (
            <section className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-7">
              <h3 className="font-display text-xl font-semibold text-navy">Ready to submit for review?</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {progress.canSubmit
                  ? "Every pre-review milestone is complete. Submit your application to enter the PSASA verification queue."
                  : "Once your profile, documents, confirmed channel, and membership agreement are complete, you can submit here."}
              </p>
              {submitError && (
                <div className="mt-4">
                  <Notice tone="red" title="We couldn't submit your application">{submitError}</Notice>
                </div>
              )}
              <div className="mt-5">
                <Button variant="green" iconRight="arrow" disabled={!progress.canSubmit} loading={submitting} onClick={() => void onSubmit()}>
                  Submit for review
                </Button>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
            <h3 className="font-display text-lg font-semibold text-navy">Membership agreement</h3>
            <p className="mt-1 text-sm text-muted">Accepted before your file enters review.</p>
            <div className="mt-4">
              {application.agreementAcceptedAt ? (
                <Notice
                  tone="green"
                  title={`Accepted on ${new Date(application.agreementAcceptedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}`}
                >
                  Version {application.agreementVersion}
                </Notice>
              ) : (
                <Notice tone="blue" title="Pending acceptance">
                  You can accept the membership agreement once your profile and documents are ready.
                </Notice>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-sand-dark/60 bg-sand/50 p-6">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-navy text-green">
              <Icon name="book" size={20} />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-navy">How PSASA verification works</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/75">
              Uploading a document isn't the same as passing a check. Every item is reviewed against the PSASA Verification Standard—and fees never buy approval.
            </p>
            <div className="mt-4">
              <ButtonLink to="/#membership" variant="outline" full>
                Read the four gates
              </ButtonLink>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function NotAvailable({ firstName }: { firstName?: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-3xl bg-navy p-8 text-white shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-green">Step 1 of 6</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">
          {firstName ? `${greeting()}, ${firstName}.` : "Welcome to PSASA."}
        </h1>
        <p className="mt-2 text-base text-white/75">
          Start your verification journey by completing your personal shopper profile. Your progress saves automatically as you go.
        </p>
        <div className="mt-6">
          <ButtonLink to="/member/profile" variant="green" iconRight="arrow">
            Start with your profile
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
