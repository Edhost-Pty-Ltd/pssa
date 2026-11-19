import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "../../../components/Icon";
import { GATES, IMG, WHY_JOIN } from "./content";
import { EASE } from "./motion";
import { Eyebrow, GrainOverlay, Magnetic, SplitWords } from "./ui";

export function Gates() {
  const [active, setActive] = useState(0);
  const gate = GATES[active];

  return (
    <section id="membership" className="relative overflow-hidden bg-gradient-to-b from-navy via-navy-2 to-navy py-24 text-white sm:py-32">
      <GrainOverlay />
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <Eyebrow>For personal shoppers and traders</Eyebrow>
            <h2 className="mt-6 font-display text-[clamp(2.5rem,5.5vw,4.5rem)] font-semibold leading-[1] text-white">
              <SplitWords text="Four gates." /> <span className="italic text-green"><SplitWords text="Every applicant." delay={0.15} /></span>
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/65">
              No badge or public listing is created until every gate is passed. Paying a fee or passing the exam on its own
              never activates membership. That's what makes the badge worth earning.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {WHY_JOIN.map((w) => (
              <li key={w.text} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-white/75">
                <span className="text-green">
                  <Icon name={w.icon} size={18} />
                </span>
                {w.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-[28px] border border-white/10 bg-white/10 lg:grid-cols-4" role="tablist" aria-label="Membership gates">
          {GATES.map((g, i) => {
            const on = i === active;
            return (
              <button
                key={g.title}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActive(i)}
                className="relative bg-navy-2 p-6 text-left transition hover:bg-white/[0.06]"
              >
                {on && <motion.span layoutId="gate-active" className="absolute inset-x-0 top-0 h-1 bg-green" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
                <span className={`font-display text-5xl font-semibold transition ${on ? "text-green" : "text-white/20"}`}>0{i + 1}</span>
                <p className={`mt-4 font-semibold ${on ? "text-white" : "text-white/55"}`}>{g.title}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid overflow-hidden rounded-[32px] border border-white/10 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="relative min-h-[320px] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.img
                key={active}
                src={[IMG.boutique, IMG.officer, IMG.lerato, IMG.handover][active]}
                alt=""
                initial={{ opacity: 0, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: EASE }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-navy/80 to-transparent" />
            <p className="absolute bottom-6 left-6 font-display text-[7rem] font-semibold leading-none text-white/90">0{active + 1}</p>
          </div>
          <div className="bg-gradient-to-br from-white/[0.06] to-transparent p-8 sm:p-12">
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.45, ease: EASE }}>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-green">Gate {active + 1} of 4</p>
                <h3 className="mt-3 font-display text-4xl font-semibold text-white">{gate.title}</h3>
                <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/70">{gate.text}</p>
                <ul className="mt-8 space-y-3.5">
                  {gate.points.map((p, i) => (
                    <motion.li
                      key={p}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.07 }}
                      className="flex gap-3 text-white/90"
                    >
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green/15 text-green">
                        <Icon name="check" size={12} />
                      </span>
                      {p}
                    </motion.li>
                  ))}
                </ul>
                {gate.note && <p className="mt-6 text-sm italic text-white/45">{gate.note}</p>}
              </motion.div>
            </AnimatePresence>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Magnetic>
                <Link to="/member" className="inline-flex items-center gap-2 rounded-full bg-green px-6 py-3.5 font-semibold text-white transition hover:bg-green-dark">
                  Start your application <Icon name="arrow" size={17} />
                </Link>
              </Magnetic>
              <button
                type="button"
                onClick={() => setActive((a) => (a + 1) % GATES.length)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white"
              >
                Next gate <Icon name="chevron" size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
