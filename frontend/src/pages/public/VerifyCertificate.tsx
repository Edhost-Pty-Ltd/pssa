import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { SiteFooter } from "../../components/site/SiteFooter";
import { SiteHeader } from "../../components/site/SiteHeader";
import { PUBLIC_MEMBER_STATUS, Status } from "../../components/ui";
import {
  CERTIFICATE_PATTERN,
  checkCertificate,
  normalizeCertificateNumber,
  type CertificateCheck,
  type VerifiedChannel,
} from "../../api/verify";
import { ApiError, errorMessage } from "../../lib/api";

// Public live check: /verify and /verify/PSSA-YYYY-XXXXXX (docs/api-contract.md 6.6).
// The QR code on a certificate points here. Only this live page proves current status,
// so the page never shows a cached result: every visit asks the server again.

type Result =
  | { number: string; kind: "found"; certificate: CertificateCheck }
  | { number: string; kind: "not_found" }
  | { number: string; kind: "unavailable" }
  | { number: string; kind: "error"; message: string };

export default function VerifyCertificate() {
  const params = useParams<{ number?: string }>();
  const number = params.number ? normalizeCertificateNumber(params.number) : "";
  const valid = CERTIFICATE_PATTERN.test(number);

  const [result, setResult] = useState<Result | null>(null);
  const loading = valid && result?.number !== number;

  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    checkCertificate(number, controller.signal)
      .then(({ certificate }) => setResult({ number, kind: "found", certificate }))
      .catch((error) => {
        if ((error as Error).name === "AbortError") return;
        if (error instanceof ApiError && error.status === 404) {
          // "Route not found" means the backend doesn't have the live check yet, not that the number is fake.
          const routeMissing = error.message.startsWith("Route not found");
          setResult({ number, kind: routeMissing ? "unavailable" : "not_found" });
          return;
        }
        setResult({ number, kind: "error", message: errorMessage(error) });
      });
    return () => controller.abort();
  }, [number, valid]);

  return (
    <div className="landing font-body">
      <SiteHeader />
      <main className="bg-soft">
        <div className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-green-dark">
            <Icon name="shield" size={16} /> Live PSASA verification
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-navy sm:text-5xl">Check a certificate</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted">
            Enter the number on a PSASA certificate or badge to see the member's status right now.
          </p>

          <CheckForm initial={params.number ?? ""} />

          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]" aria-live="polite">
            <div>
              {params.number && !valid && <InvalidNumber value={params.number} />}
              {loading && <Checking number={number} />}
              {!loading && result?.number === number && <ResultPanel result={result} />}
              {!params.number && <HowItWorks />}
            </div>
            <SafetyAside />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/* Search form */

function CheckForm({ initial }: { initial: string }) {
  const navigate = useNavigate();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const number = normalizeCertificateNumber(value);
    if (!CERTIFICATE_PATTERN.test(number)) {
      setError("Certificate numbers look like PSSA-2026-004821.");
      return;
    }
    setError("");
    navigate(`/verify/${number}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <label htmlFor="certificate-number" className="font-semibold text-navy">
        Certificate number
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id="certificate-number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="PSSA-2026-004821"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={30}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "certificate-number-error" : undefined}
          className="flex-1 rounded-xl border border-line px-4 py-3.5 font-mono text-base uppercase tracking-wide outline-none focus:border-green"
        />
        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-xl bg-green px-6 py-3.5 font-semibold text-white transition hover:bg-green-dark"
        >
          Check status <Icon name="arrow" size={18} />
        </button>
      </div>
      {error && (
        <p id="certificate-number-error" className="mt-2 text-sm font-semibold text-[#b42318]">
          {error}
        </p>
      )}
    </form>
  );
}

/* Results */

function ResultPanel({ result }: { result: Result }) {
  if (result.kind === "found") return <CertificateResult certificate={result.certificate} />;
  if (result.kind === "not_found") return <NotFound number={result.number} />;
  if (result.kind === "unavailable") {
    return (
      <Message title="The live check isn't available yet">
        We can't confirm certificate numbers on this site yet. Until we can, don't treat a certificate, badge or
        screenshot as proof of membership.
      </Message>
    );
  }
  return (
    <Message title="Status unavailable">
      {result.message} We can't confirm this member's status right now, so don't rely on a screenshot or an old
      certificate. Please try again shortly.
    </Message>
  );
}

function CertificateResult({ certificate: c }: { certificate: CertificateCheck }) {
  const active = c.status === "active";
  const name = `${c.firstName} ${c.lastName}`;

  if (!active) {
    return (
      <section className="rounded-2xl border border-line bg-white p-6 sm:p-8">
        <Status of={PUBLIC_MEMBER_STATUS} value={c.status} />
        <h2 className="mt-4 font-display text-3xl font-semibold text-navy">{name} is not an active PSASA member</h2>
        <p className="mt-3 text-muted">
          Certificate <span className="font-mono font-semibold text-ink">{c.number}</span> is no longer valid. Don't
          pay anyone on the strength of this certificate or a PSASA badge.
        </p>
        <ReportLink />
        <CheckedAt value={c.checkedAt} />
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex items-center gap-2 bg-green-soft px-6 py-3 text-sm font-semibold text-green-dark sm:px-8">
        <Icon name="shield" size={18} /> Verified by PSASA. This result is live.
      </div>
      <div className="p-6 sm:p-8">
        <Status of={PUBLIC_MEMBER_STATUS} value={c.status} />
        <h2 className="mt-4 font-display text-3xl font-semibold text-navy">{name}</h2>
        {c.tradingName && (
          <p className="mt-1 text-muted">
            Trading as <b className="text-ink">{c.tradingName}</b>
          </p>
        )}

        <dl className="mt-6 grid gap-4 rounded-xl bg-soft p-5 sm:grid-cols-2">
          <Detail label="Certificate number" value={<span className="font-mono">{c.number}</span>} />
          <Detail label="Valid until" value={formatDate(c.validUntil)} />
          {c.validFrom && <Detail label="Certified from" value={formatDate(c.validFrom)} />}
          {c.scope && <Detail label="What they source" value={c.scope} />}
        </dl>

        <h3 className="mt-8 font-semibold text-navy">Verified trading channels</h3>
        {c.channels.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No trading channels have been verified for this member.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {c.channels.map((channel) => (
              <ChannelRow key={`${channel.kind}-${channel.value}`} channel={channel} />
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-muted">
          Only deal with this member through the channels listed here. If someone uses this name on another account,
          it may be an impersonator.
        </p>

        <ReportLink />
        <CheckedAt value={c.checkedAt} />
      </div>
    </section>
  );
}

const CHANNEL_LABELS: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok" };

function ChannelRow({ channel }: { channel: VerifiedChannel }) {
  const label = CHANNEL_LABELS[channel.kind] ?? channel.kind;
  const isLink = channel.value.startsWith("https://");
  return (
    <li className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
      <span className="text-green-dark">
        <Icon name="check" size={18} />
      </span>
      <div className="min-w-0 flex-1">
        {isLink ? (
          <a href={channel.value} target="_blank" rel="noopener noreferrer nofollow" className="block truncate font-semibold text-ink underline">
            {channel.value.replace(/^https:\/\/(www\.)?/, "")}
          </a>
        ) : (
          <p className="truncate font-semibold text-ink">{channel.value}</p>
        )}
        <p className="text-xs text-muted">{label} · Verified</p>
      </div>
    </li>
  );
}

function NotFound({ number }: { number: string }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-6 sm:p-8">
      <span className="flex size-12 items-center justify-center rounded-full bg-[var(--amber-soft)] text-[#9a6700]">
        <Icon name="warning" />
      </span>
      <h2 className="mt-4 font-display text-3xl font-semibold text-navy">No certificate with this number</h2>
      <p className="mt-3 text-muted">
        <span className="font-mono font-semibold text-ink">{number}</span> isn't a PSASA certificate. Check that you
        typed it correctly. If someone showed you this number, they may not be a PSASA member. Don't pay them on the
        strength of it.
      </p>
      <ReportLink />
    </section>
  );
}

function InvalidNumber({ value }: { value: string }) {
  return (
    <Message title="That doesn't look like a certificate number">
      “{value}” isn't in the right format. Certificate numbers look like PSSA-2026-004821.
    </Message>
  );
}

function Checking({ number }: { number: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-6 sm:p-8" role="status">
      <div className="h-4 w-40 animate-pulse rounded bg-line" />
      <div className="mt-4 h-8 w-64 animate-pulse rounded bg-line" />
      <p className="mt-4 text-sm text-muted">
        Checking <span className="font-mono">{number}</span>…
      </p>
    </div>
  );
}

function HowItWorks() {
  return (
    <section className="rounded-2xl border border-line bg-white p-6 sm:p-8">
      <h2 className="font-display text-2xl font-semibold text-navy">Where to find the number</h2>
      <ul className="mt-4 space-y-3 text-muted">
        <li className="flex gap-3">
          <span className="text-green-dark"><Icon name="file" size={18} /></span>
          On the member's PSASA certificate, under the certificate number.
        </li>
        <li className="flex gap-3">
          <span className="text-green-dark"><Icon name="badge" size={18} /></span>
          Scan the QR code on the certificate. It opens this page with the number filled in.
        </li>
        <li className="flex gap-3">
          <span className="text-green-dark"><Icon name="search" size={18} /></span>
          Don't have a number? Search the <Link to="/register" className="font-semibold text-green-dark underline">member register</Link> by name.
        </li>
      </ul>
    </section>
  );
}

function SafetyAside() {
  return (
    <aside className="space-y-4">
      <div className="rounded-2xl bg-navy p-6 text-white">
        <Icon name="shield" size={26} />
        <h2 className="mt-3 text-lg font-semibold text-white">Only this page proves status</h2>
        <p className="mt-2 text-sm text-white/75">
          Screenshots, copied badges and old certificates don't prove someone is a member today. Check here every time
          before you pay.
        </p>
      </div>
      <div className="rounded-2xl border border-line bg-white p-6">
        <h2 className="font-semibold text-navy">Something doesn't match?</h2>
        <p className="mt-2 text-sm text-muted">Tell us about a fake certificate or a misleading membership claim.</p>
        <Link to="/concern" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-green-dark">
          <Icon name="flag" size={16} /> Raise a concern
        </Link>
      </div>
    </aside>
  );
}

/* Small pieces */

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}

function Message({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-[var(--amber-soft)] p-6">
      <span className="text-[#9a6700]"><Icon name="warning" /></span>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="mt-1 text-muted">{children}</p>
      </div>
    </div>
  );
}

function ReportLink() {
  return (
    <Link to="/concern" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-green-dark">
      <Icon name="flag" size={16} /> Report a concern about this certificate
    </Link>
  );
}

function CheckedAt({ value }: { value: string }) {
  const time = new Date(value).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
  return <p className="mt-6 border-t border-line pt-4 text-xs text-muted">Status checked {time}.</p>;
}

const formatDate = (value: string) => new Date(value).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
