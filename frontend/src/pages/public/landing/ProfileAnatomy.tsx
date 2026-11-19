import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { ANATOMY, IMG } from "./content";
import { EASE } from "./motion";
import { Eyebrow, GrainOverlay, SplitWords } from "./ui";

export function ProfileAnatomy() {
  const [active, setActive] = useState(ANATOMY[0].id);
  const current = ANATOMY.find((a) => a.id === active) ?? ANATOMY[0];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-navy via-navy-2 to-navy py-24 text-white sm:py-32">
      <GrainOverlay />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-20 size-[600px] rounded-full bg-green/10 blur-[140px]" />
      <div className="relative z-10 mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-2 lg:items-center">
        <div className="order-2 lg:order-1">
          <SpecimenCard active={active} onSelect={setActive} />
        </div>

        <div className="order-1 lg:order-2">
          <Eyebrow>Read a profile like a pro</Eyebrow>
          <h2 className="mt-6 font-display text-[clamp(2.5rem,5vw,4.25rem)] font-semibold leading-[1] text-white">
            <SplitWords text="Five things to look for" /> <span className="italic text-green"><SplitWords text="before you pay." delay={0.2} /></span>
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/65">
            Every member's live page tells you exactly who they are and what they're approved to do. Tap the markers on the
            specimen to learn what each detail means.
          </p>

          <ol className="mt-10 space-y-2">
            {ANATOMY.map((a) => {
              const on = a.id === active;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setActive(a.id)}
                    onMouseEnter={() => setActive(a.id)}
                    aria-pressed={on}
                    className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition ${on ? "border-green/45 bg-green/10" : "border-transparent hover:bg-white/5"}`}
                  >
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold transition ${on ? "bg-green text-white" : "bg-white/10 text-white/70"}`}>
                      {a.label}
                    </span>
                    <span className={`font-semibold ${on ? "text-white" : "text-white/70"}`}>{a.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <AnimatePresence mode="wait">
            <motion.p
              key={current.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="mt-6 min-h-[84px] rounded-2xl border-l-2 border-green bg-white/[0.04] p-5 text-[15px] leading-relaxed text-white/80"
              aria-live="polite"
            >
              {current.text}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function Marker({ id, active, onSelect, children }: { id: string; active: string; onSelect: (id: string) => void; children: ReactNode }) {
  const item = ANATOMY.find((a) => a.id === id);
  const on = active === id;
  return (
    <div className={`relative rounded-xl transition ${on ? "bg-green/10 ring-1 ring-green/60" : ""}`}>
      {children}
      <button
        type="button"
        onClick={() => onSelect(id)}
        aria-label={`Explain: ${item?.title}`}
        className={`absolute -right-3 -top-3 flex size-7 items-center justify-center rounded-full font-display text-xs font-semibold shadow-lg transition ${
          on ? "scale-110 bg-green text-white" : "bg-white text-navy hover:bg-green hover:text-white"
        }`}
      >
        {on && <span className="absolute inset-0 animate-ping rounded-full bg-green/60" />}
        <span className="relative">{item?.label}</span>
      </button>
    </div>
  );
}

function SpecimenCard({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [8, -8]), { stiffness: 140, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-10, 10]), { stiffness: 140, damping: 18 });
  const sheenX = useTransform(mx, [0, 1], ["0%", "100%"]);
  const sheen = useMotionTemplate`radial-gradient(circle at ${sheenX} 30%, rgba(255,255,255,0.18), transparent 45%)`;

  return (
    <div className="mx-auto max-w-[460px] [perspective:1200px]">
      <motion.div
        onPointerMove={(e) => {
          if (reduce || e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width);
          my.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          mx.set(0.5);
          my.set(0.5);
        }}
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="relative rounded-[32px] border border-white/15 bg-gradient-to-br from-[#1b2230] via-[#11161f] to-[#0b0e14] p-7 shadow-[0_60px_120px_-40px_rgba(0,0,0,0.9)]"
      >
        <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[32px]" style={{ background: sheen }} />
        <span aria-hidden="true" className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 rotate-[-18deg] font-display text-6xl font-bold uppercase tracking-[0.2em] text-white/[0.04]">
          Specimen
        </span>

        <div className="flex items-center justify-between" style={{ transform: "translateZ(30px)" }}>
          <p className="font-display text-2xl font-bold">
            PSSA<span className="text-green">.</span>
          </p>
          <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Live member page</span>
        </div>

        <div className="mt-7 grid gap-5" style={{ transform: "translateZ(40px)" }}>
          <Marker id="name" active={active} onSelect={onSelect}>
            <div className="flex items-center gap-4 p-2">
              <img src={IMG.thandi} alt="" className="size-16 rounded-2xl object-cover object-top" loading="lazy" />
              <div>
                <p className="font-display text-xl font-semibold">Sample Member</p>
                <p className="text-sm text-white/55">Trading as Sample Styling Co.</p>
              </div>
            </div>
          </Marker>

          <Marker id="number" active={active} onSelect={onSelect}>
            <div className="p-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Certificate number</p>
              <p className="mt-1 font-mono text-lg tracking-wider text-green-soft">PSSA-2026-XXXXXX</p>
            </div>
          </Marker>

          <div className="grid grid-cols-2 gap-4">
            <Marker id="scope" active={active} onSelect={onSelect}>
              <div className="p-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Scope</p>
                <p className="mt-1 text-sm text-white/85">Clothing, footwear and accessories</p>
              </div>
            </Marker>
            <Marker id="dates" active={active} onSelect={onSelect}>
              <div className="p-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Valid</p>
                <p className="mt-1 text-sm text-white/85">12 months from approval</p>
              </div>
            </Marker>
          </div>

          <Marker id="status" active={active} onSelect={onSelect}>
            <div className="flex items-center justify-between rounded-2xl bg-green/15 p-4">
              <span className="flex items-center gap-2.5 font-semibold text-green">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-green" />
                </span>
                Active
              </span>
              <span className="text-xs text-white/50">Read live from the register</span>
            </div>
          </Marker>
        </div>
      </motion.div>
      <p className="mt-5 text-center text-xs text-white/40">Specimen for illustration. Not a real member.</p>
    </div>
  );
}
