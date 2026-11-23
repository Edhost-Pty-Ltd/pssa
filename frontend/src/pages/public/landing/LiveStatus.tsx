import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { STATUSES } from "./content";
import { EASE } from "./motion";
import { Eyebrow, SplitWords } from "./ui";

export function LiveStatus() {
  const [key, setKey] = useState(STATUSES[0].key);
  const s = STATUSES.find((x) => x.key === key) ?? STATUSES[0];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-navy via-navy-2 to-navy py-24 text-white sm:py-32">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute right-[10%] top-1/2 size-[560px] -translate-y-1/2 rounded-full blur-[120px]"
        animate={{ backgroundColor: s.glow }}
        transition={{ duration: 0.8 }}
      />
      <div className="relative mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <Eyebrow>Live verification</Eyebrow>
          <h2 className="mt-6 font-display text-[clamp(2.5rem,5vw,4.25rem)] font-semibold leading-[1] text-white">
            <SplitWords text="A badge is only as good as" /> <span className="italic text-green"><SplitWords text="its live status." delay={0.25} /></span>
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/70">
            Every PSASA badge must identify the member and link to their live page on PSSA.site. When membership expires or
            is suspended, that page changes straight away. A copied logo can't fake that.
          </p>

          <div role="tablist" aria-label="Member statuses" className="mt-10 grid gap-2 sm:grid-cols-2">
            {STATUSES.map((x) => {
              const on = x.key === key;
              return (
                <button
                  key={x.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setKey(x.key)}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-semibold transition ${
                    on ? "border-white/30 bg-white/10 text-white" : "border-white/10 text-white/60 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span className={`size-2.5 shrink-0 rounded-full ${x.dot}`} />
                  {x.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute inset-0 -rotate-6 rounded-[36px] border border-white/10 bg-white/[0.03]" aria-hidden="true" />
          <div className="absolute inset-0 rotate-3 rounded-[36px] border border-white/10 bg-white/[0.03]" aria-hidden="true" />
          <div className="relative rounded-[36px] border border-white/15 bg-navy/70 p-8 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs tracking-wider text-white/50">PSSA.site/verify/PSSA-2026-XXXXXX</p>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Specimen</span>
            </div>
            <div className="mt-10 flex flex-col items-center text-center">
              <motion.div
                className="relative flex size-36 items-center justify-center rounded-full border border-white/10"
                animate={{ boxShadow: `0 0 80px 0 ${s.glow}` }}
                transition={{ duration: 0.6 }}
              >
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-2 rounded-full border-2 border-dashed border-white/15"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={s.key}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className={`size-16 rounded-full ${s.dot} ${s.key === "active" ? "animate-pulse" : ""}`}
                  />
                </AnimatePresence>
              </motion.div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={s.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  aria-live="polite"
                >
                  <span className={`mt-8 inline-flex rounded-full border px-4 py-1.5 text-sm font-bold ${s.chip}`}>{s.label}</span>
                  <p className="mx-auto mt-5 max-w-xs leading-relaxed text-white/75">{s.text}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
