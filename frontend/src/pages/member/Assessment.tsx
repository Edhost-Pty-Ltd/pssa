import { useEffect, useRef, useState } from "react";
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
import { Icon } from "../../components/Icon";
import { Button, ButtonLink, ErrorState, LoadingState, Notice, Panel, StatusBadge } from "../../components/ui";
import { useAuth } from "../../context/auth-context";
import { errorMessage } from "../../lib/api";

type Sitting = { attempt: ExamAttempt; questions: ExamQuestion[]; expiresAt: string };
type View = { kind: "overview" } | { kind: "taking"; sitting: Sitting } | { kind: "result"; attempt: ExamAttempt; total: number };

const formatDate = (value: string) => new Date(value).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

const COPY: Record<ExamType, {
  kicker: string;
  title: string;
  intro: string;
  passedTitle: string;
  passedText: string;
  lockedLink: { to: string; label: string };
  resultPassTitle: string;
  resultPassText: string;
  doneLink: string;
  doneLabel: string;
  retryLink: string;
  retryLabel: string;
}> = {
  entrance: {
    kicker: "Application · Step 4 of 6",
    title: "Entrance assessment",
    intro: "A short test on the PSASA Code of Conduct. You need to pass it before your application goes to review.",
    passedTitle: "You've passed the entrance assessment",
    passedText: "Nothing more to do here. Your application moves on to review once every other step is complete.",
    lockedLink: { to: "/member/tutorials", label: "Go to tutorials" },
    resultPassTitle: "Your application can move to review",
    resultPassText: "We'll let you know once a PSASA reviewer has checked everything.",
    doneLink: "/member",
    doneLabel: "Return to your application",
    retryLink: "/member/tutorials",
    retryLabel: "Review the lessons",
  },
  refresher: {
    kicker: "Annual renewal",
    title: "Refresher assessment",
    intro: "A short test on the current Code of Conduct. You need to pass it once each year to renew your membership.",
    passedTitle: "You've passed the refresher assessment",
    passedText: "This counts for this year's renewal. Go back to Renewal to finish the remaining steps.",
    lockedLink: { to: "/member/renewal", label: "Back to renewal" },
    resultPassTitle: "This counts towards your renewal",
    resultPassText: "Go back to Renewal to finish the remaining steps.",
    doneLink: "/member/renewal",
    doneLabel: "Back to renewal",
    retryLink: "/member/tutorials",
    retryLabel: "Watch the lessons again",
  },
};

export default function Assessment() {
  return <ExamPage type="entrance" />;
}

export function ExamPage({ type }: { type: ExamType }) {
  const copy = COPY[type];
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

  async function begin() {
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
  }

  if (view.kind === "taking") {
    return (
      <TakeExam
        sitting={view.sitting}
        onExit={() => setView({ kind: "overview" })}
        onDone={(attempt) => {
          setView({ kind: "result", attempt, total: view.sitting.questions.length });
          setReload((n) => n + 1);
        }}
      />
    );
  }
  if (view.kind === "result") {
    return <Result attempt={view.attempt} total={view.total} status={status} copy={copy} onBack={() => setView({ kind: "overview" })} />;
  }

  if (error) {
    return (
      <ErrorState
        title="We couldn't load the assessment"
        text={error}
        onRetry={() => {
          setError(null);
          setReload((n) => n + 1);
        }}
      />
    );
  }
  if (!status) return <LoadingState rows={3} label="Loading the assessment" />;

  return (
    <>
      <div className="workspace-title">
        <div>
          <span>{copy.kicker}</span>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>
        {status.passed && <StatusBadge tone="green">Passed</StatusBadge>}
      </div>

      <div style={{ display: "grid", gap: 18, maxWidth: 820 }}>
        {status.passed ? (
          <Notice tone="green" title={copy.passedTitle}>
            {copy.passedText}
          </Notice>
        ) : status.canStart ? (
          <Notice tone="blue" title={hasOpenAttempt ? "You have an assessment in progress" : "You're ready to take the assessment"}>
            {hasOpenAttempt
              ? "Continue where you left off. The timer kept running while you were away."
              : "Set aside 45 minutes somewhere quiet. Once you start, the timer can't be paused."}
          </Notice>
        ) : (
          <Notice tone="amber" title="The assessment isn't open yet">
            {status.reason ?? "Complete the earlier steps first."}
            {status.retakeOpensAt ? ` You can try again from ${formatDate(status.retakeOpensAt)}.` : ""}
          </Notice>
        )}

        <Panel icon="book" title="How the assessment works">
          <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
            <li>
              {EXAM_RULES.questions} multiple-choice questions, {EXAM_RULES.minutes} minutes.
            </li>
            <li>
              To pass you need at least {EXAM_RULES.passPercent}% <b>and</b> every critical question right.
            </li>
            <li>Answers submitted after the time runs out are scored as a fail.</li>
            <li>If you don't pass, you can retake it once, after at least seven days.</li>
            <li>After two failed attempts, further training and a reviewer's approval are needed.</li>
          </ul>
        </Panel>

        {startError && <Notice tone="red" title="We couldn't start the assessment">{startError}</Notice>}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {!status.passed && (
            <Button variant="green" onClick={begin} loading={starting} disabled={!status.canStart} iconRight="arrow">
              {hasOpenAttempt ? "Continue assessment" : "Start assessment"}
            </Button>
          )}
          {!status.canStart && !status.passed && (
            <ButtonLink to={copy.lockedLink.to} variant="outline">
              {copy.lockedLink.label}
            </ButtonLink>
          )}
        </div>

        {attempts.some((a) => a.submittedAt) && <History attempts={attempts.filter((a) => a.submittedAt)} />}
      </div>
    </>
  );
}

/* Taking the exam */

const storageKey = (attemptId: string) => `pssa-exam-${attemptId}`;

function loadAnswers(attemptId: string): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(storageKey(attemptId)) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function tryStorage(action: () => void) {
  try {
    action();
  } catch {
    return;
  }
}

function TakeExam({ sitting, onExit, onDone }: { sitting: Sitting; onExit: () => void; onDone: (attempt: ExamAttempt) => void }) {
  const { questions, attempt } = sitting;
  const deadline = new Date(sitting.expiresAt).getTime();
  const [answers, setAnswers] = useState<Record<string, string>>(() => loadAnswers(attempt.id));
  const [index, setIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);

  const remaining = Math.max(0, deadline - now);
  const answered = questions.filter((q) => answers[q.id]).length;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function submit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError(null);
    submitExam(attempt.id, answers)
      .then(({ attempt: result }) => {
        tryStorage(() => sessionStorage.removeItem(storageKey(attempt.id)));
        onDone(result);
      })
      .catch((err) => {
        submittedRef.current = false;
        setSubmitting(false);
        setError(errorMessage(err));
      });
  }

  useEffect(() => {
    if (remaining === 0 && !submittedRef.current) {
      const t = window.setTimeout(submit, 0);
      return () => window.clearTimeout(t);
    }
  });

  function choose(questionId: string, optionId: string) {
    const next = { ...answers, [questionId]: optionId };
    setAnswers(next);
    tryStorage(() => sessionStorage.setItem(storageKey(attempt.id), JSON.stringify(next)));
  }

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const clock = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const lowTime = remaining < 5 * 60000;

  const top = (
    <>
      <div className="exam-top">
        <button type="button" onClick={onExit}>
          ← Leave for now
        </button>
        <span>{reviewing ? "Review your answers" : `Question ${index + 1} of ${questions.length}`}</span>
        <b style={lowTime ? { color: "#b42318" } : undefined} role="timer" aria-live={lowTime ? "polite" : "off"}>
          {clock} remaining
        </b>
      </div>
      <div className="exam-progress">
        <i style={{ width: `${(answered / questions.length) * 100}%` }} />
      </div>
    </>
  );

  if (remaining === 0 || submitting) {
    return (
      <div className="exam-wrap">
        {top}
        <section className="exam-card">
          <LoadingState rows={2} label={remaining === 0 ? "Time's up. Handing in your answers" : "Handing in your answers"} />
          {error && (
            <Notice tone="red" title="We couldn't hand in your answers">
              {error}
            </Notice>
          )}
        </section>
      </div>
    );
  }

  if (reviewing) {
    const unanswered = questions.length - answered;
    return (
      <div className="exam-wrap">
        {top}
        <section className="exam-card">
          <span className="question-no">CHECK BEFORE YOU SUBMIT</span>
          <h1>
            You've answered {answered} of {questions.length} questions.
          </h1>
          {unanswered > 0 && (
            <Notice tone="amber" title={`${unanswered} question${unanswered === 1 ? "" : "s"} still unanswered`}>
              Unanswered questions count as wrong. Tap a number to go back to it.
            </Notice>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "18px 0" }}>
            {questions.map((q, i) => (
              <button
                type="button"
                key={q.id}
                onClick={() => {
                  setIndex(i);
                  setReviewing(false);
                }}
                aria-label={`Question ${i + 1}${answers[q.id] ? ", answered" : ", not answered"}`}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  border: "1px solid var(--line, #dde4e9)",
                  background: answers[q.id] ? "var(--green-soft, #eaf8f1)" : "white",
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {error && <Notice tone="red" title="We couldn't hand in your answers">{error}</Notice>}
          <div className="exam-actions">
            <Button variant="ghost" onClick={() => setReviewing(false)}>
              Back to questions
            </Button>
            <Button variant="green" onClick={submit} iconRight="check">
              Submit assessment
            </Button>
          </div>
        </section>
      </div>
    );
  }

  const q = questions[index];
  const last = index === questions.length - 1;

  return (
    <div className="exam-wrap">
      {top}
      <section className="exam-card">
        <span className="question-no">
          QUESTION {String(index + 1).padStart(2, "0")}
          {q.topic ? ` · ${q.topic.toUpperCase()}` : ""}
        </span>
        <h1 id={`q-${q.id}`}>{q.prompt}</h1>
        <div className="answer-list" role="radiogroup" aria-labelledby={`q-${q.id}`}>
          {q.options.map((option, i) => {
            const picked = answers[q.id] === option.id;
            return (
              <button
                type="button"
                role="radio"
                aria-checked={picked}
                className={picked ? "selected" : ""}
                onClick={() => choose(q.id, option.id)}
                key={option.id}
              >
                <span>{String.fromCharCode(65 + i)}</span>
                {option.text}
                <i>{picked && <Icon name="check" />}</i>
              </button>
            );
          })}
        </div>
        <div className="exam-actions">
          <Button variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
            Previous
          </Button>
          {last ? (
            <Button variant="dark" onClick={() => setReviewing(true)} iconRight="arrow">
              Review answers
            </Button>
          ) : (
            <Button variant="dark" onClick={() => setIndex((i) => i + 1)} iconRight="arrow">
              Next question
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

/* Result */

function Result({
  attempt,
  total,
  status,
  copy,
  onBack,
}: {
  attempt: ExamAttempt;
  total: number;
  status: ExamStatus | null;
  copy: (typeof COPY)[ExamType];
  onBack: () => void;
}) {
  const { user } = useAuth();
  const passed = attempt.passed === true;
  return (
    <div className="result-wrap">
      <section className={`result-card ${passed ? "" : "failed"}`}>
        <span className="result-icon">
          <Icon name={passed ? "check" : "close"} size={36} />
        </span>
        <span className="kicker">{passed ? "Assessment passed" : "Not passed yet"}</span>
        <h1>{passed ? `Well done${user?.firstName ? `, ${user.firstName}` : ""}.` : "Not this time."}</h1>
        <p>
          {passed
            ? "You showed a sound understanding of the PSASA Code of Conduct."
            : attempt.criticalFailed
              ? "You missed at least one critical question. Those must all be right to pass, whatever the overall score."
              : `You need at least ${EXAM_RULES.passPercent}% to pass. Go over the lessons before your next attempt.`}
        </p>
        <div className="score-ring">
          <strong>{attempt.percent ?? 0}%</strong>
          <span>Score</span>
        </div>
        <div className="score-meta">
          <div>
            <span>Pass mark</span>
            <b>{EXAM_RULES.passPercent}%</b>
          </div>
          <div>
            <span>Correct answers</span>
            <b>
              {attempt.score ?? 0} of {total}
            </b>
          </div>
          <div>
            <span>Critical questions</span>
            <b>{attempt.criticalFailed ? "Missed" : "All right"}</b>
          </div>
        </div>
        {passed ? (
          <Notice tone="green" title={copy.resultPassTitle}>
            {copy.resultPassText}
          </Notice>
        ) : (
          <Notice tone="amber" title="You can try again later" icon="clock">
            {status?.retakeOpensAt
              ? `Your retake opens on ${formatDate(status.retakeOpensAt)}.`
              : "A retake opens at least seven days after this attempt."}
          </Notice>
        )}
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          <ButtonLink to={passed ? copy.doneLink : copy.retryLink} variant="dark" full>
            {passed ? copy.doneLabel : copy.retryLabel}
          </ButtonLink>
          <Button variant="ghost" full onClick={onBack}>
            Back to the assessment page
          </Button>
        </div>
      </section>
    </div>
  );
}

function History({ attempts }: { attempts: ExamAttempt[] }) {
  return (
    <Panel icon="file" title="Your attempts">
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
        {attempts.map((a, i) => (
          <li key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span>
              Attempt {attempts.length - i} · {a.submittedAt ? formatDate(a.submittedAt) : ""}
            </span>
            <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <b>{a.percent ?? 0}%</b>
              <StatusBadge tone={a.passed ? "green" : "red"}>{a.passed ? "Passed" : "Not passed"}</StatusBadge>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
