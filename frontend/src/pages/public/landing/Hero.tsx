import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { Icon, type IconName } from "../../../components/Icon";
import { IMG, SAMPLE_PROFILES, TRUST_TICKER } from "./content";
import { EASE } from "./motion";
import { GrainOverlay, Magnetic, SplitWords } from "./ui";

const RAIL: { icon: IconName; label: string; href: string }[] = [
  { icon: "search", label: "Check a shopper", href: "#register" },
  { icon: "badge", label: "Apply to join", href: "/member" },
  { icon: "flag", label: "Raise a concern", href: "/concern" },
];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const subjectY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "14%"]);
  const cityY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "28%"]);
  const cityScale = useTransform(scrollYProgress, [0, 1], [1.08, reduce ? 1.08 : 1.22]);
  const headlineY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-40%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const tiltX = useSpring(0, { stiffness: 80, damping: 20 });
  const tiltY = useSpring(0, { stiffness: 80, damping: 20 });
  const glowX = useTransform(tiltX, [-1, 1], ["40%", "60%"]);
  const glowY = useTransform(tiltY, [-1, 1], ["35%", "55%"]);
  const subjectRotate = useTransform(tiltX, [-1, 1], [-1.5, 1.5]);
  const subjectX = useTransform(tiltX, [-1, 1], [-14, 14]);
  const glow = useTransform(
    [glowX, glowY],
    ([x, y]) =>
      `radial-gradient(circle at ${x} ${y}, rgba(200,150,62,0.28), transparent 42%), radial-gradient(circle at 85% 90%, rgba(24,162,105,0.14), transparent 40%)`,
  );

  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden bg-noir text-white"
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        tiltX.set(((e.clientX - r.left) / r.width) * 2 - 1);
        tiltY.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
    >
      <motion.div aria-hidden="true" className="absolute inset-0 -z-10" style={{ y: cityY, scale: cityScale }}>
        <img src={IMG.heroCity} alt="" className="h-full w-full object-cover opacity-40" />
      </motion.div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-noir/70 via-noir/40 to-noir" />
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ background: glow }}
      />
      <GrainOverlay />

      <div className="relative z-10 mx-auto grid min-h-[100svh] max-w-[1440px] grid-cols-1 px-6 pb-28 pt-32 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-8 lg:px-10 lg:pb-24 lg:pt-36">
        <nav aria-label="Quick actions" className="absolute left-6 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-5 lg:left-10 lg:flex">
          {RAIL.map((item, i) => {
            const inner = (
              <motion.span
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 + i * 0.12, duration: 0.6, ease: EASE }}
                className="group relative flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-gold backdrop-blur-md transition hover:border-gold hover:bg-gold hover:text-noir"
              >
                <Icon name={item.icon} size={18} />
                <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-semibold text-noir opacity-0 shadow-lg transition group-hover:opacity-100">
                  {item.label}
                </span>
              </motion.span>
            );
            return item.href.startsWith("#") ? (
              <a key={item.label} href={item.href} aria-label={item.label}>
                {inner}
              </a>
            ) : (
              <Link key={item.label} to={item.href} aria-label={item.label}>
                {inner}
              </Link>
            );
          })}
        </nav>

        <motion.div
          className="relative z-10 order-1 lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:self-start"
          style={{ y: headlineY, opacity: fade }}
        >
          <h1 id="hero-title" className="text-center font-sans font-extrabold uppercase lg:text-right">
            <span className="block text-[clamp(3.4rem,9vw,8.75rem)] leading-[0.86] tracking-[-0.045em]">
              <SplitWords text="Shop with" delay={0.2} />
            </span>
            <span className="sr-only">certainty</span>
            <ScriptWord />
          </h1>
        </motion.div>

        <motion.div
          className="pointer-events-none relative z-0 order-2 -mt-6 h-[58svh] min-h-[380px] lg:absolute lg:inset-x-0 lg:bottom-0 lg:mt-0 lg:h-[92%]"
          style={{ y: subjectY }}
        >
          <motion.img
            src={IMG.heroShopper}
            alt="A confident Black South African personal shopper in a camel blazer, holding shopping bags and her phone"
            initial={{ opacity: 0, scale: 1.06, filter: "blur(12px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.6, ease: EASE }}
            style={{ rotate: subjectRotate, x: subjectX }}
            className="hero-subject absolute bottom-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2 object-contain object-bottom"
          />
        </motion.div>

        <motion.div
          className="relative z-10 order-3 mt-8 max-w-md lg:col-span-4 lg:col-start-1 lg:row-start-2 lg:mt-0 lg:self-end lg:pl-16"
          style={{ opacity: fade }}
        >
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8, ease: EASE }}
            className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-[1.12]"
          >
            We check the shopper, so you <em className="text-gold not-italic">don't have to.</em>
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.8, ease: EASE }}
            className="mt-5 text-[15px] leading-relaxed text-white/70"
          >
            Personal shoppers and sourcing traders make life easier, but you often pay a stranger before you see the goods.
            PSSA verifies who they are, the account you pay into and the channels they trade on, then shows their live
            status for anyone to check.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8, ease: EASE }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Magnetic>
              <a
                href="#register"
                className="group inline-flex items-center gap-3 rounded-full bg-gold py-3.5 pl-7 pr-3 font-semibold text-noir shadow-[0_18px_40px_-12px_rgba(200,150,62,0.7)] transition hover:bg-gold-light"
              >
                Check a shopper
                <span className="flex size-8 items-center justify-center rounded-full bg-noir text-gold transition group-hover:rotate-[-45deg]">
                  <Icon name="arrow" size={16} />
                </span>
              </a>
            </Magnetic>
            <Link to="/member" className="link-underline text-sm font-semibold text-white/85 hover:text-white">
              I'm a shopper. Apply to join
            </Link>
          </motion.div>
        </motion.div>

        <div className="relative z-10 order-4 mt-12 lg:col-span-4 lg:col-start-9 lg:row-start-2 lg:mt-0 lg:self-end">
          <ProfileCarousel />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-noir/70 backdrop-blur-md">
        <div className="marquee flex overflow-hidden py-4" aria-label="What PSSA checks">
          {[0, 1].map((dup) => (
            <ul key={dup} className="marquee-track flex shrink-0 items-center gap-10 pr-10" aria-hidden={dup === 1}>
              {TRUST_TICKER.map((item) => (
                <li key={item} className="flex items-center gap-10 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                  {item}
                  <span className="text-gold" aria-hidden="true">✦</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScriptWord() {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 1000 300" className="mx-auto -mt-[0.12em] block w-full max-w-[720px] overflow-visible lg:ml-auto lg:mr-[-2%]" aria-hidden="true">
      <defs>
        <linearGradient id="gold-stroke" x1="0" x2="1">
          <stop offset="0%" stopColor="#e7c27a" />
          <stop offset="50%" stopColor="#c8963e" />
          <stop offset="100%" stopColor="#f3dca5" />
        </linearGradient>
      </defs>
      <motion.text
        x="500"
        y="215"
        textAnchor="middle"
        className="font-script"
        fontSize="250"
        fill="url(#gold-stroke)"
        stroke="url(#gold-stroke)"
        strokeWidth="2.4"
        strokeDasharray="2400"
        initial={reduce ? false : { strokeDashoffset: 2400, fillOpacity: 0 }}
        animate={{ strokeDashoffset: 0, fillOpacity: 0.12 }}
        transition={{ strokeDashoffset: { duration: 3.2, ease: "easeInOut", delay: 0.7 }, fillOpacity: { duration: 1.2, delay: 3.2 } }}
      >
        certainty
      </motion.text>
    </svg>
  );
}

function ProfileCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const total = SAMPLE_PROFILES.length;

  useEffect(() => {
    if (paused || reduce) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % total), 5200);
    return () => window.clearInterval(t);
  }, [paused, reduce, total]);

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + total) % total);
  const firstCard = useRef<HTMLLIElement>(null);
  const [step, setStep] = useState(288);

  useEffect(() => {
    const el = firstCard.current;
    if (!el) return;
    const measure = () => setStep(el.offsetWidth + 16);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.35, duration: 0.9, ease: EASE }}
      className="flex items-center gap-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Sample verified profiles"
    >
      <div className="flex flex-col gap-3">
        {([-1, 1] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() => go(dir)}
            aria-label={dir === -1 ? "Previous sample profile" : "Next sample profile"}
            className="flex size-11 items-center justify-center rounded-full bg-white text-noir shadow-lg transition hover:scale-110 hover:bg-gold"
          >
            <span className={dir === -1 ? "rotate-180" : ""}>
              <Icon name="chevron" size={18} />
            </span>
          </button>
        ))}
      </div>

      <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,black_78%,transparent)]">
        <motion.ul
          className="flex gap-4"
          animate={{ x: -index * step }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        >
          {[...SAMPLE_PROFILES, ...SAMPLE_PROFILES].map((p, i) => {
            const active = i % total === index;
            return (
              <li
                key={`${p.role}-${i}`}
                ref={i === 0 ? firstCard : undefined}
                aria-hidden={!active}
                className={`glass-noir w-[min(272px,78vw)] shrink-0 overflow-hidden rounded-[22px] transition-opacity duration-500 ${
                  active ? "opacity-100" : "opacity-55"
                }`}
              >
                <div className="relative h-36 overflow-hidden">
                  <img src={p.image} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-noir/90 to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full bg-noir/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/80 backdrop-blur">
                    Illustrative sample
                  </span>
                  <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-green px-2.5 py-1 text-[11px] font-bold text-white">
                    <span className="size-1.5 animate-pulse rounded-full bg-white" /> Active
                  </span>
                </div>
                <div className="p-4">
                  <p className="font-display text-lg font-semibold text-white">{p.role}</p>
                  <p className="mt-0.5 text-xs text-white/60">{p.scope}</p>
                  <AnimatePresence mode="wait">
                    {active && (
                      <motion.ul key={index} className="mt-3 space-y-1.5" initial="hidden" animate="show" exit="hidden">
                        {p.checks.map((c, ci) => (
                          <motion.li
                            key={c}
                            variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { delay: 0.15 + ci * 0.12 } } }}
                            className="flex items-center gap-2 text-[13px] text-white/85"
                          >
                            <span className="flex size-4 items-center justify-center rounded-full bg-gold/20 text-gold">
                              <Icon name="check" size={11} />
                            </span>
                            {c}
                          </motion.li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              </li>
            );
          })}
        </motion.ul>
        <div className="mt-4 flex gap-1.5" role="tablist" aria-label="Choose a sample profile">
          {SAMPLE_PROFILES.map((p, i) => (
            <button
              key={p.role}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show ${p.role} sample`}
              onClick={() => setIndex(i)}
              className={`h-1 rounded-full transition-all duration-500 ${i === index ? "w-10 bg-gold" : "w-4 bg-white/25 hover:bg-white/50"}`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
