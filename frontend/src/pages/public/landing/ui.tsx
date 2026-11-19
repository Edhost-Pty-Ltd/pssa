import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { EASE, fadeUp } from "./motion";

export function Eyebrow({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "green" | "navy" }) {
  const color = tone === "gold" ? "text-gold" : tone === "green" ? "text-green" : "text-navy/60";
  const line = tone === "gold" ? "bg-gold" : tone === "green" ? "bg-green" : "bg-navy/40";
  return (
    <p className={`flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] ${color}`}>
      <span className={`h-px w-8 ${line}`} aria-hidden="true" />
      {children}
    </p>
  );
}

export function Reveal({
  children,
  className = "",
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li" | "section" | "article";
}) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      custom={delay}
    >
      {children}
    </Tag>
  );
}

export function SplitWords({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom" aria-hidden="true">
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            whileInView={{ y: "0%" }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.06 }}
          >
            {word}
            {i < words.length - 1 ? "\u00a0" : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export function Magnetic({ children, className = "", strength = 0.3 }: { children: ReactNode; className?: string; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 18 });

  return (
    <motion.div
      ref={ref}
      className={`inline-block ${className}`}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

export function GrainOverlay() {
  return <div aria-hidden="true" className="grain pointer-events-none absolute inset-0 z-[1] opacity-[0.06] mix-blend-overlay" />;
}
