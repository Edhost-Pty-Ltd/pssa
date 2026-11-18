import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCertificate, type MemberCertificate } from "../../api/certificate";
import { getProfile, type MemberProfile } from "../../api/member";
import { Icon } from "../../components/Icon";
import { Logo } from "../../components/Logo";
import { ButtonLink, EmptyState, ErrorState, LoadingState, Notice, Panel, PUBLIC_MEMBER_STATUS, Status } from "../../components/ui";
import { errorMessage } from "../../lib/api";

// Certificate & badge: GET /api/member/certificate (docs/api-contract.md 6.6).
// The PDF (with the live-check QR code) comes from GET /api/member/certificate/pdf.
// The badge link is the public live check, so anyone who clicks it sees the current status.

type Loaded = { certificate: MemberCertificate | null; reason?: string; profile: MemberProfile; loadedAt: number };

const DAY = 24 * 60 * 60 * 1000;
const formatDate = (value: string) => new Date(value).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

export default function Certificate() {
  const navigate = useNavigate();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getCertificate(controller.signal), getProfile(controller.signal)])
      .then(([cert, { profile }]) => {
        setData({ certificate: cert.certificate, reason: cert.reason, profile, loadedAt: Date.now() });
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
        title="We couldn't load your certificate"
        text={error}
        onRetry={() => {
          setError(null);
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  if (!data) return <LoadingState rows={3} label="Loading your certificate" />;

  const { certificate, profile, loadedAt } = data;

  return (
    <>
      <div className="workspace-title">
        <div>
          <span>Membership</span>
          <h1>Certificate &amp; badge</h1>
          <p>Use these only while your membership is active. Customers check your status live, so an old copy proves nothing.</p>
        </div>
        {certificate && <Status of={PUBLIC_MEMBER_STATUS} value={certificate.status} />}
      </div>

      {certificate ? (
        <CertificateView certificate={certificate} profile={profile} now={loadedAt} />
      ) : (
        <EmptyState
          icon="badge"
          title="No certificate yet"
          text="Your certificate is issued once every step is complete and a PSSA reviewer approves your application."
          actionLabel="See your progress"
          onAction={() => navigate("/member")}
        />
      )}
    </>
  );
}

function CertificateView({ certificate: c, profile, now }: { certificate: MemberCertificate; profile: MemberProfile; now: number }) {
  const p = profile.memberProfile;
  const name = `${p.firstName} ${p.lastName}`;
  const active = c.status === "active";
  const liveUrl = c.qrTargetUrl || `${window.location.origin}/verify/${c.number}`;
  const daysLeft = Math.max(0, Math.ceil((new Date(c.validUntil).getTime() - now) / DAY));

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {!active && (
        <Notice tone="red" title="Your membership is not active">
          Don't use the PSSA name, certificate or badge until your membership is active again. Anyone who checks your
          number will see that you are not an active member.
        </Notice>
      )}

      <div className="certificate-layout">
        <section className="certificate-paper">
          <div className="cert-border">
            <div className="cert-head">
              <Logo />
              <span>Certificate of membership</span>
            </div>
            <div className="cert-body">
              <span className="cert-kicker">This is to certify that</span>
              <h1>{name}</h1>
              {p.tradingName && (
                <p>
                  trading as <b>{p.tradingName}</b>
                </p>
              )}
              <div className="cert-rule" />
              <p>
                has met the Personal Shoppers and Sourcing Association's verification and conduct requirements for the
                approved scope:
              </p>
              <h3>{c.scope ?? p.scope ?? "Not recorded"}</h3>
              <div className="cert-meta">
                <div>
                  <span>Certificate number</span>
                  <b>{c.number}</b>
                </div>
                <div>
                  <span>Valid from</span>
                  <b>{formatDate(c.validFrom)}</b>
                </div>
                <div>
                  <span>Valid until</span>
                  <b>{formatDate(c.validUntil)}</b>
                </div>
              </div>
            </div>
          </div>
          <a className="btn btn-dark download-cert" href="/api/member/certificate/pdf" target="_blank" rel="noopener">
            <Icon name="download" /> Download certificate · PDF
          </a>
          <p style={{ marginTop: 8, fontSize: 13, color: "var(--muted, #647386)" }}>
            The PDF has a QR code that opens your live status page.
          </p>
        </section>

        <aside className="asset-column">
          {active ? <BadgePanel number={c.number} liveUrl={liveUrl} validUntil={c.validUntil} /> : null}
          <Panel icon="calendar" title={active ? `${daysLeft} days remaining` : "Membership dates"} subtitle={`Valid until ${formatDate(c.validUntil)}`}>
            <p style={{ margin: 0 }}>
              Membership is renewed every year. Renewal includes updated verification checks and a short refresher
              assessment. We'll let you know when renewal opens.
            </p>
          </Panel>
          <ButtonLink to={`/verify/${c.number}`} variant="outline" target="_blank">
            See your public status page
          </ButtonLink>
        </aside>
      </div>
    </div>
  );
}

function BadgePanel({ number, liveUrl, validUntil }: { number: string; liveUrl: string; validUntil: string }) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const year = new Date(validUntil).getFullYear();

  async function copy() {
    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <Panel icon="badge" title="Your badge link" subtitle="Put this on your pages so customers can check you.">
      <div className="badge-preview">
        <Icon name="shield" size={38} />
        <div>
          <b>PSSA MEMBER</b>
          <span>
            {number} · VALID TO {year}
          </span>
        </div>
      </div>
      <label className="copy-field">
        <span>Live check link</span>
        <div>
          <input readOnly value={liveUrl} onFocus={(e) => e.target.select()} />
          <button type="button" onClick={copy}>
            <Icon name={copied === "copied" ? "check" : "copy"} /> {copied === "copied" ? "Copied" : "Copy"}
          </button>
        </div>
      </label>
      {copied === "failed" && <p style={{ margin: "8px 0 0", fontSize: 13 }}>Couldn't copy. Select the link and copy it yourself.</p>}
      <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--muted, #647386)" }}>
        Always link to this page. A screenshot of a badge isn't proof of membership.
      </p>
    </Panel>
  );
}
