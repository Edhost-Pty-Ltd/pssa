import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "motion/react";
import { Icon } from "../../../components/Icon";
import { IMG } from "./content";
import { GrainOverlay, Magnetic, SplitWords } from "./ui";

export function FinalCta() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.2, 1]);

  return (
    <section ref={ref} className="relative isolate overflow-hidden bg-gradient-to-b from-navy to-navy-2 py-32 text-white sm:py-44">
      <motion.img src={IMG.handover} alt="" style={{ scale }} className="absolute inset-0 -z-10 h-full w-full object-cover opacity-55" loading="lazy" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-navy via-navy/80 to-navy/20" />
      <GrainOverlay />
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <p className="font-script text-5xl text-green sm:text-6xl">Proudly South African</p>
          <h2 className="mt-4 font-display text-[clamp(2.75rem,6vw,5.5rem)] font-semibold leading-[0.98] text-white">
            <SplitWords text="Be the shopper" />
            <br />
            <span className="italic text-green-soft">
              <SplitWords text="customers can check." delay={0.15} />
            </span>
          </h2>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/75">
            Every delivery you make builds a reputation. PSASA makes it one your customers can verify in seconds. Apply, pass
            the four gates and give every customer the certainty they're looking for.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Magnetic>
              <Link
                to="/member"
                className="group inline-flex items-center gap-3 rounded-full bg-green py-4 pl-8 pr-3 font-semibold text-white shadow-[0_18px_40px_-12px_rgba(24,162,105,0.6)] transition hover:bg-green-dark"
              >
                Apply to join
                <span className="flex size-9 items-center justify-center rounded-full bg-navy text-green transition group-hover:rotate-[-45deg]">
                  <Icon name="arrow" size={17} />
                </span>
              </Link>
            </Magnetic>
            <Link to="/register" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-4 font-semibold text-white backdrop-blur-sm transition hover:bg-white/10">
              <Icon name="search" size={17} /> Check a shopper
            </Link>
            <Link to="/policies/verification" className="link-underline text-sm font-semibold text-white/75 hover:text-white">
              Read the Verification Standard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
