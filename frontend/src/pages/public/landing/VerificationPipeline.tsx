import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { Icon } from "../../../components/Icon";
import { CHECKS, IMG } from "./content";
import { EASE } from "./motion";
import { Eyebrow, SplitWords } from "./ui";

export function VerificationPipeline() {
  const listRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 60%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActive(Math.max(0, Math.min(CHECKS.length - 1, Math.floor(v * CHECKS.length))));
  });

  return (
    <section id="verification" className="relative bg-sand-light py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <Eyebrow tone="navy">What we check</Eyebrow>
          <h2 className="mt-6 font-display text-[clamp(2.5rem,5.5vw,4.5rem)] font-semibold leading-[1] text-noir">
            <SplitWords text="We do the homework," /> <span className="italic text-gold-dark"><SplitWords text="so you don't have to." delay={0.2} /></span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-ink/70">
            You shouldn't need to be a detective to buy a handbag. Before anyone appears on our register, a trained
            verification officer works through seven checks, and a second reviewer signs off.
          </p>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:h-[calc(100svh-9rem)]">
            <div className="relative h-[420px] overflow-hidden rounded-[32px] shadow-[0_40px_80px_-30px_rgba(7,9,13,0.45)] lg:h-full">
              <img src={IMG.officer} alt="A PSASA verification officer carefully reviewing an applicant's documents at her desk" className="h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-noir/85 via-noir/10 to-transparent" />

              <div className="absolute inset-x-4 bottom-4 rounded-3xl border border-white/20 bg-noir/60 p-5 text-white backdrop-blur-xl sm:inset-x-6 sm:bottom-6">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Application review</p>
                  <p className="font-display text-sm text-white/70">
                    {active + 1} / {CHECKS.length}
                  </p>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div className="h-full origin-left rounded-full bg-gradient-to-r from-gold to-green" style={{ scaleX: progress }} />
                </div>
                <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                  {CHECKS.map((c, i) => {
                    const done = i <= active;
                    return (
                      <li key={c.title} className="flex items-center gap-2 text-xs">
                        <motion.span
                          animate={{ backgroundColor: done ? "#18a269" : "rgba(255,255,255,0.12)", scale: i === active ? 1.15 : 1 }}
                          className="flex size-4 shrink-0 items-center justify-center rounded-full text-white"
                        >
                          {done && <Icon name="check" size={10} />}
                        </motion.span>
                        <span className={done ? "text-white" : "text-white/45"}>{c.title}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          <div ref={listRef} className="relative">
            <div aria-hidden="true" className="absolute bottom-6 left-[27px] top-6 w-px bg-noir/10" />
            <motion.div aria-hidden="true" className="absolute left-[27px] top-6 w-px origin-top bg-gold" style={{ scaleY: progress, bottom: 24 }} />
            <ol className="relative">
            {CHECKS.map((c, i) => {
              const on = i === active;
              const done = i < active;
              return (
                <li key={c.title} className="relative flex min-h-[34svh] gap-6 pb-10 last:min-h-0 last:pb-0">
                  <motion.span
                    animate={{
                      backgroundColor: on ? "#07090d" : done ? "#c8963e" : "#f7f1e6",
                      color: on ? "#e7c27a" : done ? "#07090d" : "#647386",
                      scale: on ? 1.08 : 1,
                    }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="relative z-10 flex size-14 shrink-0 items-center justify-center rounded-2xl border border-noir/10 shadow-sm"
                  >
                    <Icon name={done ? "check" : c.icon} size={22} />
                  </motion.span>
                  <motion.div animate={{ opacity: on ? 1 : 0.45, x: on ? 0 : -4 }} transition={{ duration: 0.5, ease: EASE }} className="pt-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold-dark">Check {String(i + 1).padStart(2, "0")}</p>
                    <h3 className="mt-2 font-display text-3xl font-semibold text-noir">{c.title}</h3>
                    <p className="mt-3 max-w-md text-[17px] leading-relaxed text-ink/70">{c.text}</p>
                  </motion.div>
                </li>
              );
            })}
            </ol>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap gap-3">
          {["We never ask for passwords, PINs or one-time codes", "No reviewer approves their own application", "Adverse decisions come with reasons and an appeal route"].map((t) => (
            <span key={t} className="inline-flex items-center gap-2 rounded-full border border-noir/10 bg-white px-4 py-2 text-sm text-ink/80">
              <span className="text-green-dark">
                <Icon name="lock" size={14} />
              </span>
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
