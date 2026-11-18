import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApplication, submitApplication, type ApplicationOverview, type StepKey } from "../../api/member";
import { Icon, type IconName } from "../../components/Icon";
import { APPLICATION_STATUS, Button, ButtonLink, Card, DOCUMENT_STATUS, ErrorState, LoadingState, Notice, Panel, Status, type StatusMap } from "../../components/ui";
import { useAuth } from "../../context/auth-context";
import { ApiError, errorMessage } from "../../lib/api";

// Application dashboard: six steps, overall progress and action-needed items, as in the Figma file.
// Progress comes from GET /api/member/application; the server decides which gates have passed,
// so this page never marks a step complete by itself.

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

// Action items can carry an application or a document status, plus "in_progress" for unfinished steps.
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
        // 404: the progress endpoint hasn't been built on the backend yet.
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
    <>
      <div className="workspace-title">
        <div>
          <span>{firstName ? `${greeting()}, ${firstName}` : greeting()}</span>
          <h1>Your application</h1>
          <p>Complete each step below. Your application goes to review once every step before Review has passed.</p>
        </div>
        {state.kind === "ready" && <Status of={APPLICATION_STATUS} value={state.data.application.status} />}
      </div>

      {state.kind === "loading" && <LoadingState rows={2} label="Loading your application" />}
      {state.kind === "error" && <ErrorState title="We couldn't load your application" text={state.message} onRetry={reload} />}
      {state.kind === "not_available" && <NotAvailable />}

      {state.kind === "ready" && (
        <>
          <Progress data={state.data} />

          <div className="workspace-grid">
            <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
              <ActionNeeded data={state.data} />
              <Agreement data={state.data} />
              {state.data.application.status === "draft" && (
                <Card>
                  <h3 style={{ marginBottom: 6 }}>Submit for review</h3>
                  <p className="muted" style={{ marginBottom: 16 }}>
                    {state.data.progress.canSubmit
                      ? "Every step before Review has passed. A PSSA reviewer will check your file."
                      : "You can submit once every step before Review has passed."}
                  </p>
                  {submitError && <Notice tone="red" title="We couldn't submit your application">{submitError}</Notice>}
                  <Button variant="green" iconRight="arrow" disabled={!state.data.progress.canSubmit} loading={submitting} onClick={() => void onSubmit()}>
                    Submit for review
                  </Button>
                </Card>
              )}
            </div>
            <HelpPanel />
          </div>
        </>
      )}
    </>
  );
}

function Progress({ data }: { data: ApplicationOverview }) {
  const { percent, steps, actions } = data.progress;
  const attention = actions.length;
  return (
    <section className="progress-card" aria-label="Application progress">
      <div className="progress-head">
        <div>
          <span>Overall progress</span>
          <strong>{Math.round(percent)}%</strong>
        </div>
        <p>{attention === 0 ? "Nothing needs your attention right now" : `${attention} ${attention === 1 ? "item needs" : "items need"} your attention`}</p>
      </div>
      <div className="progress-track" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
      <ol className="application-steps">
        {steps.map((step) => {
          const done = step.state === "complete";
          const current = step.state === "in_progress" || step.state === "action_needed";
          const link = STEP_LINK[step.key];
          return (
            <li key={step.key} className={`app-step ${done ? "done" : current ? "current" : ""}`}>
              <span className="app-step-icon">
                <Icon name={done ? "check" : step.state === "locked" ? "lock" : STEP_ICON[step.key]} />
              </span>
              <div>
                <b>{step.label}</b>
                <small>{step.detail}</small>
              </div>
              {current && link && (
                <Link to={link} className="app-step-link">
                  Continue <Icon name="chevron" size={15} />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ActionNeeded({ data }: { data: ApplicationOverview }) {
  const { actions } = data.progress;
  return (
    <Panel
      icon={actions.length ? "warning" : "check"}
      title={actions.length ? "Action needed" : "You're up to date"}
      subtitle={actions.length ? "These items are holding up your application." : "Nothing is waiting on you right now."}
    >
      {actions.map((item) => {
        const link = STEP_LINK[item.step];
        return (
          <div className="task-row" key={`${item.step}-${item.title}`}>
            <div>
              <Status of={ACTION_STATUS} value={item.status} />
              <b>{item.title}</b>
              {item.detail && <p>{item.detail}</p>}
            </div>
            {link && (
              <Link to={link} className="app-step-link">
                Fix now <Icon name="arrow" size={15} />
              </Link>
            )}
          </div>
        );
      })}
    </Panel>
  );
}

function Agreement({ data }: { data: ApplicationOverview }) {
  const accepted = data.application.agreementAcceptedAt;
  return (
    <Panel icon="file" title="Membership agreement" subtitle="You accept it before your application goes to review">
      {accepted ? (
        <Notice tone="green" title={`Accepted on ${new Date(accepted).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}`}>
          Version {data.application.agreementVersion}
        </Notice>
      ) : (
        <Notice tone="blue" title="The membership agreement isn't published yet.">
          It will appear here once PSSA has approved it. Everything else in your application can go ahead in the meantime.
        </Notice>
      )}
    </Panel>
  );
}

function HelpPanel() {
  return (
    <aside className="panel help-panel">
      <span className="help-art">
        <Icon name="book" size={30} />
      </span>
      <h3>How verification works</h3>
      <p className="muted" style={{ marginBottom: 16 }}>
        Uploading a document isn't the same as passing a check. Every item is reviewed against the PSSA Verification Standard.
      </p>
      <ButtonLink to="/#membership" variant="outline" full>
        Read the four gates
      </ButtonLink>
    </aside>
  );
}

function NotAvailable() {
  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 820 }}>
      <Notice tone="blue" title="Your progress tracker is being connected.">
        The six steps of your application will appear here soon. You can already complete your profile.
      </Notice>
      <Panel icon="user" title="Start with your profile" subtitle="Step 1 of 6">
        <p className="muted" style={{ marginBottom: 16 }}>Your name, trading details, ID number, address and the social pages you sell on.</p>
        <ButtonLink to="/member/profile" variant="green" iconRight="arrow">
          Complete your profile
        </ButtonLink>
      </Panel>
    </div>
  );
}
