import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useSpring } from "motion/react";
import { Icon } from "../../../components/Icon";
import { STAGES } from "./content";
import { Eyebrow, Reveal, SplitWords } from "./ui";

export function Complaints() {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 24 });

  return (
    <section id="complaints" className="relative overflow-hidden bg-gradient-to-b from-white via-soft to-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <Eyebrow tone="navy">Complaints and appeals</Eyebrow>
            <h2 className="mt-6 font-display text-[clamp(2.5rem,5.5vw,4.5rem)] font-semibold leading-[1] text-navy">
              <SplitWords text="If something goes wrong," /> <span className="italic text-green-dark"><SplitWords text="you're not alone." delay={0.2} /></span>
            </h2>
          </div>
          <p className="text-lg leading-relaxed text-ink/70">
            Raising a concern is free. We review the evidence, give the member a chance to respond and give both sides
            reasons and an appeal route. PSSA can't guarantee repayment or replace the police, courts or consumer bodies, but
            we can hold members to the standard they signed up for.
          </p>
        </div>

        <div className="relative mt-16">
          <div aria-hidden="true" className="absolute left-0 right-0 top-[27px] hidden h-px bg-navy/10 lg:block" />
          <motion.div aria-hidden="true" className="absolute left-0 right-0 top-[27px] hidden h-px origin-left bg-gradient-to-r from-green to-navy lg:block" style={{ scaleX: progress }} />
          <ol ref={ref} className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {STAGES.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 0.08} className="group">
                <span className="relative z-10 flex size-14 items-center justify-center rounded-full border border-navy/15 bg-white font-display text-xl font-semibold text-navy shadow-sm transition duration-500 group-hover:bg-navy group-hover:text-green">
                  {i + 1}
                </span>
                <div className="mt-6 rounded-3xl border border-sand-dark/50 bg-white p-6 transition duration-500 group-hover:-translate-y-1.5 group-hover:shadow-[0_24px_50px_-24px_rgba(11,32,55,0.35)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-green-dark">{s.label}</p>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-navy">{s.title}</h3>
                  <p className="mt-2 text-sm text-ink/65">{s.time}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <p className="text-sm italic text-muted">Proposed service targets, pending board adoption.</p>
          <Link to="/concern" className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3.5 font-semibold text-white transition hover:bg-green-dark">
            <Icon name="flag" size={17} /> Raise a concern
          </Link>
        </div>
      </div>
    </section>
  );
}
