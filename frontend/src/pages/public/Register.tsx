import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { initials, searchRegister, type RegisterMember, type RegisterPage } from "../../api/register";
import { Icon } from "../../components/Icon";
import { SiteFooter } from "../../components/site/SiteFooter";
import { SiteHeader } from "../../components/site/SiteHeader";
import { PUBLIC_MEMBER_STATUS, Status } from "../../components/ui";
import { errorMessage } from "../../lib/api";

const PAGE_SIZE = 10;

type Result = { key: string; data: RegisterPage } | { key: string; error: string };

const CHANNEL_LABELS: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok" };
const formatDate = (value: string) => new Date(value).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

export default function Register() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const key = `${q}|${page}`;

  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loading = result?.key !== key;

  useEffect(() => {
    const controller = new AbortController();
    searchRegister(q, { page, pageSize: PAGE_SIZE, signal: controller.signal })
      .then((data) => setResult({ key, data }))
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setResult({ key, error: errorMessage(err) });
      });
    return () => controller.abort();
  }, [q, page, key, attempt]);

  const goTo = (next: { q?: string; page?: number }) => {
    const nextQ = next.q ?? q;
    const nextPage = next.page ?? 1;
    const search: Record<string, string> = {};
    if (nextQ) search.q = nextQ;
    if (nextPage > 1) search.page = String(nextPage);
    setParams(search);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="landing font-body">
      <SiteHeader />
      <main className="bg-soft">
        <section className="bg-navy text-white">
          <div className="mx-auto max-w-5xl px-6 py-14 sm:py-16">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-green">Public member register</p>
            <h1 className="mt-3 font-display text-4xl font-semibold text-white sm:text-5xl">Check a member's current status</h1>
            <p className="mt-3 max-w-2xl text-lg text-white/75">
              Search the live register before you pay. Use the person's name, their trading name or the certificate number
              they shared with you.
            </p>
            <SearchForm key={q} initial={q} onSearch={(value) => goTo({ q: value })} />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-10" aria-live="polite">
          {loading && <Loading />}
          {!loading && result && "error" in result && (
            <div className="flex gap-3 rounded-2xl bg-[var(--amber-soft)] p-6">
              <span className="text-[#9a6700]"><Icon name="warning" /></span>
              <div>
                <p className="font-semibold text-ink">We couldn't load the register</p>
                <p className="mt-1 text-muted">
                  {result.error} We can't confirm anyone's status right now, so don't rely on a screenshot or an old
                  certificate.
                </p>
                <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-3 font-semibold text-green-dark underline">
                  Try again
                </button>
              </div>
            </div>
          )}
          {!loading && result && "data" in result && <Results q={q} data={result.data} onPage={(p) => goTo({ page: p })} />}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function SearchForm({ initial, onSearch }: { initial: string; onSearch: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  function submit(e: FormEvent) {
    e.preventDefault();
    onSearch(value.trim());
  }
  return (
    <form onSubmit={submit} role="search" className="mt-8 flex flex-col gap-3 sm:flex-row">
      <label htmlFor="register-q" className="sr-only">
        Name, trading name or certificate number
      </label>
      <div className="flex flex-1 items-center gap-3 rounded-xl bg-white px-4 text-ink focus-within:ring-2 focus-within:ring-green">
        <span className="text-muted"><Icon name="search" /></span>
        <input
          id="register-q"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Lerato or PSSA-2026-004821"
          maxLength={100}
          className="w-full bg-transparent py-3.5 text-base outline-none"
        />
      </div>
      <button type="submit" className="flex items-center justify-center gap-2 rounded-xl bg-green px-6 py-3.5 font-semibold text-white hover:bg-green-dark">
        Search register <Icon name="arrow" size={18} />
      </button>
    </form>
  );
}

function Results({ q, data, onPage }: { q: string; data: RegisterPage; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  if (data.items.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white p-8 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-soft text-muted">
          <Icon name="search" />
        </span>
        <h2 className="mt-4 font-display text-2xl font-semibold text-navy">
          {q ? `No member matches "${q}"` : "No members are listed yet"}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-muted">
          {q
            ? "Check the spelling or try a certificate number. If someone claims to be a PSASA member but isn't listed here, they are not a current member."
            : "Members appear here once they have been verified and approved."}
        </p>
        {q && (
          <Link to="/concern" className="mt-5 inline-flex items-center gap-2 font-semibold text-green-dark">
            <Icon name="flag" size={16} /> Report a misleading membership claim
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl font-semibold text-navy">
            {data.total} {data.total === 1 ? "member" : "members"}
            {q ? ` matching "${q}"` : " on the register"}
          </h2>
          <p className="text-sm text-muted">Live status, checked just now.</p>
        </div>
        {pages > 1 && (
          <p className="text-sm text-muted">
            Page {data.page} of {pages}
          </p>
        )}
      </div>

      <ul className="grid gap-4">
        {data.items.map((m) => (
          <MemberCard key={m.id} member={m} />
        ))}
      </ul>

      {pages > 1 && (
        <nav aria-label="Register pages" className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => onPage(data.page - 1)}
            className="rounded-xl border border-line bg-white px-5 py-3 font-semibold text-navy disabled:opacity-40"
          >
            ← Previous
          </button>
          <button
            type="button"
            disabled={data.page >= pages}
            onClick={() => onPage(data.page + 1)}
            className="rounded-xl border border-line bg-white px-5 py-3 font-semibold text-navy disabled:opacity-40"
          >
            Next →
          </button>
        </nav>
      )}

      <p className="mt-8 flex items-start gap-2 text-sm text-muted">
        <Icon name="lock" size={15} /> Only professional details are shown. Never ID numbers, banking details or home addresses.
      </p>
    </>
  );
}

function MemberCard({ member: m }: { member: RegisterMember }) {
  const active = m.status === "active";
  return (
    <li className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-green-soft font-semibold text-green-dark">
          {initials(m.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-ink">{m.name}</h3>
            <Status of={PUBLIC_MEMBER_STATUS} value={m.status} />
          </div>
          <p className="mt-1 text-sm text-muted">{[m.tradingName, m.scope].filter(Boolean).join(" · ") || "Personal shopper"}</p>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {m.number && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Certificate number</dt>
                <dd className="mt-0.5 font-mono font-semibold text-ink">{m.number}</dd>
              </div>
            )}
            {m.validUntil && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{active ? "Valid until" : "Was valid until"}</dt>
                <dd className="mt-0.5 font-semibold text-ink">{formatDate(m.validUntil)}</dd>
              </div>
            )}
          </dl>

          {active && m.channels.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Verified channels</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {m.channels.map((c) => (
                  <li key={`${c.kind}-${c.value}`} className="flex items-center gap-1.5 rounded-full bg-soft px-3 py-1 text-sm text-ink">
                    <span className="text-green-dark"><Icon name="check" size={14} /></span>
                    {CHANNEL_LABELS[c.kind] ?? c.kind}: {c.value.replace(/^https:\/\/(www\.)?/, "")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!active && (
            <p className="mt-4 rounded-xl bg-[var(--amber-soft)] px-4 py-3 text-sm text-ink">
              Not a current PSASA member. Don't pay anyone on the strength of a PSASA badge or certificate for this person.
            </p>
          )}

          {m.number && (
            <Link to={`/verify/${m.number}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-green-dark">
              <Icon name="shield" size={16} /> Open the live certificate check
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

function Loading() {
  return (
    <ul className="grid gap-4" aria-label="Loading the register">
      {[1, 2, 3].map((i) => (
        <li key={i} className="flex gap-4 rounded-2xl border border-line bg-white p-6">
          <span className="size-12 animate-pulse rounded-full bg-line" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-48 animate-pulse rounded bg-line" />
            <div className="h-3 w-64 animate-pulse rounded bg-line" />
          </div>
        </li>
      ))}
    </ul>
  );
}
