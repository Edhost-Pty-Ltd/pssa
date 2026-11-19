import { useEffect, useRef, useState, type FormEvent } from "react";
import { getMyComplaints, lodgeAppeal, MAX_EVIDENCE_FILES, OUTCOME_LABELS, respondToComplaint, type PublicComplaint } from "../../api/complaints";
import { ACCEPT_ATTRIBUTE, ACCEPTED_FILE_TYPES, MAX_FILE_MB } from "../../api/documents";
import { Icon } from "../../components/Icon";
import { Button, COMPLAINT_STATUS, EmptyState, ErrorState, LoadingState, Notice, Panel, Status } from "../../components/ui";
import { errorMessage } from "../../lib/api";

// Complaints about you: GET /api/member/complaints, POST /api/member/complaints/:id/response,
// POST /api/complaints/:id/appeal (docs/api-contract.md 6.8).
// The member sees the case and can give their side. They never see the complainant's contact details
// or the private evidence.

const formatDate = (value: string) => new Date(value).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
const TYPE_LABELS: Record<string, string> = { misconduct: "Misconduct", impersonation: "Impersonation", badge_misuse: "Badge misuse" };
const CAN_RESPOND = new Set(["awaiting_member_response", "under_review"]);

type Loaded = { complaints: PublicComplaint[]; loadedAt: number };

export default function MemberComplaints() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getMyComplaints(controller.signal)
      .then(({ complaints }) => {
        setData({ complaints, loadedAt: Date.now() });
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
        title="We couldn't load your complaints"
        text={error}
        onRetry={() => {
          setError(null);
          refresh();
        }}
      />
    );
  }
  if (!data) return <LoadingState rows={2} label="Loading complaints" />;

  const waiting = data.complaints.filter((c) => c.status === "awaiting_member_response").length;

  return (
    <>
      <div className="workspace-title">
        <div>
          <span>Membership</span>
          <h1>Complaints about you</h1>
          <p>If a customer raises a concern about you, it appears here. You'll always get a chance to give your side.</p>
        </div>
      </div>

      <div style={{ display: "grid", gap: 18, maxWidth: 860 }}>
        {data.complaints.length === 0 ? (
          <EmptyState icon="check" title="No complaints" text="There are no complaints about you. Keep following the Code of Conduct." />
        ) : (
          <>
            {waiting > 0 && (
              <Notice tone="amber" title={`${waiting} complaint${waiting === 1 ? " is" : "s are"} waiting for your response`}>
                Reply before the due date. If you don't, PSSA will decide using the information it has.
              </Notice>
            )}
            {data.complaints.map((c) => (
              <ComplaintCard key={c.id} complaint={c} now={data.loadedAt} onChanged={refresh} />
            ))}
          </>
        )}
      </div>
    </>
  );
}

function ComplaintCard({ complaint: c, now, onChanged }: { complaint: PublicComplaint; now: number; onChanged: () => void }) {
  const canRespond = CAN_RESPOND.has(c.status);
  const canAppeal = c.status === "decided" && c.appeals.length === 0 && c.appealDeadline !== null && new Date(c.appealDeadline).getTime() > now;
  const overdue = c.status === "awaiting_member_response" && c.memberResponseDueAt !== null && new Date(c.memberResponseDueAt).getTime() < now;

  return (
    <Panel
      icon="flag"
      title={`${TYPE_LABELS[c.type] ?? c.type}${c.referenceNumber ? ` · ${c.referenceNumber}` : ""}`}
      subtitle={`Received ${formatDate(c.createdAt)}`}
      action={<Status of={COMPLAINT_STATUS} value={c.status} />}
    >
      <div style={{ display: "grid", gap: 14 }}>
        {c.description && (
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700 }}>What was reported</p>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{c.description}</p>
          </div>
        )}

        <p style={{ margin: 0, fontSize: 14 }}>
          <Icon name="clock" size={14} /> {c.nextSteps}
        </p>

        <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, margin: 0 }}>
          {c.memberResponseDueAt && <Dated label="Your reply is due" value={c.memberResponseDueAt} />}
          {c.decisionDueAt && <Dated label="Decision due" value={c.decisionDueAt} />}
          {c.decidedAt && <Dated label="Decided" value={c.decidedAt} />}
          {c.appealDeadline && <Dated label="Appeal by" value={c.appealDeadline} />}
        </dl>

        {overdue && (
          <Notice tone="red" title="Your reply is overdue">
            You can still reply while the case is open, but do it as soon as possible.
          </Notice>
        )}

        {c.outcome && (
          <Notice tone={c.outcome === "no_breach" ? "green" : "amber"} title={`Outcome: ${OUTCOME_LABELS[c.outcome]}`}>
            {c.outcome === "no_breach" ? "PSSA found no breach of the Code of Conduct." : "PSSA will contact you about what happens next."}
          </Notice>
        )}

        {c.responseCount > 0 && (
          <p style={{ margin: 0, fontSize: 14, color: "var(--muted, #647386)" }}>
            You've sent {c.responseCount} response{c.responseCount === 1 ? "" : "s"} on this case.
          </p>
        )}

        {c.appeals.length > 0 && (
          <p style={{ margin: 0, fontSize: 14 }}>
            An appeal was lodged on {formatDate(c.appeals[0].lodgedAt)}.{" "}
            {c.appeals[0].decidedAt ? `It was decided on ${formatDate(c.appeals[0].decidedAt)}.` : "A different reviewer is looking at it."}
          </p>
        )}

        {canRespond && <ResponseForm complaintId={c.id} onSent={onChanged} />}
        {canAppeal && <MemberAppeal complaintId={c.id} deadline={c.appealDeadline!} onSent={onChanged} />}
      </div>
    </Panel>
  );
}

function Dated({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted, #647386)" }}>{label}</dt>
      <dd style={{ margin: "2px 0 0", fontWeight: 700 }}>{formatDate(value)}</dd>
    </div>
  );
}

function ResponseForm({ complaintId, onSent }: { complaintId: string; onSent: () => void }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(list: FileList | null) {
    const picked = Array.from(list ?? []);
    for (const file of picked) {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) return setError(`"${file.name}" isn't a PDF, JPG, PNG or WebP file.`);
      if (file.size > MAX_FILE_MB * 1024 * 1024) return setError(`"${file.name}" is larger than ${MAX_FILE_MB} MB.`);
    }
    setError(files.length + picked.length > MAX_EVIDENCE_FILES ? `You can attach up to ${MAX_EVIDENCE_FILES} files.` : null);
    setFiles([...files, ...picked].slice(0, MAX_EVIDENCE_FILES));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (body.trim().length < 10) return setError("Write your response (at least 10 characters).");
    setSending(true);
    setError(null);
    try {
      await respondToComplaint(complaintId, body.trim(), files);
      onSent();
    } catch (err) {
      setError(errorMessage(err));
      setSending(false);
    }
  }

  if (!open) {
    return (
      <div>
        <Button variant="green" icon="file" onClick={() => setOpen(true)}>
          Give your response
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate style={{ display: "grid", gap: 10 }}>
      <label htmlFor={`response-${complaintId}`} style={{ fontWeight: 700 }}>
        Your response
      </label>
      <textarea
        id={`response-${complaintId}`}
        rows={6}
        maxLength={5000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Explain what happened from your side. Include dates, what was agreed and anything you did to resolve it."
        style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid var(--line, #dde4e9)", font: "inherit" }}
      />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {files.map((file, i) => (
          <span key={`${file.name}-${i}`} style={{ fontSize: 14 }}>
            <Icon name="file" size={14} /> {file.name}{" "}
            <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} style={{ border: 0, background: "none", color: "#b42318", fontWeight: 700 }}>
              Remove
            </button>
          </span>
        ))}
        {files.length < MAX_EVIDENCE_FILES && (
          <Button variant="outline" icon="upload" onClick={() => inputRef.current?.click()}>
            Attach a file
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={ACCEPT_ATTRIBUTE}
          multiple
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <p style={{ margin: 0, fontSize: 13, color: "var(--muted, #647386)" }}>Only PSSA reviewers see your response and files.</p>
      {error && <Notice tone="red" title="We couldn't send your response">{error}</Notice>}
      <div style={{ display: "flex", gap: 10 }}>
        <Button type="submit" variant="green" loading={sending}>
          Send response
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function MemberAppeal({ complaintId, deadline, onSent }: { complaintId: string; deadline: string; onSent: () => void }) {
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
      await lodgeAppeal(complaintId, reason.trim());
      onSent();
    } catch (err) {
      setError(errorMessage(err));
      setSending(false);
    }
  }

  if (!open) {
    return (
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Appeal this decision
        </Button>
        <span style={{ fontSize: 14, color: "var(--muted, #647386)" }}>Free. Lodge it by {formatDate(deadline)}. A different reviewer decides.</span>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate style={{ display: "grid", gap: 10 }}>
      <label htmlFor={`appeal-${complaintId}`} style={{ fontWeight: 700 }}>
        Why do you disagree with the outcome?
      </label>
      <textarea
        id={`appeal-${complaintId}`}
        rows={5}
        maxLength={5000}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid var(--line, #dde4e9)", font: "inherit" }}
      />
      {error && <Notice tone="red" title="We couldn't lodge your appeal">{error}</Notice>}
      <div style={{ display: "flex", gap: 10 }}>
        <Button type="submit" variant="dark" loading={sending}>
          Submit appeal
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
