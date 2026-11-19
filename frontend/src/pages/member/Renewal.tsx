import { useEffect, useState, type FormEvent } from "react";
import { DECLARATION, getRenewal, startRenewal, submitDeclaration, type ChecklistItem, type RenewalOverview } from "../../api/renewal";
import { Icon, type IconName } from "../../components/Icon";
import { Button, ButtonLink, ErrorState, LoadingState, Notice, Panel, StatusBadge, type StatusTone } from "../../components/ui";
import { errorMessage } from "../../lib/api";

const DAY = 24 * 60 * 60 * 1000;
const formatDate = (value: string) => new Date(value).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

const STATE_BADGE: Record<RenewalOverview["status"], { label: string; tone: StatusTone }> = {
  not_started: { label: "Renewal open", tone: "blue" },
  window_closed: { label: "Not open yet", tone: "grey" },
  ineligible: { label: "Not available", tone: "grey" },
  draft: { label: "In progress", tone: "blue" },
  submitted: { label: "Submitted", tone: "blue" },
  needs_info: { label: "Action needed", tone: "amber" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Not approved", tone: "red" },
};

const STEPS: Record<ChecklistItem["key"], { icon: IconName; title: string; todo: string; done: string; link?: { to: string; label: string } }> = {
  documents: {
    icon: "shield",
    title: "Verification documents",
    todo: "Your ID, address or registration, and bank documents must all be accepted. Replace anything out of date.",
    done: "Your verification documents are accepted.",
    link: { to: "/member/verification", label: "Go to verification" },
  },
  refresher: {
    icon: "book",
    title: "Refresher assessment",
    todo: "Pass a short test on the current Code of Conduct (at least 80% and every critical question right).",
    done: "You've passed the refresher assessment for this year.",
    link: { to: "/member/renewal/refresher", label: "Take the refresher" },
  },
  declaration: {
    icon: "file",
    title: "Annual declaration",
    todo: "Confirm your details are still correct. This submits your renewal for review.",
    done: "Declaration accepted.",
  },
};

type Loaded = { data: RenewalOverview; loadedAt: number };

export default function Renewal() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getRenewal(controller.signal)
      .then((data) => {
        setLoaded({ data, loadedAt: Date.now() });
        setError(null);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      });
    return () => controller.abort();
  }, [reload]);

  const refresh = () => setReload((n) => n + 1);

  if (error) {
    return (
      <ErrorState
        title="We couldn't load your renewal"
        text={error}
        onRetry={() => {
          setError(null);
          refresh();
        }}
      />
    );
  }
  if (!loaded) return <LoadingState rows={3} label="Loading your renewal" />;

  const { data, loadedAt } = loaded;
  const badge = STATE_BADGE[data.status];
  const daysLeft = data.validUntil ? Math.ceil((new Date(data.validUntil).getTime() - loadedAt) / DAY) : null;

  return (
    <>
      <div className="workspace-title">
        <div>
          <span>Membership</span>
          <h1>Annual renewal</h1>
          <p>Membership lasts 12 months. Renew each year to stay on the register and keep using your certificate and badge.</p>
        </div>
        <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
      </div>

      <div style={{ display: "grid", gap: 18, maxWidth: 860 }}>
        {data.validUntil && (
          <Panel
            icon="calendar"
            title={daysLeft !== null && daysLeft > 0 ? `${daysLeft} days until your membership ends` : "Your membership has ended"}
            subtitle={`Valid until ${formatDate(data.validUntil)}`}
          >
            <p style={{ margin: 0 }}>
              {!data.windowOpensAt
                ? "Renewal opens 60 days before your membership ends."
                : new Date(data.windowOpensAt).getTime() <= loadedAt
                  ? `Renewal opened on ${formatDate(data.windowOpensAt)}, 60 days before your membership ends.`
                  : `Renewal opens on ${formatDate(data.windowOpensAt)}, 60 days before your membership ends.`}{" "}
              There's no grace period: if you don't renew in time, your public status changes to expired.
            </p>
          </Panel>
        )}

        <LastDecision data={data} />
        <StateSection data={data} onChanged={refresh} />
      </div>
    </>
  );
}

function StateSection({ data, onChanged }: { data: RenewalOverview; onChanged: () => void }) {
  switch (data.status) {
    case "ineligible":
      return (
        <Notice tone="amber" title="Renewal isn't available right now">
          {data.validUntil
            ? "Renewal is only available while your membership is active. If your membership is suspended, it must be lifted first. Contact PSSA if you think this is wrong."
            : "Renewal opens once your membership is active and you have a certificate."}
        </Notice>
      );
    case "window_closed":
      return (
        <Notice tone="blue" title="It's too early to renew">
          {data.windowOpensAt ? `You can start your renewal from ${formatDate(data.windowOpensAt)}.` : "You can start your renewal 60 days before your membership ends."} We'll
          remind you before then.
        </Notice>
      );
    case "not_started":
      return <StartPanel canStart={data.canStart} onStarted={onChanged} />;
    case "submitted":
      return (
        <>
          <Notice tone="green" title="Your renewal has been submitted" icon="check">
            {data.renewal?.submittedAt ? `Submitted on ${formatDate(data.renewal.submittedAt)}. ` : ""}A PSSA reviewer will check it. You'll hear from us
            by email, and your new valid-until date will show here once it's approved.
          </Notice>
          <Checklist items={data.checklist} />
        </>
      );
    case "needs_info":
    case "draft":
      return (
        <>
          {data.status === "needs_info" && (
            <Notice tone="amber" title="The reviewer needs more from you">
              {data.renewal?.decisionReason ?? "Check each step below, update what's needed and submit your declaration again."}
            </Notice>
          )}
          <Checklist items={data.checklist} />
          <DeclarationPanel checklist={data.checklist} resubmit={data.status === "needs_info"} onSubmitted={onChanged} />
        </>
      );
    case "approved":
      return (
        <Notice tone="green" title="Your renewal was approved" icon="check">
          Your membership has been extended{data.validUntil ? ` to ${formatDate(data.validUntil)}` : ""}. Your certificate and live status page show the new date.
        </Notice>
      );
    case "rejected":
      return (
        <Notice tone="red" title="Your renewal was not approved">
          {data.renewal?.decisionReason ?? "Contact PSSA for the reasons and what you can do next."}
        </Notice>
      );
  }
}

function LastDecision({ data }: { data: RenewalOverview }) {
  const last = data.lastDecision;
  if (!last || data.renewal) return null;
  if (last.status === "approved") {
    return (
      <Notice tone="green" title="Your last renewal was approved" icon="check">
        Approved on {formatDate(last.decidedAt)}.{data.validUntil ? ` Your membership now runs until ${formatDate(data.validUntil)}.` : ""}
      </Notice>
    );
  }
  return (
    <Notice tone="red" title="Your last renewal was not approved">
      Decided on {formatDate(last.decidedAt)}. {last.decisionReason ?? "Contact PSSA for the reasons and what you can do next."}
    </Notice>
  );
}

function StartPanel({ canStart, onStarted }: { canStart: boolean; onStarted: () => void }) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      await startRenewal();
      onStarted();
    } catch (err) {
      setError(errorMessage(err));
      setStarting(false);
    }
  }

  return (
    <Panel icon="badge" title="Your renewal is open" subtitle="Three steps, done here in the member portal">
      <ol style={{ margin: "0 0 16px", paddingLeft: 20, display: "grid", gap: 6 }}>
        <li>Check your verification documents are still accepted and up to date.</li>
        <li>Pass the refresher assessment.</li>
        <li>Accept the annual declaration, which sends your renewal for review.</li>
      </ol>
      {error && <Notice tone="red" title="We couldn't start your renewal">{error}</Notice>}
      <Button variant="green" iconRight="arrow" loading={starting} disabled={!canStart} onClick={start}>
        Start renewal
      </Button>
    </Panel>
  );
}

function Checklist({ items }: { items: ChecklistItem[] }) {
  return (
    <Panel icon="check" title="Renewal checklist" subtitle={`${items.filter((i) => i.complete).length} of ${items.length} done`}>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 14 }}>
        {items.map((item) => {
          const step = STEPS[item.key];
          return (
            <li key={item.key} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span
                aria-hidden="true"
                style={{
                  flex: "0 0 auto",
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: item.complete ? "var(--green-soft, #eaf8f1)" : "var(--soft, #f4f7f8)",
                  color: item.complete ? "var(--green-dark, #08764c)" : "var(--muted, #647386)",
                }}
              >
                <Icon name={item.complete ? "check" : step.icon} size={16} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700 }}>
                  {step.title} <span className="sr-only">{item.complete ? "(done)" : "(to do)"}</span>
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--muted, #647386)" }}>{item.complete ? step.done : step.todo}</p>
              </div>
              {!item.complete && step.link && (
                <ButtonLink to={step.link.to} variant="outline">
                  {step.link.label}
                </ButtonLink>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function DeclarationPanel({ checklist, resubmit, onSubmitted }: { checklist: ChecklistItem[]; resubmit: boolean; onSubmitted: () => void }) {
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = checklist.filter((i) => i.key !== "declaration").every((i) => i.complete);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!agreed) return setError("Tick the box to confirm the declaration.");
    setSending(true);
    setError(null);
    try {
      await submitDeclaration(DECLARATION.version, DECLARATION.statements.join("\n"));
      onSubmitted();
    } catch (err) {
      setError(errorMessage(err));
      setSending(false);
    }
  }

  return (
    <Panel icon="file" title="Annual declaration" subtitle={ready ? "Last step: this submits your renewal" : "Available once the steps above are done"}>
      <form onSubmit={submit} noValidate style={{ display: "grid", gap: 12 }}>
        <p style={{ margin: 0, fontWeight: 700 }}>I confirm that:</p>
        <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4 }}>
          {DECLARATION.statements.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", opacity: ready ? 1 : 0.6 }}>
          <input type="checkbox" checked={agreed} disabled={!ready} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 4 }} />
          <span>I agree, and I understand that giving false information can lead to my membership being suspended or revoked.</span>
        </label>
        {error && <Notice tone="red" title="We couldn't submit your renewal">{error}</Notice>}
        <div>
          <Button type="submit" variant="green" loading={sending} disabled={!ready || !agreed}>
            {resubmit ? "Resubmit renewal" : "Submit renewal for review"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
