import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { getComplaint, lodgeAppeal, OUTCOME_LABELS, type PublicComplaint } from "../../api/complaints";
import { Icon } from "../../components/Icon";
import { SiteFooter } from "../../components/site/SiteFooter";
import { SiteHeader } from "../../components/site/SiteHeader";
import { COMPLAINT_STATUS, Status } from "../../components/ui";
import { errorMessage } from "../../lib/api";

const REFERENCE = /^PSSA-C-\d{4}-\d{4,}$/;
const formatDate = (value: string) => new Date(value).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
const TYPE_LABELS: Record<string, string> = { misconduct: "Misconduct", impersonation: "Impersonation", badge_misuse: "Badge misuse" };

export default function TrackComplaint() {
  const location = useLocation();
  const initialRef = (location.state as { reference?: string } | null)?.reference ?? "";
  const [reference, setReference] = useState(initialRef);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [complaint, setComplaint] = useState<PublicComplaint | null>(null);
  const [checkedAt, setCheckedAt] = useState<number>(0);

  async function look(e?: FormEvent) {
    e?.preventDefault();
    const ref = reference.trim().toUpperCase();
    if (!REFERENCE.test(ref)) return setError("Reference numbers look like PSSA-C-2026-0184.");
    if (!email.trim()) return setError("Enter the email address you used on the report.");
    setError(null);
    setLoading(true);
    try {
      const data = await getComplaint(ref, email.trim().toLowerCase());
      setComplaint(data.complaint);
      setCheckedAt(Date.now());
    } catch (err) {
      setComplaint(null);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="landing font-body">
      <SiteHeader />
      <main className="bg-soft">
        <div className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-dark">Complaints and concerns</p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-navy">Track your complaint</h1>
          <p className="mt-3 text-muted">Enter the reference number you were given and the email address you used on the report.</p>

          <form onSubmit={look} noValidate className="mt-8 grid gap-4 rounded-2xl border border-line bg-white p-6 sm:grid-cols-2">
            <div>
              <label htmlFor="track-ref" className="mb-1.5 block text-sm font-semibold text-ink">
                Reference number
              </label>
              <input
                id="track-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="PSSA-C-2026-0184"
                autoComplete="off"
                className="w-full rounded-xl border border-line px-4 py-3 font-mono uppercase outline-none focus:border-green"
              />
            </div>
            <div>
              <label htmlFor="track-email" className="mb-1.5 block text-sm font-semibold text-ink">
                Email used on the report
              </label>
              <input
                id="track-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-green"
              />
            </div>
            <div className="sm:col-span-2">
              {error && (
                <p role="alert" className="mb-3 text-sm font-semibold text-[#b42318]">
                  {error}
                </p>
              )}
              <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-xl bg-navy px-6 py-3 font-semibold text-white hover:bg-navy-2 disabled:opacity-60">
                {loading ? "Checking…" : "Check progress"} <Icon name="arrow" size={18} />
              </button>
            </div>
          </form>

          {complaint && (
            <ComplaintView complaint={complaint} email={email.trim().toLowerCase()} checkedAt={checkedAt} onChanged={() => look()} />
          )}

          <p className="mt-8 text-sm text-muted">
            Want to report something new?{" "}
            <Link to="/concern" className="font-semibold text-green-dark underline">
              Raise a concern
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ComplaintView({ complaint: c, email, checkedAt, onChanged }: { complaint: PublicComplaint; email: string; checkedAt: number; onChanged: () => void }) {
  const memberName = c.member ? `${c.member.firstName} ${c.member.lastName}` : (c.subjectLabel ?? null);
  const canAppeal = c.status === "decided" && c.appeals.length === 0 && c.appealDeadline !== null && new Date(c.appealDeadline).getTime() > checkedAt;

  const timeline: { label: string; value: string | null }[] = [
    { label: "Received", value: c.createdAt },
    { label: "Acknowledged", value: c.acknowledgedAt },
    { label: "Member's reply due", value: c.memberResponseDueAt },
    { label: "Decision due", value: c.decisionDueAt },
    { label: "Decided", value: c.decidedAt },
    { label: "Appeal deadline", value: c.appealDeadline },
  ];

  return (
    <section className="mt-8 space-y-6">
      <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-sm text-muted">{c.referenceNumber}</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-navy">
              {TYPE_LABELS[c.type] ?? c.type}
              {memberName ? ` · ${memberName}` : ""}
            </h2>
            {c.member?.tradingName && <p className="text-sm text-muted">Trading as {c.member.tradingName}</p>}
          </div>
          <Status of={COMPLAINT_STATUS} value={c.status} />
        </div>

        <div className="mt-5 flex gap-3 rounded-xl bg-soft p-4">
          <span className="text-green-dark"><Icon name="clock" /></span>
          <p className="text-ink">{c.nextSteps}</p>
        </div>

        {c.outcome && (
          <div className="mt-5 rounded-xl border border-line p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Outcome</p>
            <p className="mt-1 font-semibold text-ink">{OUTCOME_LABELS[c.outcome]}</p>
          </div>
        )}

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          {timeline
            .filter((t) => t.value)
            .map((t) => (
              <div key={t.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{t.label}</dt>
                <dd className="mt-0.5 font-semibold text-ink">{formatDate(t.value!)}</dd>
              </div>
            ))}
        </dl>

        <p className="mt-6 text-sm text-muted">
          {c.evidenceCount} evidence file{c.evidenceCount === 1 ? "" : "s"} on file · {c.responseCount} member response
          {c.responseCount === 1 ? "" : "s"}. Evidence stays private to PSASA reviewers.
        </p>
      </div>

      {c.appeals.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-6">
          <h3 className="font-semibold text-navy">Appeal</h3>
          {c.appeals.map((a) => (
            <p key={a.id} className="mt-2 text-sm text-ink">
              Lodged {formatDate(a.lodgedAt)}.{" "}
              {a.decidedAt ? `Decided ${formatDate(a.decidedAt)}${a.decision ? `: ${a.decision}` : ""}.` : "A different reviewer is looking at it."}
            </p>
          ))}
        </div>
      )}

      {canAppeal && <AppealForm complaintId={c.id} email={email} deadline={c.appealDeadline!} onDone={onChanged} />}
    </section>
  );
}

function AppealForm({ complaintId, email, deadline, onDone }: { complaintId: string; email: string; deadline: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 10) return setError("Explain why you disagree (at least 10 characters).");
    setSending(true);
    setError(null);
    try {
      await lodgeAppeal(complaintId, reason.trim(), email);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-6">
        <div>
          <p className="font-semibold text-navy">Disagree with the outcome?</p>
          <p className="text-sm text-muted">You can appeal until {formatDate(deadline)}. A different reviewer will look at it. It's free.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="rounded-xl border border-line px-5 py-3 font-semibold text-navy hover:border-green">
          Lodge an appeal
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-2xl border border-line bg-white p-6">
      <label htmlFor="appeal-reason" className="font-semibold text-navy">
        Why do you disagree with the outcome?
      </label>
      <textarea
        id="appeal-reason"
        rows={5}
        maxLength={5000}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="mt-3 w-full rounded-xl border border-line p-4 outline-none focus:border-green"
      />
      {error && <p className="mt-2 text-sm font-semibold text-[#b42318]">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="submit" disabled={sending} className="rounded-xl bg-navy px-6 py-3 font-semibold text-white hover:bg-navy-2 disabled:opacity-60">
          {sending ? "Sending…" : "Submit appeal"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-5 py-3 font-semibold text-navy">
          Cancel
        </button>
      </div>
    </form>
  );
}
