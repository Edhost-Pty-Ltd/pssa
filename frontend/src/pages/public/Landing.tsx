import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { searchRegister, type RegisterMember } from "../../api/register";
import { Icon, type IconName } from "../../components/Icon";
import { LivingBackdrop } from "../../components/site/LivingBackdrop";
import { Reveal } from "../../components/site/Reveal";
import { SiteFooter } from "../../components/site/SiteFooter";
import { SiteHeader } from "../../components/site/SiteHeader";
import { errorMessage } from "../../lib/api";

// Public landing page. Wording comes from the website summaries in the PSSA policy documents (drafts v1.0).

export default function Landing() {
  return (
    <div className="landing font-body text-ink">
      <SiteHeader transparent />
      <main>
        <Hero />
        <About />
        <Membership />
        <WhyJoinAndBuySafely />
        <LiveStatus />
        <Complaints />
        <Standards />
        <JoinBand />
      </main>
      <SiteFooter />
    </div>
  );
}

/* Hero */

const HERO_PILLARS: { href: string; kicker: string; title: string; detail: string; icon: IconName }[] = [
  {
    href: "#about",
    kicker: "Association Role",
    title: "Independent Vetting",
    detail: "Identity, banking, and trading channels verified before any badge is issued.",
    icon: "shield",
  },
  {
    href: "#membership",
    kicker: "Four-Gate Path",
    title: "Conduct & Certification",
    detail: "Every applicant passes evidence checks, an 80% assessment, and dual approval.",
    icon: "badge",
  },
  {
    href: "#standards",
    kicker: "Consumer Protection",
    title: "Published Standards",
    detail: "Clear rules, written order templates, and free-of-charge concern reviews.",
    icon: "book",
  },
];

function Hero() {
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <LivingBackdrop variant="hero" />
      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-28 text-center sm:pb-24 sm:pt-40">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-navy/45 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-green backdrop-blur-md">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green" aria-hidden="true" />
          Personal Shoppers and Sourcing Association
        </p>
        <h1 className="mt-8 text-5xl font-bold leading-[1.05] tracking-tight text-white drop-shadow-[0_6px_24px_rgba(11,32,55,0.45)] sm:text-7xl lg:text-[88px]">
          Check before
          <br />
          you pay.
        </h1>

        <div className="relative mx-auto mt-12 max-w-2xl rounded-2xl border border-white/20 bg-navy/35 px-8 py-4 backdrop-blur-md sm:px-12">
          <span aria-hidden="true" className="absolute inset-y-2 left-2 w-3 border-y-4 border-l-4 border-white/45" />
          <span aria-hidden="true" className="absolute inset-y-2 right-2 w-3 border-y-4 border-r-4 border-white/45" />
          <p className="py-1 text-lg leading-relaxed text-white/95 sm:text-xl">
            PSSA verifies who personal shoppers are, how they trade and the channels they control, so you can check a
            member's live status before you buy.
          </p>
        </div>

        <RegisterSearch />

        {/* MASA-inspired Core Offerings Quick Links */}
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 text-left sm:grid-cols-3">
          {HERO_PILLARS.map((pillar) => (
            <a
              key={pillar.title}
              href={pillar.href}
              className="glass-dark-card group flex flex-col justify-between rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:border-green/50 hover:bg-navy/70"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-green">{pillar.kicker}</span>
                  <span className="flex size-9 items-center justify-center rounded-full bg-white/10 text-green transition group-hover:bg-green group-hover:text-white">
                    <Icon name={pillar.icon} size={17} />
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-bold text-white">{pillar.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-white/75">{pillar.detail}</p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-green transition group-hover:translate-x-1">
                Explore <Icon name="arrow" size={14} />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

type SearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; query: string; members: RegisterMember[] }
  | { kind: "error"; message: string };

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
    <div id="register" className="glass-panel mx-auto mt-12 max-w-3xl scroll-mt-40 rounded-2xl p-5 text-left text-ink sm:p-7">
      <form onSubmit={onSubmit}>
        <label htmlFor="register-search" className="font-display text-xl font-semibold text-navy">
          Verify a member
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-line/90 bg-white/75 px-4 focus-within:border-green focus-within:bg-white">
            <span className="text-muted"><Icon name="search" /></span>
            <input
              id="register-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name or business name"
              className="w-full bg-transparent py-3.5 text-base outline-none"
              maxLength={100}
            />
          </div>
          <button
            type="submit"
            disabled={state.kind === "loading" || !query.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-green px-6 py-3.5 font-semibold text-white transition hover:bg-green-dark disabled:opacity-60"
          >
            {state.kind === "loading" ? "Checking…" : "Check the register"} <Icon name="arrow" size={18} />
          </button>
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted">
          <Icon name="lock" size={15} /> Only professional details are shown. Never ID numbers, banking or home addresses.
        </p>
      </form>

      <div aria-live="polite">
        {state.kind === "done" && <SearchResults query={state.query} members={state.members} />}
        {state.kind === "error" && (
          <div className="mt-5 flex gap-3 rounded-xl bg-[var(--amber-soft)] p-4 text-sm">
            <span className="text-[#9a6700]"><Icon name="warning" /></span>
            <div>
              <p className="font-semibold text-ink">Status unavailable</p>
              <p className="mt-1 text-muted">
                {message(state.message)} We can't confirm anyone's status right now, so don't treat a screenshot or an old
                certificate as proof. Please try again shortly.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const message = (text: string) => (text.endsWith(".") ? text : `${text}.`);

function SearchResults({ query, members }: { query: string; members: RegisterMember[] }) {
  if (members.length === 0) {
    return (
      <div className="mt-5 rounded-xl bg-soft p-4 text-sm">
        <p className="font-semibold text-ink">No active member matches “{query}”.</p>
        <p className="mt-1 text-muted">
          If someone claims to be a PSSA member but isn't listed here, they are not currently active.{" "}
          <Link to="/concern" className="font-semibold text-green-dark underline">Report a misleading claim</Link>.
        </p>
      </div>
    );
  }
  return (
    <ul className="mt-5 divide-y divide-line rounded-xl border border-line">
      {members.map((m) => (
        <li key={m.id} className="flex items-center gap-4 p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-green-soft font-semibold text-green-dark">
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
        </li>
      ))}
    </ul>
  );
}

/* About */

const PRINCIPLES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "shield",
    title: "We verify members",
    text: "We check who applicants are, how they trade, the receiving accounts they use and the channels they control.",
  },
  {
    icon: "book",
    title: "We set conduct standards",
    text: "Honest advertising, responsible sourcing, transparent prices, careful payment handling and fair customer service.",
  },
  {
    icon: "people",
    title: "We are not the seller",
    text: "You buy directly from the member. PSSA membership does not make PSSA the seller or guarantee the transaction.",
  },
  {
    icon: "bank",
    title: "Fees never buy approval",
    text: "Fees are separate from decisions, and the same standards apply to founders, sponsors and every applicant.",
  },
];

function About() {
  return (
    <section id="about" className="scroll-mt-32 bg-gradient-to-b from-sand via-sand/70 to-soft/60">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-dark">About PSSA</p>
            <h2 className="mt-4 text-4xl font-bold text-navy sm:text-5xl">An association, not a marketplace.</h2>
          </div>
          <p className="max-w-xl text-base leading-relaxed text-ink/80 sm:text-lg">
            PSSA is a voluntary membership body for personal shoppers and sourcing traders. Members earn their place
            through verification and a conduct assessment, and customers can check their status at any time.
          </p>
        </div>

        {/* Editorial Bento Grid with bespoke personal-shopping photography */}
        <div className="mt-14 grid gap-5 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <div className="group relative h-full min-h-[360px] overflow-hidden rounded-3xl border border-white/60 shadow-xl lg:min-h-[440px]">
              <img
                src="/images/shopper-editorial.jpg"
                alt="Personal shopper curating tailored garments and luxury boutique bags in a sunlit showroom"
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/15 to-transparent"
              />
              <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/25 bg-navy/55 p-4 text-white backdrop-blur-md">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green">Curated &amp; Verified</p>
                <p className="mt-1 font-display text-lg font-semibold">
                  Independent standards for modern personal shoppers.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
            {PRINCIPLES.map((p, idx) => (
              <Reveal key={p.title} delayMs={idx * 80}>
                <div className="glass-card flex h-full flex-col justify-between rounded-3xl p-6 sm:p-7">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex size-12 items-center justify-center rounded-2xl bg-navy text-green shadow-sm">
                        <Icon name={p.icon} size={22} />
                      </span>
                      <span className="font-display text-2xl font-bold text-navy/15">0{idx + 1}</span>
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-navy">{p.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">{p.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* Membership: zig-zag steps */

const STEPS: { title: string; text: string; points: string[]; panel: string; note?: string }[] = [
  {
    title: "Apply with evidence",
    text: "Complete the questionnaire and submit the evidence for your route: individual or sole trader, registered business, overseas applicant or new trader.",
    points: [
      "Valid ID or passport",
      "Proof of address, usually dated within three months",
      "Bank-issued confirmation of your receiving account",
      "Proof that you control each trading channel you list",
    ],
    panel: "bg-navy text-white",
  },
  {
    title: "Verification checks",
    text: "A verification officer checks and records every item. Uploading a document is not the same as passing a check.",
    points: [
      "A second reviewer confirms activation and high-risk exceptions",
      "We never ask for passwords, PINs or one-time codes",
      "No reviewer approves their own application",
      "Adverse decisions come with reasons and an appeal route",
    ],
    panel: "bg-green-dark text-white",
  },
  {
    title: "Conduct assessment",
    text: "Every applicant, and every customer-facing representative of a business, passes the assessment before being covered.",
    points: [
      "30 questions in 45 minutes",
      "At least 80% overall and every critical question correct",
      "Advertising, sourcing, authenticity, payments, delivery, customer care, privacy and complaints",
      "One retake after at least seven days",
    ],
    panel: "bg-sand text-navy",
    note: "Proposed rules, pending board adoption.",
  },
  {
    title: "Approval and live certificate",
    text: "Two authorised people approve each member. The certificate shows your number, scope and dates, and links to your live status.",
    points: [
      "Membership lasts 12 months",
      "Renewal includes updated checks and a refresher assessment",
      "Reminders 60, 30 and 7 days before expiry",
      "At expiry, active status ends immediately",
    ],
    panel: "bg-navy-3 text-white",
  },
];

function Membership() {
  const [activeStep, setActiveStep] = useState(0);
  const step = STEPS[activeStep];
  const light = step.panel.includes("bg-sand");

  return (
    <section id="membership" className="scroll-mt-32 bg-gradient-to-b from-soft/60 via-white to-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-dark">How membership works</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:items-end">
          <h2 className="text-4xl font-bold text-navy sm:text-5xl">Four gates. Every applicant.</h2>
          <p className="text-lg leading-relaxed text-muted">
            No badge or public listing is created until every gate is passed. Paying a fee or passing the exam on its
            own never activates membership.
          </p>
        </div>

        {/* Interactive Gate Selector */}
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="tablist" aria-label="Membership gates">
          {STEPS.map((item, i) => {
            const isSelected = i === activeStep;
            return (
              <button
                key={item.title}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setActiveStep(i)}
                className={`group rounded-2xl border p-4 text-left transition duration-200 ${
                  isSelected
                    ? "border-green bg-navy text-white shadow-lg"
                    : "glass-card text-navy hover:border-green/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-display text-2xl font-bold ${isSelected ? "text-green" : "text-navy/40 group-hover:text-green-dark"}`}>
                    0{i + 1}
                  </span>
                  <span className={`text-[11px] font-bold uppercase tracking-[0.14em] ${isSelected ? "text-white/75" : "text-muted"}`}>
                    Gate {i + 1} of 4
                  </span>
                </div>
                <p className="mt-2 font-semibold">{item.title}</p>
              </button>
            );
          })}
        </div>

        {/* Active Gate Showcase with editorial still-life imagery */}
        <Reveal className="mt-6">
          <div className="grid overflow-hidden rounded-3xl border border-line/80 bg-white shadow-xl md:grid-cols-[0.9fr_1.1fr]">
            <div className="group relative min-h-[300px] overflow-hidden bg-navy">
              <img
                src="/images/sourcing-craft.jpg"
                alt="Curated personal shopping parcels, structured leather handbag, and minimal verification card"
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/25 to-transparent"
              />
              <div className="relative z-10 flex h-full flex-col justify-between p-8 text-white">
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-white/25 bg-navy/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-green backdrop-blur-md">
                    Gate 0{activeStep + 1} of 04
                  </span>
                  <div className="flex gap-1.5">
                    {STEPS.map((s, idx) => (
                      <button
                        key={s.title}
                        type="button"
                        aria-label={`Select gate ${idx + 1}: ${s.title}`}
                        onClick={() => setActiveStep(idx)}
                        className={`h-2 rounded-full transition-all ${
                          idx === activeStep ? "w-7 bg-green" : "w-2 bg-white/40 hover:bg-white/75"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-24">
                  <span className="font-display text-7xl font-bold leading-none text-white/90 sm:text-8xl">
                    0{activeStep + 1}
                  </span>
                  <p className="mt-2 text-sm text-white/80">Provenance, identity, and accountability at every step.</p>
                </div>
              </div>
            </div>

            <div className={`${step.panel} px-8 py-12 transition-colors duration-300 sm:px-12 sm:py-14`}>
              <h3 className="text-3xl font-bold sm:text-4xl">{step.title}</h3>
              <p className={`mt-4 max-w-lg text-lg leading-relaxed ${light ? "text-ink/80" : "text-white/85"}`}>
                {step.text}
              </p>
              <ul className="mt-6 max-w-lg space-y-3">
                {step.points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <span className={light ? "text-green-dark" : "text-green"}>
                      <Icon name="check" size={20} />
                    </span>
                    <span className={light ? "text-ink/85" : "text-white/95"}>{point}</span>
                  </li>
                ))}
              </ul>
              {step.note && <p className="mt-6 text-sm italic text-ink/60">{step.note}</p>}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* Why join and buy safely */

const WHY_JOIN: { icon: IconName; text: string }[] = [
  { icon: "badge", text: "A listing in the public member register once you are approved" },
  { icon: "shield", text: "A certificate customers can check live, instead of trusting a screenshot" },
  { icon: "people", text: "Standards that apply equally to everyone; fees never buy approval" },
  { icon: "book", text: "Clear rules for advertising, sourcing, payments and customer care" },
];

const BUY_SAFELY: { icon: IconName; text: string }[] = [
  { icon: "search", text: "Check the member register before you pay. Screenshots and old certificates don't prove current approval." },
  { icon: "file", text: "Get a written order: your trader, the exact goods, all charges, delivery, cancellation and refund terms." },
  { icon: "user", text: "Confirm whether the shopper sells the goods or buys them for you as your purchasing agent." },
  { icon: "flag", text: "Report misconduct, impersonation or badge misuse. Raising a concern is free." },
];

function IconList({ items }: { items: { icon: IconName; text: string }[] }) {
  return (
    <ul className="mt-8 space-y-5">
      {items.map((item) => (
        <li key={item.text} className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-green text-white">
            <Icon name={item.icon} size={20} />
          </span>
          <span className="pt-2 leading-relaxed text-white/85">{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

function WhyJoinAndBuySafely() {
  return (
    <section id="buy-safely" className="relative scroll-mt-32 overflow-hidden bg-navy text-white">
      <LivingBackdrop variant="band" />
      <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-6 py-20 sm:py-24 lg:grid-cols-2">
        <div className="glass-dark-card rounded-3xl p-8 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-green">For personal shoppers</p>
          <h2 className="mt-4 text-4xl font-bold text-white sm:text-5xl">Why join?</h2>
          <IconList items={WHY_JOIN} />
          <Link to="/member" className="mt-10 inline-flex items-center gap-2 rounded-xl bg-green px-6 py-3.5 font-semibold transition hover:bg-green-dark">
            Apply to join <Icon name="arrow" size={18} />
          </Link>
        </div>
        <div className="glass-dark-card rounded-3xl p-8 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-green">For customers</p>
          <h2 className="mt-4 text-4xl font-bold text-white sm:text-5xl">Buy safely.</h2>
          <IconList items={BUY_SAFELY} />
          <Link
            to="/policies/order-template"
            className="mt-10 inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-6 py-3.5 font-semibold backdrop-blur-sm transition hover:bg-white/20"
          >
            <Icon name="download" size={18} /> Customer order template
          </Link>
        </div>
      </div>
    </section>
  );
}

/* Live status */

const STATUSES = [
  { label: "Active", tone: "bg-green-soft text-green-dark", text: "Approval is current, within the listed scope and dates." },
  { label: "Suspended", tone: "bg-[var(--amber-soft)] text-[#8a5a00]", text: "Approval is temporarily inactive while a review takes place. We publish a neutral status, never a label." },
  { label: "Expired, revoked or resigned", tone: "bg-soft text-muted", text: "Not an active member. The right to use the badge has ended." },
  { label: "Unavailable", tone: "bg-[var(--blue-soft)] text-navy-3", text: "Status can't be confirmed right now. An old result is never shown as active." },
];

function LiveStatus() {
  return (
    <section className="bg-gradient-to-b from-white via-white to-soft">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-dark">Live verification</p>
            <h2 className="mt-4 text-4xl font-bold text-navy sm:text-5xl">
              A badge is only as good as its live status.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              Every PSSA badge must identify the member and link to their live page on PSSA.site. When membership expires
              or is suspended, that page changes straight away.
            </p>

            {/* Concierge editorial photo with floating live status pill */}
            <div className="group relative mt-8 overflow-hidden rounded-3xl border border-line/80 shadow-lg">
              <img
                src="/images/trust-concierge.jpg"
                alt="Personal shopper concierge reviewing an order on a tablet beside curated packaging"
                className="h-64 w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent"
              />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/25 bg-navy/60 px-4 py-2.5 text-xs text-white backdrop-blur-md">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green" />
                  Live Register Sync
                </span>
                <span className="text-white/75">Instant status updates</span>
              </div>
            </div>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {STATUSES.map((s, idx) => (
              <Reveal key={s.label} delayMs={idx * 70}>
                <li className={`glass-card flex h-full flex-col justify-between rounded-3xl p-6 ${idx % 2 === 1 ? "sm:translate-y-4" : ""}`}>
                  <div>
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${s.tone}`}>
                      {s.label === "Active" && <span className="h-2 w-2 animate-pulse rounded-full bg-green" aria-hidden="true" />}
                      {s.label}
                    </span>
                    <p className="mt-4 leading-relaxed text-ink/80">{s.text}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* Complaints */

const STAGES = [
  {
    title: "Acknowledged",
    time: "Within 2 business days",
    accent: "from-green to-green-dark",
    badge: "bg-green-soft text-green-dark",
    stepLabel: "Intake",
  },
  {
    title: "Triage",
    time: "Normally within 5 business days",
    accent: "from-[#3b82f6] to-navy-3",
    badge: "bg-[var(--blue-soft)] text-navy-3",
    stepLabel: "Evidence Check",
  },
  {
    title: "Member responds",
    time: "5 business days",
    accent: "from-[#d97706] to-[#b45309]",
    badge: "bg-[var(--amber-soft)] text-[#8a5a00]",
    stepLabel: "Right of Reply",
  },
  {
    title: "Outcome",
    time: "Aim: within 30 business days",
    accent: "from-green-dark to-navy",
    badge: "bg-sand text-navy",
    stepLabel: "Written Reasons",
  },
  {
    title: "Appeal",
    time: "File within 10 business days",
    accent: "from-navy to-navy-3",
    badge: "bg-navy text-white",
    stepLabel: "Independent Review",
  },
];

function Complaints() {
  const sectionRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0.2);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setScrollProgress(1);
      return;
    }

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const raw = (vh * 0.85 - rect.top) / (rect.height * 0.65);
      setScrollProgress(Math.max(0.12, Math.min(1, raw)));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const activeStageIndex = Math.min(STAGES.length - 1, Math.floor(scrollProgress * STAGES.length));

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-gradient-to-b from-soft via-sand/40 to-white"
    >
      {/* Subtle theme ambient glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-green/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-sand-dark/25 blur-3xl"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-dark">Complaints and appeals</p>
            <h2 className="mt-4 text-4xl font-bold text-navy sm:text-5xl">Raise a concern, free of charge.</h2>
          </div>
          <p className="text-lg leading-relaxed text-muted">
            We review the evidence, give the member a chance to respond and give both sides reasons and an appeal route.
            PSSA can't guarantee repayment or replace the police, courts or consumer bodies.
          </p>
        </div>

        {/* Scroll-animated timeline progress */}
        <div className="relative mt-14">
          <div
            aria-hidden="true"
            className="absolute top-11 right-8 left-8 hidden h-1 overflow-hidden rounded-full bg-navy/10 lg:block"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-green via-green-dark to-navy transition-all duration-300 ease-out"
              style={{ width: `${Math.round(scrollProgress * 100)}%` }}
            />
          </div>

          <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STAGES.map((stage, i) => {
              const reached = i <= activeStageIndex;
              return (
                <Reveal key={stage.title} delayMs={i * 75}>
                  <li
                    className={`glass-card group relative flex h-full flex-col overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${
                      reached ? "border-green/35 ring-1 ring-green/15" : ""
                    }`}
                  >
                    <div
                      aria-hidden="true"
                      className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${stage.accent} transition-opacity duration-300 ${
                        reached ? "opacity-100" : "opacity-35 group-hover:opacity-100"
                      }`}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex size-10 items-center justify-center rounded-full font-display text-lg font-bold transition-transform duration-300 group-hover:scale-110 ${
                          reached ? "bg-navy text-white shadow-md" : "bg-green-soft text-green-dark"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider ${stage.badge}`}>
                        {stage.stepLabel}
                      </span>
                    </div>
                    <p className="mt-5 text-lg font-bold text-navy">{stage.title}</p>
                    <p className="mt-1.5 text-sm text-muted">{stage.time}</p>
                  </li>
                </Reveal>
              );
            })}
          </ol>
        </div>

        <p className="mt-5 text-sm italic text-muted">Proposed service targets, pending board adoption.</p>
        <Link
          to="/concern"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3.5 font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-navy-2"
        >
          <Icon name="flag" size={18} /> Raise a concern
        </Link>
      </div>
    </section>
  );
}

/* Standards and policies */

const POLICIES = [
  {
    slug: "code-of-conduct",
    title: "Code of Conduct",
    text: "The rules members follow on social media, websites and in private messages.",
    tag: "Conduct",
    iconBg: "bg-green-soft text-green-dark group-hover:bg-green group-hover:text-white",
    bar: "from-green to-green-dark",
  },
  {
    slug: "verification",
    title: "Verification Standard",
    text: "How we check identity, address, banking, authority and trading channels.",
    tag: "Vetting",
    iconBg: "bg-[var(--blue-soft)] text-navy group-hover:bg-navy group-hover:text-white",
    bar: "from-navy to-navy-3",
  },
  {
    slug: "certification",
    title: "Certification and Renewal",
    text: "The assessment, 12-month membership and annual renewal.",
    tag: "Renewal",
    iconBg: "bg-sand text-navy group-hover:bg-navy group-hover:text-white",
    bar: "from-sand-dark to-navy",
  },
  {
    slug: "complaints",
    title: "Complaints and Appeals",
    text: "How concerns are handled, timelines, decisions and appeals.",
    tag: "Disputes",
    iconBg: "bg-[var(--amber-soft)] text-[#8a5a00] group-hover:bg-[#b45309] group-hover:text-white",
    bar: "from-[#d97706] to-green-dark",
  },
  {
    slug: "privacy",
    title: "Privacy and Retention",
    text: "What we collect, why, who can see it and how long we keep it.",
    tag: "Privacy",
    iconBg: "bg-green-soft text-green-dark group-hover:bg-green group-hover:text-white",
    bar: "from-green-dark to-navy",
  },
  {
    slug: "badge-rules",
    title: "Badge and Certificate Rules",
    text: "Who may display the badge, and how to report misuse.",
    tag: "Trust Mark",
    iconBg: "bg-[var(--blue-soft)] text-navy group-hover:bg-navy group-hover:text-white",
    bar: "from-navy-3 to-green",
  },
  {
    slug: "independence",
    title: "Independence and Fees",
    text: "Fees are kept separate from approval and disciplinary decisions.",
    tag: "Governance",
    iconBg: "bg-sand text-navy group-hover:bg-navy group-hover:text-white",
    bar: "from-sand-dark to-green-dark",
  },
  {
    slug: "order-template",
    title: "Customer Order Template",
    text: "A blank written order to agree with your shopper before you pay.",
    tag: "Template",
    iconBg: "bg-green-soft text-green-dark group-hover:bg-green group-hover:text-white",
    bar: "from-green to-navy",
  },
];

function Standards() {
  const sectionRef = useRef<HTMLElement>(null);
  const [parallaxOffset, setParallaxOffset] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const centered = (rect.top + rect.height * 0.5 - vh * 0.5) / vh;
      setParallaxOffset(Math.max(-14, Math.min(14, centered * 16)));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      id="standards"
      ref={sectionRef}
      className="relative scroll-mt-32 overflow-hidden bg-gradient-to-b from-white via-green-soft/35 to-sand/40"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-16 -right-24 h-80 w-80 rounded-full bg-green/10 blur-3xl"
      />
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-dark">Standards and policies</p>
        <h2 className="mt-4 max-w-3xl text-4xl font-bold text-navy sm:text-5xl">
          Published rules, applied the same way to everyone.
        </h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {POLICIES.map((p, idx) => (
            <Reveal key={p.slug} delayMs={idx * 50}>
              <div
                style={{
                  transform: `translateY(${(idx % 2 === 0 ? parallaxOffset : -parallaxOffset).toFixed(1)}px)`,
                  transition: "transform 180ms ease-out",
                }}
              >
                <Link
                  to={`/policies/${p.slug}`}
                  className="glass-card group relative flex h-full flex-col overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                >
                  <div
                    aria-hidden="true"
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${p.bar} opacity-60 transition-all duration-300 group-hover:h-1.5 group-hover:opacity-100`}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className={`flex size-10 items-center justify-center rounded-xl transition-colors duration-300 ${p.iconBg}`}>
                      <Icon name="file" size={19} />
                    </span>
                    <span className="rounded-full border border-line bg-white/80 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-navy">
                      {p.tag}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-navy">{p.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{p.text}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-line/70 pt-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Draft v1.0</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-dark transition-transform duration-300 group-hover:translate-x-1">
                      Read <Icon name="arrow" size={14} />
                    </span>
                  </div>
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Closing call to action */

function JoinBand() {
  return (
    <section className="bg-sand/40 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-r from-navy via-navy-2 to-green-dark p-8 text-white shadow-2xl sm:p-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-green">Membership Application</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Are you a personal shopper or sourcing trader?
          </h2>
          <p className="mt-3 text-lg text-white/80">
            Give your customers a status they can check. Apply to join PSSA.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3 lg:mt-0">
          <Link
            to="/member"
            className="inline-flex items-center gap-2 rounded-xl bg-green px-6 py-3.5 font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-green-dark"
          >
            Apply to join <Icon name="arrow" size={18} />
          </Link>
          <Link
            to="/policies/verification"
            className="inline-flex items-center rounded-xl border border-white/35 bg-white/10 px-6 py-3.5 font-semibold backdrop-blur-sm transition hover:bg-white/20"
          >
            Read the Verification Standard
          </Link>
        </div>
      </div>
    </section>
  );
}
