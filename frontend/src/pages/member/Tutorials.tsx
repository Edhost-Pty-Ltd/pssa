import { useEffect, useRef, useState } from "react";
import { getTutorials, reportProgress, tutorialStreamUrl, type Tutorial } from "../../api/learning";
import { Icon } from "../../components/Icon";
import { ButtonLink, EmptyState, ErrorState, LoadingState, Notice } from "../../components/ui";
import { errorMessage } from "../../lib/api";

const REPORT_EVERY_SECONDS = 4;
const SEEK_SLACK_SECONDS = 2;

const formatTime = (seconds: number | null) => {
  if (!seconds) return "--:--";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function Tutorials() {
  const [tutorials, setTutorials] = useState<Tutorial[] | null>(null);
  const [reason, setReason] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getTutorials(controller.signal)
      .then((data) => {
        setTutorials(data.tutorials);
        setReason(data.reason);
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
        title="We couldn't load the tutorials"
        text={error}
        onRetry={() => {
          setError(null);
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  if (!tutorials) return <LoadingState rows={3} label="Loading tutorials" />;

  const doneCount = tutorials.filter((t) => t.completed).length;
  const allDone = tutorials.length > 0 && doneCount === tutorials.length;
  const selected = tutorials.find((t) => t.id === selectedId) ?? tutorials.find((t) => !t.completed) ?? tutorials[0];

  const updateTutorial = (id: string, change: Partial<Tutorial>) =>
    setTutorials((list) => list?.map((t) => (t.id === id ? { ...t, ...change } : t)) ?? list);

  return (
    <>
      <div className="workspace-title">
        <div>
          <span>Application · Step 3 of 6</span>
          <h1>Conduct tutorials</h1>
          <p>Learn the minimum conduct expected of every PSSA member. Watch each lesson to the end; you can't skip ahead.</p>
        </div>
      </div>

      {tutorials.length === 0 ? (
        <EmptyState
          icon="play"
          title="Waiting for the official tutorials"
          text={reason ?? "The conduct lessons haven't been published yet. We'll let you know when they're ready."}
        />
      ) : (
        <div className="tutorial-layout">
          {selected && <Player key={selected.id} tutorial={selected} onProgress={(change) => updateTutorial(selected.id, change)} />}

          <aside className="lesson-list">
            <div className="lesson-head">
              <h3>Course content</h3>
              <span>
                {doneCount} of {tutorials.length} complete
              </span>
            </div>
            {tutorials.map((t, i) => (
              <button
                type="button"
                key={t.id}
                className={t.id === selected?.id ? "current" : ""}
                aria-current={t.id === selected?.id ? "true" : undefined}
                onClick={() => setSelectedId(t.id)}
              >
                <span className={t.completed ? "lesson-check done" : "lesson-check"}>
                  {t.completed ? <Icon name="check" /> : i + 1}
                </span>
                <div>
                  <b>{t.title}</b>
                  <small>
                    <Icon name="clock" size={13} /> {formatTime(t.durationSeconds)}
                    {!t.completed && t.maxPositionSeconds > 0 && t.durationSeconds
                      ? ` · ${Math.min(99, Math.floor((t.maxPositionSeconds / t.durationSeconds) * 100))}% watched`
                      : ""}
                  </small>
                </div>
                {!t.completed && <Icon name="play" />}
              </button>
            ))}
            {allDone ? (
              <ButtonLink to="/member/assessment" variant="dark" full iconRight="arrow" className="exam-button">
                Go to assessment
              </ButtonLink>
            ) : (
              <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--muted, #647386)" }}>
                Finish every lesson to unlock the assessment.
              </p>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function Player({ tutorial, onProgress }: { tutorial: Tutorial; onProgress: (change: Partial<Tutorial>) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const maxRef = useRef(tutorial.maxPositionSeconds);
  const lastReportRef = useRef(0);
  const [skipBlocked, setSkipBlocked] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function send(position: number) {
    const video = videoRef.current;
    const duration = video && Number.isFinite(video.duration) ? video.duration : undefined;
    lastReportRef.current = position;
    reportProgress(tutorial.id, position, duration)
      .then(({ progress }) => {
        setSaveError(null);
        onProgress({
          completed: progress.completed,
          completedAt: progress.completedAt,
          maxPositionSeconds: progress.maxPositionSeconds,
          watchedSeconds: progress.watchedSeconds,
          ...(duration && !tutorial.durationSeconds ? { durationSeconds: Math.floor(duration) } : {}),
        });
      })
      .catch((err) => setSaveError(errorMessage(err)));
  }

  return (
    <section className="video-card">
      <video
        ref={videoRef}
        src={tutorialStreamUrl(tutorial.id)}
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        preload="metadata"
        playsInline
        style={{ width: "100%", display: "block", background: "#0a2035", aspectRatio: "16 / 9" }}
        onLoadedMetadata={(e) => {
          if (!tutorial.completed && maxRef.current > 0) e.currentTarget.currentTime = maxRef.current;
        }}
        onSeeking={(e) => {
          const video = e.currentTarget;
          if (tutorial.completed) return;
          if (video.currentTime > maxRef.current + SEEK_SLACK_SECONDS) {
            video.currentTime = maxRef.current;
            setSkipBlocked(true);
          }
        }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          if (t <= maxRef.current + SEEK_SLACK_SECONDS) maxRef.current = Math.max(maxRef.current, t);
          if (Math.abs(t - lastReportRef.current) >= REPORT_EVERY_SECONDS) send(t);
        }}
        onPause={(e) => send(e.currentTarget.currentTime)}
        onEnded={(e) => send(e.currentTarget.currentTime)}
      >
        Your browser can't play this video.
      </video>
      <div className="video-info">
        <div>
          <h3>{tutorial.title}</h3>
          <p>{tutorial.completed ? "Lesson complete. You can watch it again any time." : "Watch to the end to complete this lesson."}</p>
        </div>
        <span>{formatTime(tutorial.durationSeconds)}</span>
      </div>
      {skipBlocked && !tutorial.completed && (
        <div style={{ padding: "0 20px 16px" }}>
          <Notice tone="amber" title="You can't skip ahead">
            Lessons have to be watched in order. You can go back over anything you've already seen.
          </Notice>
        </div>
      )}
      {saveError && (
        <div style={{ padding: "0 20px 16px" }}>
          <Notice tone="red" title="We couldn't save your progress">
            {saveError} Keep watching; we'll try again in a few seconds.
          </Notice>
        </div>
      )}
    </section>
  );
}
