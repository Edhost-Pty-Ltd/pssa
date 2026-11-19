import { useRef, useState } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { Icon, type IconName } from "../../../components/Icon";
import { SHOPPER_TYPES } from "./content";
import { EASE } from "./motion";
import { Eyebrow, Reveal } from "./ui";

const STORY =
  "A personal shopper finds, buys and delivers the things you want, from a Sandton boutique, a Joburg fabric market or an outlet overseas. It is usually arranged over WhatsApp or Instagram. It's personal, convenient and growing fast. But you almost always pay before you see a thing.";

const PRINCIPLES: { icon: IconName; title: string; text: string }[] = [
  { icon: "shield", title: "We verify members", text: "Who applicants are, how they trade, the receiving accounts they use and the channels they control." },
  { icon: "book", title: "We set conduct standards", text: "Honest advertising, responsible sourcing, transparent prices, careful payment handling and fair service." },
  { icon: "people", title: "We are not the seller", text: "You buy directly from the member. Membership does not make PSSA the seller or guarantee the transaction." },
  { icon: "bank", title: "Fees never buy approval", text: "Fees are separate from decisions. The same standards apply to founders, sponsors and every applicant." },
];

export function WhatIsShopper() {
  return (
    <section id="about" className="relative overflow-hidden bg-cream py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <Eyebrow>What is a personal shopper?</Eyebrow>
        <ScrollStory text={STORY} />

        <ShopperTypes />

        <div className="mt-28 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <Eyebrow tone="navy">Where PSSA comes in</Eyebrow>
            <h2 className="mt-5 font-display text-[clamp(2.25rem,4.5vw,3.75rem)] font-semibold leading-[1.02] text-noir">
              An association, <span className="italic text-gold-dark">not a marketplace.</span>
            </h2>
          </div>
          <p className="text-lg leading-relaxed text-ink/75">
            PSSA is a voluntary membership body for personal shoppers and sourcing traders. Members earn their place
            through verification and a conduct assessment, and customers can check their status at any time. We exist so
            that trusting your shopper is a decision you can make with evidence, not hope.
          </p>
        </div>

        <ul className="mt-14 grid gap-px overflow-hidden rounded-[28px] border border-sand-dark/60 bg-sand-dark/60 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 0.08} className="group relative bg-cream p-8 transition-colors duration-500 hover:bg-noir">
              <span className="font-display text-sm font-semibold text-gold-dark transition group-hover:text-gold">0{i + 1}</span>
              <span className="mt-8 flex size-12 items-center justify-center rounded-2xl bg-noir text-gold transition duration-500 group-hover:bg-gold group-hover:text-noir">
                <Icon name={p.icon} size={22} />
              </span>
              <h3 className="mt-6 font-display text-xl font-semibold text-noir transition group-hover:text-white">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/70 transition group-hover:text-white/70">{p.text}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ScrollStory({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className="mt-8 max-w-5xl font-display text-[clamp(1.75rem,3.6vw,3.25rem)] font-medium leading-[1.18] text-noir">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <Word key={`${w}-${i}`} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} highlight={/pay|see|thing\./.test(w)}>
            {w}
          </Word>
        ))}
      </span>
    </p>
  );
}

function Word({ children, progress, range, highlight }: { children: string; progress: MotionValue<number>; range: [number, number]; highlight: boolean }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className={`mr-[0.25em] inline-block ${highlight ? "italic text-gold-dark" : ""}`}>
      {children}
    </motion.span>
  );
}

function ShopperTypes() {
  const [active, setActive] = useState(0);
  return (
    <div className="mt-20 flex flex-col gap-4 lg:h-[520px] lg:flex-row">
      {SHOPPER_TYPES.map((t, i) => {
        const open = i === active;
        return (
          <motion.button
            key={t.tag}
            type="button"
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-expanded={open}
            layout
            transition={{ layout: { duration: 0.7, ease: EASE } }}
            className={`group relative h-[420px] overflow-hidden rounded-[28px] text-left lg:h-auto ${open ? "lg:flex-[2.4]" : "lg:flex-1"}`}
          >
            <img src={t.image} alt="" className={`absolute inset-0 h-full w-full object-cover transition duration-[1.2s] ${open ? "scale-100" : "scale-110"}`} loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/40 to-noir/5" />
            <div className="relative flex h-full flex-col justify-between p-7 text-white">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-white/25 bg-noir/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gold backdrop-blur-md">
                  {t.tag}
                </span>
                <span className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md">
                  <Icon name={t.icon} size={18} />
                </span>
              </div>
              <div>
                <h3 className="font-display text-3xl font-semibold text-white">{t.title}</h3>
                <motion.p
                  initial={false}
                  animate={{ opacity: open ? 1 : 0, height: open ? "auto" : 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="max-w-md overflow-hidden text-[15px] leading-relaxed text-white/80 max-lg:!h-auto max-lg:!opacity-100"
                >
                  <span className="block pt-3">{t.text}</span>
                </motion.p>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
