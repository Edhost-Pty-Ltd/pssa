import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { Icon } from "../../../components/Icon";
import { CUSTOMER_STEPS, IMG } from "./content";
import { EASE } from "./motion";
import { Eyebrow, SplitWords } from "./ui";

const DURATION = 6000;

const TONE = {
  ok: "bg-green/10 text-green-dark",
  info: "bg-navy/5 text-ink/70",
  warn: "bg-[#be3c32]/10 text-[#a2332a]",
};

export function CheckBeforeYouPay() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: "-30%" });
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const running = inView && !paused && !reduce;

  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setActive((a) => (a + 1) % CUSTOMER_STEPS.length), DURATION);
    return () => window.clearTimeout(t);
  }, [active, running]);

  const step = CUSTOMER_STEPS[active];

  return (
    <section ref={ref} id="buy-safely" className="relative overflow-hidden bg-gradient-to-b from-white via-soft/60 to-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <Eyebrow tone="navy">For customers</Eyebrow>
            <h2 className="mt-6 font-display text-[clamp(2.5rem,5.5vw,4.5rem)] font-semibold leading-[1] text-navy">
              <SplitWords text="Four habits that" /> <span className="italic text-green-dark"><SplitWords text="protect your money." delay={0.2} /></span>
            </h2>
          </div>
          <p className="text-lg leading-relaxed text-ink/70">
            Verification does the heavy lifting. These four habits do the rest, whether you're ordering a matric dance
            dress, a baby's pram or a container of décor.
          </p>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <ol className="space-y-3" role="tablist" aria-label="Customer safety steps">
            {CUSTOMER_STEPS.map((s, i) => {
              const on = i === active;
              return (
                <li key={s.title}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setActive(i)}
                    className={`relative w-full overflow-hidden rounded-3xl border p-6 text-left transition duration-500 ${
                      on ? "border-navy bg-navy text-white shadow-[0_30px_60px_-30px_rgba(11,32,55,0.55)]" : "border-sand-dark/60 bg-white/70 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-5">
                      <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl transition ${on ? "bg-green text-white" : "bg-navy text-green"}`}>
                        <Icon name={s.icon} size={20} />
                      </span>
                      <div className="flex-1">
                        <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${on ? "text-green" : "text-green-dark"}`}>Habit {i + 1}</p>
                        <h3 className={`mt-1 font-display text-2xl font-semibold ${on ? "text-white" : "text-navy"}`}>{s.title}</h3>
                        <motion.div initial={false} animate={{ height: on ? "auto" : 0, opacity: on ? 1 : 0 }} transition={{ duration: 0.45, ease: EASE }} className="overflow-hidden">
                          <p className="pt-3 text-[15px] leading-relaxed text-white/70">{s.text}</p>
                        </motion.div>
                      </div>
                    </div>
                    {on && (
                      <span className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                        <motion.span
                          key={`${active}-${running}`}
                          className="block h-full origin-left bg-green"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: running ? 1 : 0 }}
                          transition={{ duration: running ? DURATION / 1000 : 0, ease: "linear" }}
                        />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="relative mx-auto h-[560px] w-full max-w-[520px]">
            <div className="absolute right-0 top-0 h-[86%] w-[78%] overflow-hidden rounded-[36px]">
              <img src={IMG.customer} alt="A young South African woman smiling with relief as she checks her shopper on her phone" className="h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-tr from-navy/40 to-transparent" />
            </div>

            <div className="absolute bottom-0 left-0 w-[62%] max-w-[290px] rounded-[38px] border border-navy/10 bg-navy p-2.5 shadow-[0_50px_100px_-30px_rgba(11,32,55,0.7)]">
              <div className="overflow-hidden rounded-[30px] bg-white">
                <div className="flex items-center justify-between bg-navy px-5 pb-4 pt-5 text-white">
                  <p className="font-display text-lg font-bold">
                    PSSA<span className="text-green">.</span>
                  </p>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/70">Step {active + 1} of 4</span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="space-y-2.5 p-4"
                  >
                    <p className="px-1 font-display text-lg font-semibold text-navy">{step.title}</p>
                    {step.screen.map((row, i) => (
                      <motion.div
                        key={row.label}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.12 }}
                        className="rounded-2xl bg-white p-3 shadow-sm"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{row.label}</p>
                        <p className={`mt-1.5 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[row.tone]}`}>{row.value}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap gap-4">
          <Link to="/register" className="inline-flex items-center gap-2 rounded-full bg-green px-6 py-3.5 font-semibold text-white transition hover:bg-green-dark">
            <Icon name="search" size={17} /> Check a shopper now
          </Link>
          <Link to="/policies/order-template" className="inline-flex items-center gap-2 rounded-full border border-navy/20 px-6 py-3.5 font-semibold text-navy transition hover:border-navy hover:bg-white">
            <Icon name="download" size={17} /> Customer order template
          </Link>
        </div>
      </div>
    </section>
  );
}
