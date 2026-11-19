import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "../../../components/Icon";
import { TRUST_GAP } from "./content";
import { EASE } from "./motion";
import { Eyebrow, GrainOverlay, SplitWords } from "./ui";

type Mode = "without" | "with";

const CHATS: Record<Mode, { from: "them" | "you"; text: string }[]> = {
  without: [
    { from: "them", text: "Hey love! Those sneakers are R2,400. Deposit upfront please 🙏" },
    { from: "you", text: "Are you legit? Do you have proof?" },
    { from: "them", text: "Here's my certificate 📸 [screenshot]" },
    { from: "them", text: "Pay into my cousin's account, mine is giving issues" },
  ],
  with: [
    { from: "them", text: "Hi! Those sneakers are R2,400 including delivery." },
    { from: "you", text: "Are you verified?" },
    { from: "them", text: "Yes, check my live page: PSSA.site/verify/PSSA-2026-SAMPLE" },
    { from: "them", text: "I've sent our written order. Read it before you pay ✍🏾" },
  ],
};

export function TrustGap() {
  const [mode, setMode] = useState<Mode>("without");
  const withPssa = mode === "with";

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-navy via-navy-2 to-navy py-24 text-white sm:py-32">
      <GrainOverlay />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 size-[700px] -translate-x-1/2 rounded-full blur-[140px]"
        animate={{ backgroundColor: withPssa ? "rgba(24,162,105,0.16)" : "rgba(190,60,50,0.14)" }}
        transition={{ duration: 0.8 }}
      />
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <Eyebrow>The trust gap</Eyebrow>
            <h2 className="mt-6 font-display text-[clamp(2.5rem,5.5vw,4.5rem)] font-semibold leading-[1] text-white">
              <SplitWords text="Trust shouldn't be" /> <span className="italic text-green"><SplitWords text="a gamble." delay={0.2} /></span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-white/65">
              Same sneakers. Same price. Two very different conversations. Flip the switch and see what changes when your
              shopper is a verified PSSA member.
            </p>
          </div>

          <div role="radiogroup" aria-label="Compare" className="relative flex rounded-full border border-white/15 bg-white/5 p-1.5 backdrop-blur-md">
            {(["without", "with"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={`relative z-10 rounded-full px-5 py-3 text-sm font-semibold transition-colors sm:px-7 ${mode === m ? (m === "with" ? "text-white" : "text-navy") : "text-white/70 hover:text-white"}`}
              >
                {mode === m && (
                  <motion.span
                    layoutId="gap-pill"
                    className={`absolute inset-0 -z-10 rounded-full ${m === "with" ? "bg-green" : "bg-white"}`}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  />
                )}
                {m === "without" ? "Unverified shopper" : "PSSA member"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div className="relative mx-auto w-full max-w-[340px]">
            <div className="rounded-[44px] border border-white/15 bg-gradient-to-b from-white/10 to-white/[0.02] p-3 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9)]">
              <div className="overflow-hidden rounded-[34px] bg-[#0f1a17]">
                <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 px-5 py-4">
                  <span className={`flex size-9 items-center justify-center rounded-full text-sm font-bold transition-colors ${withPssa ? "bg-green text-navy" : "bg-white/15 text-white"}`}>
                    S
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Shopper</p>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={mode}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className={`flex items-center gap-1 text-[11px] ${withPssa ? "text-green" : "text-white/45"}`}
                      >
                        {withPssa ? (
                          <>
                            <Icon name="check" size={11} /> Active PSSA member
                          </>
                        ) : (
                          "Status unknown"
                        )}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </div>
                <div className="flex min-h-[380px] flex-col gap-2.5 p-4">
                  <AnimatePresence mode="popLayout">
                    {CHATS[mode].map((c, i) => (
                      <motion.div
                        key={`${mode}-${i}`}
                        initial={{ opacity: 0, y: 14, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ delay: i * 0.35, duration: 0.4, ease: EASE }}
                        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug ${
                          c.from === "you" ? "self-end rounded-br-md bg-[#1f6f4f] text-white" : "self-start rounded-bl-md bg-white/10 text-white/90"
                        }`}
                      >
                        {c.text}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-white/40">Illustrative conversation</p>
          </div>

          <AnimatePresence mode="wait">
            <motion.ul
              key={mode}
              initial="hidden"
              animate="show"
              exit="exit"
              variants={{ show: { transition: { staggerChildren: 0.08 } } }}
              className="grid gap-4 sm:grid-cols-2"
            >
              {TRUST_GAP[mode].map((item) => (
                <motion.li
                  key={item.title}
                  variants={{
                    hidden: { opacity: 0, y: 24, rotateX: -12 },
                    show: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.6, ease: EASE } },
                    exit: { opacity: 0, y: -12, transition: { duration: 0.25 } },
                  }}
                  className={`rounded-3xl border p-6 backdrop-blur-md ${withPssa ? "border-green/30 bg-green/[0.08]" : "border-white/10 bg-white/[0.04]"}`}
                >
                  <span
                    className={`flex size-10 items-center justify-center rounded-full ${withPssa ? "bg-green text-white" : "bg-[#be3c32]/20 text-[#ff8f84]"}`}
                  >
                    <Icon name={withPssa ? "check" : "close"} size={18} />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{item.text}</p>
                </motion.li>
              ))}
            </motion.ul>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
