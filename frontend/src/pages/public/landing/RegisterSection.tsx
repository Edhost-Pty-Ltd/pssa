import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { searchRegister, type RegisterMember } from "../../../api/register";
import { Icon, type IconName } from "../../../components/Icon";
import { errorMessage } from "../../../lib/api";
import { Eyebrow, Reveal, SplitWords } from "./ui";

type SearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; query: string; members: RegisterMember[] }
  | { kind: "error"; message: string };

const ASSURANCES: { icon: IconName; title: string; text: string }[] = [
  { icon: "clock", title: "Live, not a screenshot", text: "Results come straight from the register, so suspended or expired members never show as active." },
  { icon: "lock", title: "Private by design", text: "Only professional details are shown. Never ID numbers, banking or home addresses." },
  { icon: "flag", title: "Not listed? Tell us", text: "If someone claims to be a member and isn't here, report the misleading claim for free." },
];

const sentence = (text: string) => (text.endsWith(".") ? text : `${text}.`);

export function RegisterSection() {
  return (
    <section id="register" className="relative overflow-hidden bg-noir-2 py-24 text-white sm:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-10 size-[520px] rounded-full bg-gold/10 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 bottom-0 size-[520px] rounded-full bg-green/10 blur-[120px]" />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-20">
        <div>
          <Eyebrow>Live member register</Eyebrow>
          <h2 className="mt-6 font-display text-[clamp(2.75rem,6vw,5rem)] font-semibold leading-[0.98] text-white">
            <SplitWords text="Check before" />
            <br />
            <span className="italic text-gold">
              <SplitWords text="you pay." delay={0.15} />
            </span>
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/70">
            It takes ten seconds. Type the name your shopper uses and see whether they are an active, verified PSSA
            member right now.
          </p>
          <ul className="mt-10 space-y-6">
            {ASSURANCES.map((a, i) => (
              <Reveal as="li" key={a.title} delay={i * 0.08} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                  <Icon name={a.icon} size={19} />
                </span>
                <div>
                  <p className="font-semibold text-white">{a.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/60">{a.text}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal delay={0.1}>
          <RegisterSearch />
        </Reveal>
      </div>
    </section>
  );
}

function RegisterSearch() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ kind: "idle" });
  const controller = useRef<AbortController | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    controller.current?.abort();
    controller.current = new AbortController();
    setState({ kind: "loading" });
    try {
      const members = await searchRegister(q, controller.current.signal);
      setState({ kind: "done", query: q, members });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setState({ kind: "error", message: errorMessage(error) });
    }
  }

  return (
    <div className="search-halo relative rounded-[30px] p-px">
      <div className="relative rounded-[29px] bg-cream p-6 text-ink shadow-[0_40px_100px_-30px_rgba(0,0,0,0.7)] sm:p-9">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-noir text-gold">
              <Icon name="shield" size={20} />
            </span>
            <div>
              <p className="font-display text-2xl font-semibold text-noir">Verify a member</p>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">PSSA.site register</p>
            </div>
          </div>
          <span className="hidden items-center gap-2 rounded-full bg-green/10 px-3 py-1.5 text-xs font-bold text-green-dark sm:flex">
            <span className="size-2 animate-pulse rounded-full bg-green" /> Live
          </span>
        </div>

        <form onSubmit={onSubmit} className="mt-8">
          <label htmlFor="register-search" className="text-sm font-semibold text-noir">
            Shopper or business name
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-sand-dark/70 bg-white px-4 transition focus-within:border-gold focus-within:shadow-[0_0_0_4px_rgba(200,150,62,0.18)]">
              <span className="text-muted">
                <Icon name="search" />
              </span>
              <input
                id="register-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. the name on their Instagram"
                className="w-full bg-transparent py-4 text-base outline-none placeholder:text-muted/70"
                maxLength={100}
              />
            </div>
            <button
              type="submit"
              disabled={state.kind === "loading" || !query.trim()}
              className="group flex items-center justify-center gap-2 rounded-2xl bg-noir px-6 py-4 font-semibold text-white transition hover:bg-navy disabled:opacity-50"
            >
              {state.kind === "loading" ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-gold" /> Checking…
                </>
              ) : (
                <>
                  Check the register
                  <span className="text-gold transition group-hover:translate-x-1">
                    <Icon name="arrow" size={18} />
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

        <div aria-live="polite">
          <AnimatePresence mode="wait">
            {state.kind === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-6 grid gap-3 rounded-2xl border border-dashed border-sand-dark/80 p-5 text-sm text-muted sm:grid-cols-3"
              >
                {["Active members only", "Professional details only", "Updated the moment status changes"].map((t) => (
                  <span key={t} className="flex items-center gap-2">
                    <span className="text-green-dark">
                      <Icon name="check" size={15} />
                    </span>
                    {t}
                  </span>
                ))}
              </motion.div>
            )}
            {state.kind === "done" && (
              <motion.div key={`done-${state.query}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <SearchResults query={state.query} members={state.members} />
              </motion.div>
            )}
            {state.kind === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 flex gap-3 rounded-2xl bg-[var(--amber-soft)] p-4 text-sm"
              >
                <span className="text-[#9a6700]">
                  <Icon name="warning" />
                </span>
                <div>
                  <p className="font-semibold text-ink">Status unavailable</p>
                  <p className="mt-1 text-muted">
                    {sentence(state.message)} We can't confirm anyone's status right now, so don't treat a screenshot or
                    an old certificate as proof. Please try again shortly.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SearchResults({ query, members }: { query: string; members: RegisterMember[] }) {
  if (members.length === 0) {
    return (
      <div className="mt-6 rounded-2xl bg-white p-5 text-sm">
        <p className="font-semibold text-ink">No active member matches “{query}”.</p>
        <p className="mt-1 text-muted">
          If someone claims to be a PSSA member but isn't listed here, they are not currently active.{" "}
          <Link to="/concern" className="font-semibold text-green-dark underline">
            Report a misleading claim
          </Link>
          .
        </p>
      </div>
    );
  }
  return (
    <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
      {members.map((m, i) => (
        <motion.li
          key={m.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex items-center gap-4 p-4"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-noir font-semibold text-gold">
            {m.firstName[0]}
            {m.lastName[0]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">
              {m.firstName} {m.lastName}
            </p>
            <p className="truncate text-sm text-muted">{[m.businessName, m.category].filter(Boolean).join(" · ")}</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-green-soft px-3 py-1 text-xs font-semibold text-green-dark">
            <Icon name="check" size={14} /> Active member
          </span>
        </motion.li>
      ))}
    </ul>
  );
}
