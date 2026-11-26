import { useEffect, useState } from "react";
import {
  EXAM_RULES,
  getExamAttempts,
  getExamStatus,
  startExam,
  submitExam,
  type ExamAttempt,
  type ExamQuestion,
  type ExamStatus,
  type ExamType,
} from "../../api/learning";
import { getPracticalState, type PracticalState } from "../../api/practicalAssessment";
import { Button, ButtonLink, ErrorState, LoadingState, Notice, Panel } from "../../components/ui";
import { useAuth } from "../../context/auth-context";
import { errorMessage } from "../../lib/api";

export default function Assessment() {
  const [state, setState] = useState<PracticalState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getPracticalState(controller.signal)
      .then((data) => {
        setState(data);
        setError(null);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      });
    return () => controller.abort();
  }, [reload]);

  if (error) {
    return (
      <ErrorState
        title="We couldn't load the practical assessment"
        text={error}
        onRetry={() => {
          setError(null);
          setReload((n) => n + 1);
        }}
      />
    );
  }
  if (!state) return <LoadingState rows={4} label="Loading practical assessment" />;

  const { submission, assignment } = state;

  return (
    <>
      <div className="workspace-title">
        <div>
          <span>Application · Step 4 of 6</span>
          <h1 style={{ margin: 0 }}>Practical Assessment</h1>
          <p>
            Review the assignment brief below and complete the automated entrance test.
          </p>
        </div>
      </div>

      {!submission.tutorialWatched && (
        <Notice tone="amber" title="Watch the 1-minute tutorial first">
          Please watch and complete the practical assessment tutorial before starting your assessment.{" "}
          <ButtonLink to="/member/tutorials" variant="outline" style={{ marginLeft: 8 }}>
            Go to tutorial
          </ButtonLink>
        </Notice>
      )}

      <div style={{ marginBottom: 20 }}>
        <EntranceAutomatedTest onCompleted={() => setReload((n) => n + 1)} />
      </div>

      <Panel
        title={`Assignment Brief (v${assignment.version})`}
        action={
          <a
            href={assignment.downloadUrl}
            download={assignment.fileName}
            style={{ fontSize: 13, fontWeight: 600, color: "var(--green-dark, #0f764b)", textDecoration: "underline" }}
          >
            Download Assignment PDF
          </a>
        }
      >
        <p style={{ marginTop: 0, fontSize: 13, color: "var(--muted, #647386)" }}>
          This is a fictional simulation. Do not contact a real customer, place an order, spend money, or share anyone&apos;s personal information.
        </p>
        <div style={{ border: "1px solid #d9e1e8", borderRadius: 12, overflow: "hidden", background: "#f8fafb" }}>
          <iframe
            title="PSSA Practical Assignment Brief"
            src={assignment.inlineUrl}
            style={{ width: "100%", height: 520, border: 0, display: "block" }}
          />
        </div>
      </Panel>
    </>
  );
}

export function EntranceAutomatedTest({
  tone = "light",
  onCompleted,
}: {
  tone?: "light" | "glass";
  onCompleted?: () => void;
}) {
  const { user } = useAuth();
  const [status, setStatus] = useState<ExamStatus | null>(null);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [hasOpenAttempt, setHasOpenAttempt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [view, setView] = useState<View>({ kind: "overview" });
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getExamStatus(controller.signal, "entrance"), getExamAttempts(controller.signal)])
      .then(([s, a]) => {
        const mine = a.attempts.filter((x) => x.type === "entrance");
        const loadedAt = Date.now();
        setStatus(s);
        setAttempts(mine);
        setHasOpenAttempt(mine.some((x) => !x.submittedAt && new Date(x.expiresAt).getTime() > loadedAt));
        setError(null);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      });
    return () => controller.abort();
  }, [reload]);

  const begin = async () => {
    setStarting(true);
    setStartError(null);
    setAnswers({});
    setSubmitError(null);
    try {
      const sitting = await startExam("entrance");
      setView({ kind: "taking", sitting });
    } catch (err) {
      setStartError(errorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  const handleSubmitTest = async (sitting: Sitting) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submitExam(sitting.attempt.id, answers);
      setView({ kind: "result", attempt: res.attempt, total: sitting.questions.length });
      setReload((n) => n + 1);
      onCompleted?.();
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const isGlass = tone === "glass";
  const cardClass = isGlass
    ? "rounded-2xl border border-white/15 bg-white/[0.06] p-5 text-white space-y-4"
    : undefined;

  const content = (
    <>
      {error && (
        <div className={isGlass ? "rounded-xl border border-red-400/40 bg-red-950/50 p-3 text-xs text-red-100" : ""}>
          {isGlass ? error : <Notice tone="red" title="Could not load automated test">{error}</Notice>}
        </div>
      )}

      {!status && !error && (
        <p className={isGlass ? "text-xs text-white/70" : ""} style={isGlass ? undefined : { fontSize: 13, color: "var(--muted, #647386)", margin: 0 }}>
          Loading automated assessment questions…
        </p>
      )}

      {status && view.kind === "taking" && (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <strong style={{ fontSize: 14 }}>
              Automated Assessment ({Object.keys(answers).length}/{view.sitting.questions.length} answered)
            </strong>
            <span style={{ fontSize: 12, opacity: 0.75 }}>
              {user?.email} · {EXAM_RULES.passPercent}% pass mark
            </span>
          </div>
          {submitError && (
            <div className={isGlass ? "rounded-xl border border-red-400/40 bg-red-950/50 p-3 text-xs text-red-100" : ""}>
              {isGlass ? submitError : <Notice tone="red" title="Submission failed">{submitError}</Notice>}
            </div>
          )}
          <div style={{ display: "grid", gap: 12 }}>
            {view.sitting.questions.map((q, idx) => (
              <div
                key={q.id}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: isGlass ? "1px solid rgba(255,255,255,0.14)" : "1px solid #d9e1e8",
                  background: isGlass ? "rgba(255,255,255,0.04)" : "#fbfcfd",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {idx + 1}. {q.prompt}
                  </span>
                  {q.topic && (
                    <span style={{ fontSize: 11, opacity: 0.7, whiteSpace: "nowrap" }}>{q.topic}</span>
                  )}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt.id;
                    return (
                      <label
                        key={opt.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          cursor: "pointer",
                          fontSize: 13,
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: selected
                            ? "1px solid #18a269"
                            : isGlass
                              ? "1px solid rgba(255,255,255,0.1)"
                              : "1px solid #e2e8f0",
                          background: selected
                            ? isGlass
                              ? "rgba(24,162,105,0.2)"
                              : "#f1fbf6"
                            : "transparent",
                        }}
                      >
                        <input
                          type="radio"
                          name={`entrance-${q.id}`}
                          checked={selected}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                          className="accent-green"
                          style={{ marginTop: 3 }}
                        />
                        <span>{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div>
            {isGlass ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmitTest(view.sitting)}
                className="inline-flex items-center gap-2 rounded-full bg-green px-6 py-2.5 text-xs font-semibold text-white shadow-[0_12px_28px_-10px_rgba(24,162,105,0.8)] transition hover:bg-green-dark disabled:opacity-50"
              >
                {submitting ? "Submitting test..." : "Submit automated test"}
              </button>
            ) : (
              <Button type="button" variant="dark" disabled={submitting} onClick={() => void handleSubmitTest(view.sitting)}>
                {submitting ? "Submitting test..." : "Submit automated test"}
              </Button>
            )}
          </div>
        </div>
      )}

      {status && view.kind === "result" && (
        <div className={isGlass ? "rounded-xl border border-green/40 bg-green/15 p-4 text-sm text-white space-y-2" : ""} style={isGlass ? undefined : { display: "grid", gap: 10 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>
            {view.attempt.passed ? "Automated test passed!" : "Automated test submitted"}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 13 }}>
            Score: {view.attempt.score ?? 0} of {view.total} ({view.attempt.percent ?? 0}%).
            {view.attempt.criticalFailed ? " A critical conduct question was missed." : ""}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
            {!isGlass && (
              <ButtonLink to="/member" variant="dark" iconRight="arrow">
                Continue to Step 05: Agreement &amp; Submit
              </ButtonLink>
            )}
            {!view.attempt.passed && status.canStart && (
              <Button type="button" variant="outline" onClick={() => setView({ kind: "overview" })}>
                Back to test overview
              </Button>
            )}
          </div>
        </div>
      )}

      {status && view.kind === "overview" && (
        <div style={{ display: "grid", gap: 10 }}>
          {startError && (
            <div className={isGlass ? "rounded-xl border border-red-400/40 bg-red-950/50 p-3 text-xs text-red-100" : ""}>
              {isGlass ? startError : <Notice tone="red" title="Could not start test">{startError}</Notice>}
            </div>
          )}
          {status.passed ? (
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: isGlass ? "#6ee7b7" : "#0f764b" }}>
              Automated entrance test passed{attempts[0]?.percent != null ? ` (${attempts[0].percent}%)` : ""}.
            </p>
          ) : status.canStart || hasOpenAttempt ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
                Complete the automated assessment questions ({EXAM_RULES.passPercent}% pass mark).
              </p>
              {isGlass ? (
                <button
                  type="button"
                  disabled={starting}
                  onClick={() => void begin()}
                  className="inline-flex items-center gap-2 rounded-full bg-green px-5 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_-8px_rgba(24,162,105,0.8)] transition hover:bg-green-dark disabled:opacity-50"
                >
                  {starting ? "Loading questions..." : hasOpenAttempt ? "Resume automated test" : "Start automated test"}
                </button>
              ) : (
                <Button type="button" variant="dark" disabled={starting} onClick={() => void begin()}>
                  {starting ? "Loading questions..." : hasOpenAttempt ? "Resume automated test" : "Start automated test"}
                </Button>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>
              {status.reason ?? "Automated test is not available yet."}
            </p>
          )}
          {attempts.length > 0 && !status.passed && (
            <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>
              Latest attempt: {attempts[0].submittedAt ? formatDate(attempts[0].submittedAt) : "In progress"} — {attempts[0].percent ?? 0}%
            </p>
          )}
        </div>
      )}
    </>
  );

  if (isGlass) {
    return (
      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-white">Automated Entrance Test (MCQ)</p>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-green">
            {EXAM_RULES.passPercent}% pass
          </span>
        </div>
        {content}
      </div>
    );
  }

  return (
    <Panel title="Automated Entrance Test (MCQ)" action={<span style={{ fontSize: 12, color: "var(--muted, #647386)" }}>{EXAM_RULES.passPercent}% pass mark</span>}>
      {content}
    </Panel>
  );
}

/* Kept for annual refresher MCQ assessments (/member/renewal/refresher) */
type Sitting = { attempt: ExamAttempt; questions: ExamQuestion[]; expiresAt: string };
type View = { kind: "overview" } | { kind: "taking"; sitting: Sitting } | { kind: "result"; attempt: ExamAttempt; total: number };

const formatDate = (value: string) => new Date(value).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

export function ExamPage({ type }: { type: ExamType }) {
  const [status, setStatus] = useState<ExamStatus | null>(null);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [hasOpenAttempt, setHasOpenAttempt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [view, setView] = useState<View>({ kind: "overview" });
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getExamStatus(controller.signal, type), getExamAttempts(controller.signal)])
      .then(([s, a]) => {
        const mine = a.attempts.filter((x) => x.type === type);
        const loadedAt = Date.now();
        setStatus(s);
        setAttempts(mine);
        setHasOpenAttempt(mine.some((x) => !x.submittedAt && new Date(x.expiresAt).getTime() > loadedAt));
        setError(null);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      });
    return () => controller.abort();
  }, [reload, type]);

  if (error) {
    return (
      <ErrorState
        title="We couldn't load the refresher assessment"
        text={error}
        onRetry={() => {
          setError(null);
          setReload((n) => n + 1);
        }}
      />
    );
  }
  if (!status) return <LoadingState rows={4} label="Loading refresher assessment" />;

  const begin = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const sitting = await startExam(type);
      setView({ kind: "taking", sitting });
    } catch (err) {
      setStartError(errorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  return (
    <>
      <div className="workspace-title">
        <div>
          <span>Annual renewal</span>
          <h1>Refresher assessment</h1>
          <p>A short test on the current Code of Conduct. You need to pass it once each year to renew your membership.</p>
        </div>
      </div>

      {view.kind === "taking" && (
        <ExamSitting
          sitting={view.sitting}
          onSubmitted={(attempt) => {
            setView({ kind: "result", attempt, total: view.sitting.questions.length });
            setReload((n) => n + 1);
          }}
        />
      )}

      {view.kind === "result" && (
        <Panel title={view.attempt.passed ? "Refresher passed" : "Not passed"}>
          <p>
            Score: {view.attempt.score ?? 0} of {view.total} ({view.attempt.percent ?? 0}%).
          </p>
          <ButtonLink to="/member/renewal" variant="dark">
            Back to renewal
          </ButtonLink>
        </Panel>
      )}

      {view.kind === "overview" && (
        <Panel title="Refresher status">
          {startError && <Notice tone="red" title="Could not start">{startError}</Notice>}
          {status.passed ? (
            <Notice tone="green" title="You've passed the refresher assessment">
              This counts towards your renewal.
            </Notice>
          ) : status.canStart || hasOpenAttempt ? (
            <Button type="button" variant="dark" disabled={starting} onClick={() => void begin()}>
              {starting ? "Starting..." : hasOpenAttempt ? "Resume refresher" : "Start refresher"}
            </Button>
          ) : (
            <Notice tone="amber" title="Unavailable">{status.reason ?? "Not available yet."}</Notice>
          )}
          {attempts.length > 0 && (
            <p style={{ fontSize: 13, color: "var(--muted, #647386)", marginTop: 12 }}>
              Latest attempt: {attempts[0].submittedAt ? formatDate(attempts[0].submittedAt) : "In progress"} — {attempts[0].percent ?? 0}%
            </p>
          )}
        </Panel>
      )}
    </>
  );
}

function ExamSitting({ sitting, onSubmitted }: { sitting: Sitting; onSubmitted: (a: ExamAttempt) => void }) {
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answered = Object.keys(answers).length;
  const total = sitting.questions.length;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitExam(sitting.attempt.id, answers);
      onSubmitted(res.attempt);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Panel title={`Refresher (${answered}/${total} answered)`} action={<span style={{ fontSize: 12 }}>{user?.email} · {EXAM_RULES.passPercent}% pass</span>}>
      {error && <Notice tone="red" title="Submission failed">{error}</Notice>}
      <div style={{ display: "grid", gap: 16 }}>
        {sitting.questions.map((q, idx) => (
          <div key={q.id} style={{ padding: 12, borderRadius: 10, border: "1px solid #d9e1e8" }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{idx + 1}. {q.prompt}</div>
            {q.options.map((opt) => (
              <label key={opt.id} style={{ display: "flex", gap: 8, marginBottom: 4, cursor: "pointer" }}>
                <input
                  type="radio"
                  name={q.id}
                  checked={answers[q.id] === opt.id}
                  onChange={() => setAnswers({ ...answers, [q.id]: opt.id })}
                />
                <span>{opt.text}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <Button type="button" variant="dark" disabled={submitting} onClick={() => void submit()}>
          {submitting ? "Submitting..." : "Submit answers"}
        </Button>
      </div>
    </Panel>
  );
}
