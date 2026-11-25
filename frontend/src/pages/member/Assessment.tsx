import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
import {
  deletePracticalEvidence,
  getPracticalState,
  savePracticalDraft,
  submitPracticalAssessment,
  uploadPracticalEvidence,
  type PracticalAnswers,
  type PracticalOptionItem,
  type PracticalState,
  type PracticalTrack,
} from "../../api/practicalAssessment";
import { Button, ButtonLink, ErrorState, LoadingState, Notice, Panel, StatusBadge } from "../../components/ui";
import type { NoticeTone } from "../../components/ui/Notice";
import type { StatusTone } from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/auth-context";
import { ApiError, errorMessage } from "../../lib/api";

const FIELD_STYLE: CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid #cfd8e3",
  backgroundColor: "#ffffff",
  color: "#0f233c",
  fontFamily: "inherit",
  fontSize: 14,
};

const COMPACT_FIELD_STYLE: CSSProperties = {
  ...FIELD_STYLE,
  padding: 9,
  borderRadius: 8,
};

type SaveStatus = "idle" | "saving" | "saved" | "offline";

interface LocalPracticalDraft {
  serviceTrack: PracticalTrack | null;
  answers: PracticalAnswers;
  savedAt: string;
}

const EMPTY_OPTION = (): PracticalOptionItem => ({
  name: "",
  retailer: "",
  url: "",
  price: "",
  suitability: "",
});

function buildInitialAnswers(existing: Partial<PracticalAnswers> | null | undefined): PracticalAnswers {
  const existingOptions = Array.isArray(existing?.options) ? existing.options : [];
  const options =
    existingOptions.length >= 3
      ? existingOptions.map((o) => ({
          name: o?.name ?? "",
          retailer: o?.retailer ?? "",
          url: o?.url ?? "",
          price: o?.price ?? "",
          suitability: o?.suitability ?? "",
        }))
      : [
          ...existingOptions.map((o) => ({
            name: o?.name ?? "",
            retailer: o?.retailer ?? "",
            url: o?.url ?? "",
            price: o?.price ?? "",
            suitability: o?.suitability ?? "",
          })),
          ...Array.from({ length: Math.max(0, 3 - existingOptions.length) }, EMPTY_OPTION),
        ];

  return {
    briefSummary: existing?.briefSummary ?? "",
    options,
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

const STATUS_BADGE: Record<string, { label: string; tone: StatusTone }> = {
  NOT_STARTED: { label: "Not started", tone: "grey" },
  IN_PROGRESS: { label: "Draft saved", tone: "blue" },
  SUBMITTED: { label: "Submitted — awaiting review", tone: "blue" },
  UNDER_REVIEW: { label: "Under review", tone: "blue" },
  NEEDS_RESUBMISSION: { label: "Resubmission requested", tone: "amber" },
  PASSED: { label: "Passed", tone: "green" },
  NOT_PASSED: { label: "Not passed", tone: "red" },
};

export default function Assessment() {
  const { user } = useAuth();
  const [state, setState] = useState<PracticalState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const [serviceTrack, setServiceTrack] = useState<PracticalTrack | null>(null);
  const [answers, setAnswers] = useState<PracticalAnswers>(() => buildInitialAnswers(null));
  const [savingDraft, setSavingDraft] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{ tone: NoticeTone; title: string; text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const latestDraftRef = useRef<{ serviceTrack: PracticalTrack | null; answers: PracticalAnswers }>({
    serviceTrack: null,
    answers: buildInitialAnswers(null),
  });

  const draftStorageKey = `pssa:practical-draft:${user?.id ?? "member"}`;

  useEffect(() => {
    latestDraftRef.current = { serviceTrack, answers };
  }, [serviceTrack, answers]);

  useEffect(() => {
    const controller = new AbortController();
    hydratedRef.current = false;
    dirtyRef.current = false;
    getPracticalState(controller.signal)
      .then((data) => {
        setState(data);
        const serverStatus = data.submission.status;
        const locked = serverStatus === "SUBMITTED" || serverStatus === "UNDER_REVIEW" || serverStatus === "PASSED";
        let nextTrack: PracticalTrack | null = data.submission.serviceTrack ?? data.suggestedTrack ?? null;
        let nextAnswers = buildInitialAnswers(data.submission.answers);
        let restoredLocal = false;

        if (locked) {
          try {
            localStorage.removeItem(draftStorageKey);
          } catch {
          }
        } else {
          try {
            const raw = localStorage.getItem(draftStorageKey);
            if (raw) {
              const local = JSON.parse(raw) as LocalPracticalDraft;
              const localTime = local.savedAt ? new Date(local.savedAt).getTime() : 0;
              const serverTime = data.submission.updatedAt ? new Date(data.submission.updatedAt).getTime() : 0;
              if (local?.answers && localTime > serverTime) {
                nextTrack = local.serviceTrack ?? nextTrack;
                nextAnswers = buildInitialAnswers(local.answers);
                restoredLocal = true;
              }
            }
          } catch {
          }
        }

        setServiceTrack(nextTrack);
        setAnswers(nextAnswers);
        latestDraftRef.current = { serviceTrack: nextTrack, answers: nextAnswers };
        if (restoredLocal) {
          dirtyRef.current = true;
          setSaveStatus("offline");
        } else if (data.submission.updatedAt) {
          setSaveStatus("saved");
          setLastSavedAt(data.submission.updatedAt);
        }
        hydratedRef.current = true;
        setError(null);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      });
    return () => controller.abort();
  }, [reload, draftStorageKey]);

  const editableStatus =
    state?.submission.status !== "SUBMITTED" &&
    state?.submission.status !== "UNDER_REVIEW" &&
    state?.submission.status !== "PASSED";

  const persistToServer = useCallback(
    async (track: PracticalTrack | null, draftAnswers: PracticalAnswers) => {
      setSaveStatus("saving");
      try {
        const res = await savePracticalDraft(track, draftAnswers);
        dirtyRef.current = false;
        setState((prev) => (prev ? { ...prev, submission: res.submission } : prev));
        setSaveStatus("saved");
        setLastSavedAt(new Date().toISOString());
      } catch {
        setSaveStatus("offline");
      }
    },
    [],
  );

  useEffect(() => {
    if (!hydratedRef.current || !state || !editableStatus) return;
    if (!dirtyRef.current) return;

    try {
      const payload: LocalPracticalDraft = {
        serviceTrack,
        answers,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(draftStorageKey, JSON.stringify(payload));
    } catch {
    }

    const timer = setTimeout(() => {
      void persistToServer(serviceTrack, answers);
    }, 2000);

    return () => clearTimeout(timer);
  }, [serviceTrack, answers, state, editableStatus, draftStorageKey, persistToServer]);

  useEffect(() => {
    const onOnline = () => {
      if (hydratedRef.current && editableStatus && (dirtyRef.current || saveStatus === "offline")) {
        void persistToServer(latestDraftRef.current.serviceTrack, latestDraftRef.current.answers);
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [editableStatus, saveStatus, persistToServer]);

  const updateAnswers = (nextAnswers: PracticalAnswers) => {
    dirtyRef.current = true;
    setAnswers(nextAnswers);
  };

  const updateTrack = (track: PracticalTrack) => {
    dirtyRef.current = true;
    setServiceTrack(track);
  };

  const selectedTrackInfo = useMemo(
    () => state?.tracks.find((t) => t.id === serviceTrack) ?? null,
    [state, serviceTrack],
  );

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
  const badge = STATUS_BADGE[submission.status] ?? STATUS_BADGE.NOT_STARTED;
  const isLockedSubmitted =
    submission.status === "SUBMITTED" || submission.status === "UNDER_REVIEW" || submission.status === "PASSED";
  const editable = !isLockedSubmitted;

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setSaveStatus("saving");
    setFeedbackBanner(null);
    setValidationErrors([]);
    try {
      const res = await savePracticalDraft(serviceTrack, answers);
      dirtyRef.current = false;
      setState((prev) => (prev ? { ...prev, submission: res.submission } : prev));
      setSaveStatus("saved");
      setLastSavedAt(new Date().toISOString());
      setFeedbackBanner({
        tone: "blue",
        title: "Draft saved",
        text: "Your answers have been saved. You can sign out or refresh and continue later.",
      });
    } catch (err) {
      setSaveStatus("offline");
      setFeedbackBanner({ tone: "red", title: "Could not save draft", text: errorMessage(err) });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleUploadEvidence = async (file: File | null) => {
    if (!file) return;
    setUploadingFile(true);
    setFeedbackBanner(null);
    try {
      const res = await uploadPracticalEvidence(file);
      setState((prev) => (prev ? { ...prev, submission: res.submission } : prev));
      setFeedbackBanner({
        tone: "green",
        title: "Supporting file attached",
        text: `${file.name} is attached (optional supporting evidence).`,
      });
    } catch (err) {
      setFeedbackBanner({ tone: "red", title: "Could not attach file", text: errorMessage(err) });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveEvidence = async () => {
    setUploadingFile(true);
    try {
      const res = await deletePracticalEvidence();
      setState((prev) => (prev ? { ...prev, submission: res.submission } : prev));
    } catch (err) {
      setFeedbackBanner({ tone: "red", title: "Could not remove file", text: errorMessage(err) });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editable || submitting) return;
    setValidationErrors([]);
    setFeedbackBanner(null);

    const missing: string[] = [];
    if (!serviceTrack) missing.push("Select the service track that matches your service category.");
    if (answers.briefSummary.trim().length < 20) missing.push("Customer brief summary (at least 20 characters).");
    if (answers.options.length < 3) missing.push("At least 3 product/basket options.");
    answers.options.forEach((opt, idx) => {
      if (!opt.name.trim() || !opt.retailer.trim() || !opt.url.trim() || !opt.price.trim() || !opt.suitability.trim()) {
        missing.push(`Option ${idx + 1}: fill in name, retailer/source, public URL, price, and suitability.`);
      }
    });
    if (!answers.budget.estimatedTotal.trim()) missing.push("Budget: estimated total.");
    if (!answers.budget.additionalCosts.trim()) missing.push("Budget: delivery, travel, or additional costs.");
    if (!answers.budget.remainingOrOver.trim()) missing.push("Budget: remaining budget or difference explanation.");
    if (answers.budget.assumptions.trim().length < 5) missing.push("Budget: costing assumptions.");
    if (!answers.budget.priceCheckedDate.trim()) missing.push("Budget: date prices were checked.");
    if (answers.recommendation.preferredPlan.trim().length < 15) missing.push("Recommendation: preferred plan and reasons.");
    if (answers.recommendation.backupOption.trim().length < 10) missing.push("Recommendation: at least one backup/substitute option.");
    if (answers.customerMessage.trim().length < 20) missing.push("Sample customer approval message (at least 20 characters).");
    if (answers.responsibility.priceChanges.trim().length < 10) missing.push("Responsible practice: handling price changes.");
    if (answers.responsibility.commissionDisclosure.trim().length < 10) missing.push("Responsible practice: commission/commercial disclosure.");
    if (answers.responsibility.privacyProtection.trim().length < 10) missing.push("Responsible practice: customer privacy protection.");

    if (missing.length > 0 || !serviceTrack) {
      setValidationErrors(missing);
      setFeedbackBanner({
        tone: "red",
        title: "Please complete the required fields before submitting",
        text: "Review the missing items listed below.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitPracticalAssessment({
        serviceTrack,
        ...answers,
        idempotencyKey: idempotencyKeyRef.current,
      });
      dirtyRef.current = false;
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {
      }
      setSaveStatus("saved");
      setState((prev) => (prev ? { ...prev, submission: res.submission } : prev));
      setFeedbackBanner({
        tone: "green",
        title: "Practical assessment submitted",
        text: "Your responses have been saved and queued for PSSA review. You may continue to the next application step while your assessment is reviewed.",
      });
    } catch (err) {
      if (err instanceof ApiError && err.details && Array.isArray((err.details as { fieldErrors?: unknown[] }).fieldErrors)) {
        const list = (err.details as { fieldErrors: { path: string; message: string }[] }).fieldErrors.map(
          (f) => `${f.path}: ${f.message}`,
        );
        setValidationErrors(list);
      }
      setFeedbackBanner({ tone: "red", title: "Submission failed", text: errorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const saveStatusText =
    saveStatus === "saving"
      ? "Saving draft…"
      : saveStatus === "saved"
        ? `All changes saved${lastSavedAt ? ` · ${new Date(lastSavedAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}` : ""}`
        : saveStatus === "offline"
          ? "Saved locally (offline — will sync when connected)"
          : null;

  return (
    <>
      <div className="workspace-title">
        <div>
          <span>Application · Step 4 of 6</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0 }}>Practical Assessment</h1>
            <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
            {editable && saveStatusText && (
              <span
                aria-live="polite"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: saveStatus === "offline" ? "#b45309" : "var(--muted, #647386)",
                }}
              >
                {saveStatusText}
              </span>
            )}
          </div>
          <p>
            Complete one fictional shopping simulation track matching your service category. Your structured responses are the required submission; file upload is optional.
          </p>
        </div>
      </div>

      {!submission.tutorialWatched && (
        <Notice tone="amber" title="Watch the 1-minute tutorial first">
          Please watch and complete the practical assessment tutorial before submitting your assignment.{" "}
          <ButtonLink to="/member/tutorials" variant="outline" style={{ marginLeft: 8 }}>
            Go to tutorial
          </ButtonLink>
        </Notice>
      )}

      {(submission.status === "SUBMITTED" || submission.status === "UNDER_REVIEW") && (
        <Notice tone="green" title="Assessment submitted — awaiting PSSA review">
          Submitted on {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString("en-ZA") : "—"} (Tutorial v{submission.tutorialVersion} · Assignment v{submission.assignmentVersion}).
          Submission does not approve membership or verification on its own — you may continue to the next non-dependent application step while PSSA reviews your submission.
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ButtonLink to="/member" variant="dark" iconRight="arrow">
              Continue to Application Overview
            </ButtonLink>
            <ButtonLink to="/member/verification" variant="outline">
              Review Verification &amp; Documents
            </ButtonLink>
          </div>
        </Notice>
      )}

      {submission.status === "PASSED" && (
        <Notice tone="green" title="Practical assessment passed">
          Your practical assessment has been reviewed and passed
          {submission.totalScore !== null ? ` (${submission.totalScore}/100)` : ""}.
          {submission.reviewerFeedback ? ` Reviewer note: ${submission.reviewerFeedback}` : ""}
          <div style={{ marginTop: 12 }}>
            <ButtonLink to="/member" variant="dark" iconRight="arrow">
              Return to Application Overview
            </ButtonLink>
          </div>
        </Notice>
      )}

      {(submission.status === "NEEDS_RESUBMISSION" || submission.status === "NOT_PASSED") && submission.reviewerFeedback && (
        <Notice tone="amber" title={submission.status === "NEEDS_RESUBMISSION" ? "Clarification / resubmission requested" : "Assessment not passed"}>
          <strong>Reviewer feedback:</strong> {submission.reviewerFeedback}
          {submission.totalScore !== null && ` (Score: ${submission.totalScore}/100)`}
        </Notice>
      )}

      {feedbackBanner && (
        <Notice tone={feedbackBanner.tone} title={feedbackBanner.title}>
          {feedbackBanner.text}
          {validationErrors.length > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {validationErrors.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          )}
        </Notice>
      )}

      {/* Assignment Brief Inline + Download */}
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
            style={{ width: "100%", height: 420, border: 0, display: "block" }}
          />
        </div>
      </Panel>

      {/* Structured Response Form */}
      <form onSubmit={handleSubmit} style={{ marginTop: 20, display: "grid", gap: 20 }}>
        <Panel title="1. Select your service track">
          {state.declaredScope && (
            <p style={{ marginTop: 0, fontSize: 13, color: "var(--muted, #647386)" }}>
              Your declared service scope: <strong>{state.declaredScope}</strong>
            </p>
          )}
          <div style={{ display: "grid", gap: 10 }}>
            {state.tracks.map((track) => {
              const checked = serviceTrack === track.id;
              return (
                <label
                  key={track.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    padding: 14,
                    borderRadius: 12,
                    border: checked ? "2px solid #18a269" : "1px solid #d9e1e8",
                    background: checked ? "#f1fbf6" : "#fff",
                    cursor: editable ? "pointer" : "default",
                  }}
                >
                  <input
                    type="radio"
                    name="serviceTrack"
                    value={track.id}
                    checked={checked}
                    disabled={!editable}
                    onChange={() => updateTrack(track.id)}
                    style={{ marginTop: 4 }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      Track {track.code}: {track.label} (Max R{track.budgetZar.toLocaleString("en-ZA")})
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted, #647386)", marginTop: 4 }}>{track.summary}</div>
                  </div>
                </label>
              );
            })}
          </div>
          {selectedTrackInfo && (
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--green-dark, #0f764b)", fontWeight: 600 }}>
              Selected: Track {selectedTrackInfo.code} — {selectedTrackInfo.label}
            </p>
          )}
        </Panel>

        <Panel title="2. Customer brief summary">
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Restate the fictional customer&apos;s needs, preferences, budget, deadline, and restrictions in your own words *
          </label>
          <textarea
            rows={4}
            disabled={!editable}
            value={answers.briefSummary}
            onChange={(e) => updateAnswers({ ...answers, briefSummary: e.target.value })}
            placeholder="Summarise the key requirements, budget cap, sizes/preferences, and constraints..."
            style={FIELD_STYLE}
          />
        </Panel>

        <Panel
          title="3. Research & options (minimum 3)"
          action={
            editable && answers.options.length < 10 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => updateAnswers({ ...answers, options: [...answers.options, EMPTY_OPTION()] })}
              >
                + Add option
              </Button>
            ) : undefined
          }
        >
          <div style={{ display: "grid", gap: 14 }}>
            {answers.options.map((opt, idx) => (
              <div key={idx} style={{ padding: 14, borderRadius: 12, border: "1px solid #d9e1e8", background: "#fbfcfd", color: "#0f233c" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong style={{ fontSize: 13 }}>Option {idx + 1} *</strong>
                  {editable && answers.options.length > 3 && (
                    <button
                      type="button"
                      onClick={() =>
                        updateAnswers({ ...answers, options: answers.options.filter((_, i) => i !== idx) })
                      }
                      style={{ background: "none", border: 0, color: "#b42318", fontSize: 12, cursor: "pointer" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                  <input
                    type="text"
                    disabled={!editable}
                    placeholder="Item / basket option name"
                    value={opt.name}
                    onChange={(e) => {
                      const next = [...answers.options];
                      next[idx] = { ...opt, name: e.target.value };
                      updateAnswers({ ...answers, options: next });
                    }}
                    style={COMPACT_FIELD_STYLE}
                  />
                  <input
                    type="text"
                    disabled={!editable}
                    placeholder="Retailer or source"
                    value={opt.retailer}
                    onChange={(e) => {
                      const next = [...answers.options];
                      next[idx] = { ...opt, retailer: e.target.value };
                      updateAnswers({ ...answers, options: next });
                    }}
                    style={COMPACT_FIELD_STYLE}
                  />
                  <input
                    type="url"
                    disabled={!editable}
                    placeholder="Public source URL (https://...)"
                    value={opt.url}
                    onChange={(e) => {
                      const next = [...answers.options];
                      next[idx] = { ...opt, url: e.target.value };
                      updateAnswers({ ...answers, options: next });
                    }}
                    style={COMPACT_FIELD_STYLE}
                  />
                  <input
                    type="text"
                    disabled={!editable}
                    placeholder="Listed price (e.g. R499)"
                    value={opt.price}
                    onChange={(e) => {
                      const next = [...answers.options];
                      next[idx] = { ...opt, price: e.target.value };
                      updateAnswers({ ...answers, options: next });
                    }}
                    style={COMPACT_FIELD_STYLE}
                  />
                </div>
                <textarea
                  rows={2}
                  disabled={!editable}
                  placeholder="Why this option fits the brief..."
                  value={opt.suitability}
                  onChange={(e) => {
                    const next = [...answers.options];
                    next[idx] = { ...opt, suitability: e.target.value };
                    updateAnswers({ ...answers, options: next });
                  }}
                  style={{ ...COMPACT_FIELD_STYLE, marginTop: 8 }}
                />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="4. Budget calculation">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Estimated total *</label>
              <input
                type="text"
                disabled={!editable}
                value={answers.budget.estimatedTotal}
                onChange={(e) => updateAnswers({ ...answers, budget: { ...answers.budget, estimatedTotal: e.target.value } })}
                placeholder="e.g. R1,640"
                style={COMPACT_FIELD_STYLE}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Delivery / travel / extra costs *</label>
              <input
                type="text"
                disabled={!editable}
                value={answers.budget.additionalCosts}
                onChange={(e) => updateAnswers({ ...answers, budget: { ...answers.budget, additionalCosts: e.target.value } })}
                placeholder="e.g. R99 courier delivery"
                style={COMPACT_FIELD_STYLE}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Remaining budget or difference *</label>
              <input
                type="text"
                disabled={!editable}
                value={answers.budget.remainingOrOver}
                onChange={(e) => updateAnswers({ ...answers, budget: { ...answers.budget, remainingOrOver: e.target.value } })}
                placeholder="e.g. R61 under budget"
                style={COMPACT_FIELD_STYLE}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Date prices checked *</label>
              <input
                type="date"
                disabled={!editable}
                value={answers.budget.priceCheckedDate}
                onChange={(e) => updateAnswers({ ...answers, budget: { ...answers.budget, priceCheckedDate: e.target.value } })}
                style={COMPACT_FIELD_STYLE}
              />
            </div>
          </div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, margin: "12px 0 4px" }}>Costing assumptions *</label>
          <textarea
            rows={2}
            disabled={!editable}
            value={answers.budget.assumptions}
            onChange={(e) => updateAnswers({ ...answers, budget: { ...answers.budget, assumptions: e.target.value } })}
            placeholder="State any delivery zones, stock assumptions, or bundle pricing..."
            style={COMPACT_FIELD_STYLE}
          />
        </Panel>

        <Panel title="5. Recommendation & backup option">
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Recommended option or combination and why *</label>
          <textarea
            rows={3}
            disabled={!editable}
            value={answers.recommendation.preferredPlan}
            onChange={(e) => updateAnswers({ ...answers, recommendation: { ...answers.recommendation, preferredPlan: e.target.value } })}
            style={COMPACT_FIELD_STYLE}
          />
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, margin: "12px 0 4px" }}>Backup / substitute option (if unavailable or price changes) *</label>
          <textarea
            rows={2}
            disabled={!editable}
            value={answers.recommendation.backupOption}
            onChange={(e) => updateAnswers({ ...answers, recommendation: { ...answers.recommendation, backupOption: e.target.value } })}
            style={COMPACT_FIELD_STYLE}
          />
        </Panel>

        <Panel title="6. Sample customer approval message (draft simulation only)">
          <p style={{ marginTop: 0, fontSize: 12, color: "var(--muted, #647386)" }}>
            This is a written draft for assessor review only. It will never be sent to any real customer.
          </p>
          <textarea
            rows={4}
            disabled={!editable}
            value={answers.customerMessage}
            onChange={(e) => updateAnswers({ ...answers, customerMessage: e.target.value })}
            placeholder="Write a clear, courteous message explaining your recommendation and asking for approval before any purchase..."
            style={COMPACT_FIELD_STYLE}
          />
        </Panel>

        <Panel title="7. Responsible practice">
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>How would you handle a price change before purchase? *</label>
              <textarea
                rows={2}
                disabled={!editable}
                value={answers.responsibility.priceChanges}
                onChange={(e) => updateAnswers({ ...answers, responsibility: { ...answers.responsibility, priceChanges: e.target.value } })}
                style={COMPACT_FIELD_STYLE}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>How would you disclose any commission or commercial relationship? *</label>
              <textarea
                rows={2}
                disabled={!editable}
                value={answers.responsibility.commissionDisclosure}
                onChange={(e) => updateAnswers({ ...answers, responsibility: { ...answers.responsibility, commissionDisclosure: e.target.value } })}
                style={COMPACT_FIELD_STYLE}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>How do you protect customer personal information? *</label>
              <textarea
                rows={2}
                disabled={!editable}
                value={answers.responsibility.privacyProtection}
                onChange={(e) => updateAnswers({ ...answers, responsibility: { ...answers.responsibility, privacyProtection: e.target.value } })}
                style={COMPACT_FIELD_STYLE}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Optional supporting evidence (not required)">
          <p style={{ marginTop: 0, fontSize: 13, color: "var(--muted, #647386)" }}>
            You may optionally attach a supporting PDF or screenshot (max 10 MB). Do not upload ID documents, bank details, or private customer information. You can submit without attaching any file.
          </p>
          {submission.evidence ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 12, borderRadius: 10, border: "1px solid #d9e1e8", background: "#f8fafb" }}>
              <div>
                <a href={submission.evidence.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600, fontSize: 13 }}>
                  {submission.evidence.fileName}
                </a>
                <span style={{ marginLeft: 8, fontSize: 12, color: "var(--muted, #647386)" }}>
                  {submission.evidence.sizeBytes ? `${Math.round(submission.evidence.sizeBytes / 1024)} KB` : ""}
                </span>
              </div>
              {editable && (
                <Button type="button" variant="outline" disabled={uploadingFile} onClick={() => void handleRemoveEvidence()}>
                  Remove file
                </Button>
              )}
            </div>
          ) : editable ? (
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              disabled={uploadingFile}
              onChange={(e) => void handleUploadEvidence(e.target.files?.[0] ?? null)}
            />
          ) : (
            <p style={{ fontSize: 13, color: "var(--muted, #647386)", margin: 0 }}>No optional file attached.</p>
          )}
        </Panel>

        {editable && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Button type="button" variant="outline" disabled={savingDraft || submitting} onClick={() => void handleSaveDraft()}>
                {savingDraft ? "Saving draft..." : "Save draft"}
              </Button>
              {saveStatusText && (
                <span
                  aria-live="polite"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: saveStatus === "offline" ? "#b45309" : "var(--muted, #647386)",
                  }}
                >
                  {saveStatusText}
                </span>
              )}
            </div>
            <Button type="submit" variant="dark" disabled={submitting || savingDraft || !submission.tutorialWatched}>
              {submitting ? "Submitting..." : "Submit Assessment"}
            </Button>
          </div>
        )}
      </form>
    </>
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
