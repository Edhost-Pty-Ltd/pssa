import { Link } from "react-router-dom";

// Placeholder wordmark until the team decides on a logo.
// The Badge and Certificate Rules say not to invent a seal before artwork is approved,
// so this is text only. Swap this one file when the logo is ready.
export function Wordmark({ tone = "light" }: { tone?: "light" | "dark" }) {
  const main = tone === "light" ? "text-white" : "text-navy";
  const sub = tone === "light" ? "text-white/60" : "text-muted";
  return (
    <Link to="/" className="group flex flex-col leading-none" aria-label="PSSA home">
      <span className={`font-display text-[28px] font-bold tracking-tight ${main}`}>
        PSSA<span className="text-green">.</span>
      </span>
      <span className={`mt-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] ${sub}`}>
        Personal Shoppers &amp; Sourcing Association
      </span>
    </Link>
  );
}
