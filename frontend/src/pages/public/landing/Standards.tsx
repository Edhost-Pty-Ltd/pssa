import { Link } from "react-router-dom";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import { Icon } from "../../../components/Icon";
import { POLICIES } from "./content";
import { Eyebrow, GrainOverlay, Reveal, SplitWords } from "./ui";

export function Standards() {
  return (
    <section id="standards" className="relative overflow-hidden bg-gradient-to-b from-navy via-navy-2 to-navy py-24 text-white sm:py-32">
      <GrainOverlay />
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <Eyebrow>Standards and policies</Eyebrow>
            <h2 className="mt-6 font-display text-[clamp(2.5rem,5.5vw,4.5rem)] font-semibold leading-[1] text-white">
              <SplitWords text="Published rules." /> <span className="italic text-green"><SplitWords text="Applied to everyone." delay={0.15} /></span>
            </h2>
          </div>
          <p className="text-lg leading-relaxed text-white/65">
            Nothing about how we verify, decide or discipline is secret. Read the same standards our members sign up to.
          </p>
        </div>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POLICIES.map((p, i) => (
            <Reveal as="li" key={p.slug} delay={(i % 4) * 0.06}>
              <PolicyCard {...p} />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

function PolicyCard({ slug, title, text, tag }: (typeof POLICIES)[number]) {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const spotlight = useMotionTemplate`radial-gradient(260px circle at ${x}px ${y}px, rgba(24,162,105,0.18), transparent 70%)`;

  return (
    <Link
      to={`/policies/${slug}`}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      onPointerLeave={() => {
        x.set(-200);
        y.set(-200);
      }}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition duration-500 hover:-translate-y-1 hover:border-green/45"
    >
      <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: spotlight }} />
      <div className="relative flex items-center justify-between">
        <span className="flex size-10 items-center justify-center rounded-xl bg-white/5 text-green transition group-hover:bg-green group-hover:text-white">
          <Icon name="file" size={18} />
        </span>
        <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">{tag}</span>
      </div>
      <h3 className="relative mt-6 font-display text-xl font-semibold text-white">{title}</h3>
      <p className="relative mt-2 flex-1 text-sm leading-relaxed text-white/60">{text}</p>
      <div className="relative mt-6 flex items-center justify-between border-t border-white/10 pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Draft v1.0</span>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-green transition group-hover:translate-x-1">
          Read <Icon name="arrow" size={14} />
        </span>
      </div>
    </Link>
  );
}
