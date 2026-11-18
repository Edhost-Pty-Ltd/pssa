import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { searchRegister, type RegisterMember } from "../../api/register";
import { Icon, type IconName } from "../../components/Icon";
import { SiteFooter } from "../../components/site/SiteFooter";
import { SiteHeader } from "../../components/site/SiteHeader";
import { errorMessage } from "../../lib/api";

// Public landing page. Wording comes from the website summaries in the PSSA policy documents (drafts v1.0).

export default function Landing() {
  return (
    <div className="landing font-body text-ink">
      <SiteHeader />
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

function Hero() {
  return (
    <section className="pattern-weave relative overflow-hidden text-white">
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-16 text-center sm:pt-24">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-green">
          Personal Shoppers and Sourcing Association
        </p>
        <h1 className="mt-8 flex flex-col items-center gap-3 text-5xl font-bold sm:text-7xl lg:text-[88px]">
          <span className="label-block">Check before</span>
          <span className="label-block">you pay.</span>
        </h1>

        <div className="relative mx-auto mt-12 max-w-2xl px-8 sm:px-12">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-3 border-y-4 border-l-4 border-white/35" />
          <span aria-hidden="true" className="absolute inset-y-0 right-0 w-3 border-y-4 border-r-4 border-white/35" />
          <p className="py-2 text-lg leading-relaxed text-white/85 sm:text-xl">
            PSSA verifies who personal shoppers are, how they trade and the channels they control, so you can check a
            member's live status before you buy.
          </p>
        </div>

        <RegisterSearch />
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
    <div id="register" className="mx-auto mt-12 max-w-3xl scroll-mt-40 rounded-2xl bg-white p-5 text-left text-ink shadow-2xl sm:p-7">
      <form onSubmit={onSubmit}>
        <label htmlFor="register-search" className="font-display text-xl font-semibold text-navy">
          Verify a member
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-line px-4 focus-within:border-green">
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
    <section id="about" className="scroll-mt-32 bg-sand">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-dark">About PSSA</p>
          <h2 className="mt-4 text-4xl font-bold text-navy sm:text-5xl">An association, not a marketplace.</h2>
          <p className="mt-5 text-lg leading-relaxed text-ink/80">
            PSSA is a voluntary membership body for personal shoppers and sourcing traders. Members earn their place
            through verification and a conduct assessment, and customers can check their status at any time.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="rounded-2xl bg-white p-6 shadow-sm">
              <span className="flex size-12 items-center justify-center rounded-full bg-navy text-green">
                <Icon name={p.icon} size={22} />
              </span>
              <h3 className="mt-5 text-xl font-semibold text-navy">{p.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{p.text}</p>
            </div>
          ))}
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
  return (
    <section id="membership" className="scroll-mt-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 pb-14 pt-20 sm:pt-24">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-dark">How membership works</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:items-end">
          <h2 className="text-4xl font-bold text-navy sm:text-5xl">Four gates. Every applicant.</h2>
          <p className="text-lg leading-relaxed text-muted">
            No badge or public listing is created until every gate is passed. Paying a fee or passing the exam on its
            own never activates membership.
          </p>
        </div>
      </div>

      {STEPS.map((step, i) => {
        const flip = i % 2 === 1;
        const light = step.panel.includes("bg-sand");
        return (
          <div key={step.title} className="grid md:grid-cols-2">
            <div className={`flex items-center justify-center bg-soft px-6 py-14 ${flip ? "md:order-2" : ""}`}>
              <div className="text-center">
                <span className="font-display text-[120px] font-bold leading-none text-navy/10 sm:text-[160px]">
                  0{i + 1}
                </span>
                <p className="-mt-6 text-sm font-bold uppercase tracking-[0.22em] text-navy/60">Step {i + 1} of 4</p>
              </div>
            </div>
            <div className={`${step.panel} px-8 py-14 sm:px-14 sm:py-16`}>
              <h3 className="text-3xl font-bold sm:text-4xl">{step.title}</h3>
              <p className={`mt-4 max-w-lg text-lg leading-relaxed ${light ? "text-ink/80" : "text-white/80"}`}>{step.text}</p>
              <ul className="mt-6 max-w-lg space-y-3">
                {step.points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <span className={light ? "text-green-dark" : "text-green"}>
                      <Icon name="check" size={20} />
                    </span>
                    <span className={light ? "text-ink/85" : "text-white/90"}>{point}</span>
                  </li>
                ))}
              </ul>
              {step.note && <p className="mt-6 text-sm italic text-ink/60">{step.note}</p>}
            </div>
          </div>
        );
      })}
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
    <section id="buy-safely" className="pattern-weave scroll-mt-32 text-white">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 py-20 sm:py-24 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-green">For personal shoppers</p>
          <h2 className="mt-4 text-4xl font-bold text-white sm:text-5xl">Why join?</h2>
          <IconList items={WHY_JOIN} />
          <Link to="/member" className="mt-10 inline-flex items-center gap-2 rounded-xl bg-green px-6 py-3.5 font-semibold hover:bg-green-dark">
            Apply to join <Icon name="arrow" size={18} />
          </Link>
        </div>
        <div className="lg:border-l lg:border-white/15 lg:pl-16">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-green">For customers</p>
          <h2 className="mt-4 text-4xl font-bold text-white sm:text-5xl">Buy safely.</h2>
          <IconList items={BUY_SAFELY} />
          <Link
            to="/policies/order-template"
            className="mt-10 inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3.5 font-semibold hover:bg-white/10"
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
    <section className="bg-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 sm:py-24 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-dark">Live verification</p>
          <h2 className="mt-4 text-4xl font-bold text-navy sm:text-5xl">A badge is only as good as its live status.</h2>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Every PSSA badge must identify the member and link to their live page on PSSA.site. When membership expires
            or is suspended, that page changes straight away.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {STATUSES.map((s) => (
            <li key={s.label} className="rounded-2xl border border-line p-6">
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${s.tone}`}>{s.label}</span>
              <p className="mt-4 leading-relaxed text-ink/80">{s.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* Complaints */

const STAGES = [
  { title: "Acknowledged", time: "Within 2 business days" },
  { title: "Triage", time: "Normally within 5 business days" },
  { title: "Member responds", time: "5 business days" },
  { title: "Outcome", time: "Aim: within 30 business days" },
  { title: "Appeal", time: "File within 10 business days" },
];

function Complaints() {
  return (
    <section className="bg-soft">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
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
        <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STAGES.map((stage, i) => (
            <li key={stage.title} className="rounded-2xl bg-white p-6 shadow-sm">
              <span className="font-display text-3xl font-bold text-green">{i + 1}</span>
              <p className="mt-3 font-semibold text-navy">{stage.title}</p>
              <p className="mt-1 text-sm text-muted">{stage.time}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm italic text-muted">Proposed service targets, pending board adoption.</p>
        <Link to="/concern" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3.5 font-semibold text-white hover:bg-navy-2">
          <Icon name="flag" size={18} /> Raise a concern
        </Link>
      </div>
    </section>
  );
}

/* Standards and policies */

const POLICIES = [
  { slug: "code-of-conduct", title: "Code of Conduct", text: "The rules members follow on social media, websites and in private messages." },
  { slug: "verification", title: "Verification Standard", text: "How we check identity, address, banking, authority and trading channels." },
  { slug: "certification", title: "Certification and Renewal", text: "The assessment, 12-month membership and annual renewal." },
  { slug: "complaints", title: "Complaints and Appeals", text: "How concerns are handled, timelines, decisions and appeals." },
  { slug: "privacy", title: "Privacy and Retention", text: "What we collect, why, who can see it and how long we keep it." },
  { slug: "badge-rules", title: "Badge and Certificate Rules", text: "Who may display the badge, and how to report misuse." },
  { slug: "independence", title: "Independence and Fees", text: "Fees are kept separate from approval and disciplinary decisions." },
  { slug: "order-template", title: "Customer Order Template", text: "A blank written order to agree with your shopper before you pay." },
];

function Standards() {
  return (
    <section id="standards" className="scroll-mt-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-dark">Standards and policies</p>
        <h2 className="mt-4 max-w-3xl text-4xl font-bold text-navy sm:text-5xl">Published rules, applied the same way to everyone.</h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POLICIES.map((p) => (
            <Link
              key={p.slug}
              to={`/policies/${p.slug}`}
              className="group flex flex-col rounded-2xl border border-line p-6 transition hover:border-green hover:shadow-md"
            >
              <span className="text-navy group-hover:text-green-dark"><Icon name="file" size={22} /></span>
              <h3 className="mt-4 text-lg font-semibold text-navy">{p.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{p.text}</p>
              <span className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Draft v1.0</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Closing call to action */

function JoinBand() {
  return (
    <section className="bg-green-dark text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-6 py-16 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Are you a personal shopper or sourcing trader?</h2>
          <p className="mt-3 text-lg text-white/80">Give your customers a status they can check. Apply to join PSSA.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/member" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-green-dark hover:bg-green-soft">
            Apply to join <Icon name="arrow" size={18} />
          </Link>
          <Link to="/policies/verification" className="inline-flex items-center rounded-xl border border-white/50 px-6 py-3.5 font-semibold hover:bg-white/10">
            Read the Verification Standard
          </Link>
        </div>
      </div>
    </section>
  );
}
