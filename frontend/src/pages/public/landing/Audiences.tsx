import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "motion/react";
import { Icon } from "../../../components/Icon";
import { AUDIENCES } from "./content";
import { Eyebrow, Reveal, SplitWords } from "./ui";

export function Audiences() {
  return (
    <section className="relative overflow-hidden bg-cream py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
            <Eyebrow tone="navy">Who PSSA is for</Eyebrow>
          </div>
          <h2 className="mt-6 font-display text-[clamp(2.5rem,5.5vw,4.5rem)] font-semibold leading-[1] text-noir">
            <SplitWords text="One standard." /> <span className="italic text-gold-dark"><SplitWords text="Everyone protected." delay={0.15} /></span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-ink/70">
            Honest shoppers deserve to stand out. Customers deserve certainty. PSSA gives both a shared language of trust.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {AUDIENCES.map((a, i) => (
            <Reveal key={a.tag} delay={i * 0.1} className={i === 1 ? "md:mt-16" : ""}>
              <AudienceCard {...a} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function AudienceCard({ tag, title, text, image, cta }: (typeof AUDIENCES)[number]) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const isHash = cta.to.startsWith("/#");

  const button = (
    <span className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-noir transition group-hover:bg-white">
      {cta.label} <Icon name="arrow" size={15} />
    </span>
  );

  return (
    <div ref={ref} className="group relative h-[540px] overflow-hidden rounded-[32px] bg-noir">
      <motion.img src={image} alt="" style={{ y }} className="absolute inset-0 h-[116%] w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/50 to-transparent transition duration-500 group-hover:via-noir/70" />
      <div className="relative flex h-full flex-col justify-end p-8 text-white">
        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">{tag}</span>
        <h3 className="mt-3 font-display text-3xl font-semibold text-white">{title}</h3>
        <p className="mt-3 max-h-0 overflow-hidden text-[15px] leading-relaxed text-white/80 opacity-0 transition-all duration-500 group-hover:max-h-40 group-hover:opacity-100 group-focus-within:max-h-40 group-focus-within:opacity-100 max-md:max-h-40 max-md:opacity-100">
          {text}
        </p>
        <div className="mt-6">
          {isHash ? (
            <a href={cta.to.slice(1)} className="inline-block">
              {button}
            </a>
          ) : (
            <Link to={cta.to} className="inline-block">
              {button}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
