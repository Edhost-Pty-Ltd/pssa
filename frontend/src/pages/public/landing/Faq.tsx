import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FAQS } from "./content";
import { EASE } from "./motion";
import { Eyebrow, SplitWords } from "./ui";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-cream py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Eyebrow tone="navy">Questions, answered</Eyebrow>
          <h2 className="mt-6 font-display text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-[1] text-noir">
            <SplitWords text="Good questions" /> <span className="italic text-gold-dark"><SplitWords text="deserve straight answers." delay={0.15} /></span>
          </h2>
          <p className="mt-6 max-w-sm text-lg leading-relaxed text-ink/70">
            Everything customers and shoppers ask us most, in plain language.
          </p>
        </div>

        <ul className="divide-y divide-sand-dark/60 border-y border-sand-dark/60">
          {FAQS.map((f, i) => {
            const on = open === i;
            const id = `faq-${i}`;
            return (
              <li key={f.q}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={on}
                    aria-controls={id}
                    onClick={() => setOpen(on ? null : i)}
                    className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                  >
                    <span className={`font-display text-xl font-semibold transition sm:text-2xl ${on ? "text-noir" : "text-noir/75 group-hover:text-noir"}`}>{f.q}</span>
                    <span
                      className={`relative flex size-10 shrink-0 items-center justify-center rounded-full border transition duration-300 ${
                        on ? "rotate-45 border-noir bg-noir text-gold" : "border-noir/20 text-noir group-hover:border-noir"
                      }`}
                      aria-hidden="true"
                    >
                      <span className="absolute h-px w-3.5 bg-current" />
                      <span className="absolute h-3.5 w-px bg-current" />
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.div
                      id={id}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-7 text-[16px] leading-relaxed text-ink/75">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
