import { useEffect, useRef, useState } from "react";
import { getPracticalState, reportPracticalTutorial, type PracticalState } from "../../api/practicalAssessment";
import { Icon } from "../../components/Icon";
import { Button, ButtonLink, ErrorState, LoadingState, Notice, StatusBadge } from "../../components/ui";
import { errorMessage } from "../../lib/api";

export default function Tutorials() {
  const [state, setState] = useState<PracticalState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastReportRef = useRef(0);

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
  }, [attempt]);

  if (error) {
    return (
      <ErrorState
        title="We couldn't load the tutorial"
        text={error}
        onRetry={() => {
          setError(null);
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  if (!state) return <LoadingState rows={3} label="Loading practical assessment tutorial" />;

  const { tutorial, submission } = state;
  const watched = submission.tutorialWatched;

  const sendProgress = async (seconds: number, completed: boolean) => {
    setSaving(true);
    try {
      const res = await reportPracticalTutorial(seconds, completed);
      setState((prev) => (prev ? { ...prev, submission: res.submission } : prev));
      setSaveError(null);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleReplay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play();
  };

  return (
    <>
      <div className="workspace-title">
        <div>
          <span>Application · Step 3 of 6</span>
          <h1>Practical Assessment Tutorial</h1>
          <p>
            Watch this short one-minute walkthrough before starting your practical shopping simulation. You can replay it at any time.
          </p>
        </div>
      </div>

      <div className="tutorial-layout">
        <section className="video-card">
          <video
            ref={videoRef}
            src={tutorial.streamUrl}
            controls
            preload="metadata"
            playsInline
            style={{ width: "100%", display: "block", background: "#0a2035", aspectRatio: "16 / 9" }}
            onTimeUpdate={(e) => {
              const video = e.currentTarget;
              const current = Math.floor(video.currentTime);
              const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
              const reachedEnd = duration > 0 && video.currentTime / duration >= 0.9;
              if (reachedEnd && !watched) {
                lastReportRef.current = current;
                void sendProgress(current, true);
              } else if (current - lastReportRef.current >= 5) {
                lastReportRef.current = current;
                void sendProgress(current, false);
              }
            }}
            onEnded={(e) => {
              const current = Math.floor(e.currentTarget.currentTime || e.currentTarget.duration || 60);
              void sendProgress(current, true);
            }}
          />
          <div style={{ padding: "16px 20px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 16 }}>{tutorial.title}</h2>
                <StatusBadge tone={watched ? "green" : "blue"}>
                  {watched ? "Watched & completed" : "Not yet completed"}
                </StatusBadge>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted, #647386)" }}>
                Version v{tutorial.version} · {tutorial.fileName}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button type="button" variant="outline" onClick={handleReplay}>
                <Icon name="play" size={14} /> Replay tutorial
              </Button>
              {!watched && (
                <Button
                  type="button"
                  variant="dark"
                  disabled={saving}
                  onClick={() => void sendProgress(Math.floor(videoRef.current?.currentTime ?? 60), true)}
                >
                  {saving ? "Saving..." : "Mark tutorial watched"}
                </Button>
              )}
            </div>
          </div>
          {saveError && (
            <div style={{ padding: "0 20px 16px" }}>
              <Notice tone="red" title="Could not save tutorial progress">
                {saveError}
              </Notice>
            </div>
          )}
        </section>

        <aside className="lesson-list">
          <div className="lesson-head">
            <h3>Tutorial checklist</h3>
            <span>{watched ? "1 of 1 complete" : "0 of 1 complete"}</span>
          </div>
          <div className="current" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "#f4f7f5" }}>
            <span className={watched ? "lesson-check done" : "lesson-check"}>
              {watched ? <Icon name="check" /> : 1}
            </span>
            <div>
              <b>{tutorial.title}</b>
              <small style={{ display: "block", color: "var(--muted, #647386)" }}>
                {watched ? "Completed — ready for the practical assignment" : "Watch to the end to unlock the assessment"}
              </small>
            </div>
          </div>

          {watched ? (
            <ButtonLink to="/member/assessment" variant="dark" full iconRight="arrow" className="exam-button" style={{ marginTop: 16 }}>
              Continue to Practical Assessment
            </ButtonLink>
          ) : (
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--muted, #647386)" }}>
              Watch the tutorial above (or click &ldquo;Mark tutorial watched&rdquo; after viewing) to unlock the practical assessment.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
