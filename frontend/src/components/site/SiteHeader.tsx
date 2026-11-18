import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../Icon";
import { Wordmark } from "./Wordmark";

// Public site header: a small utility bar, then the main navigation.
const NAV = [
  { label: "About", href: "/#about" },
  { label: "Membership", href: "/#membership" },
  { label: "Member register", href: "/#register" },
  { label: "Buy safely", href: "/#buy-safely" },
  { label: "Standards", href: "/#standards" },
  { label: "Raise a concern", href: "/concern" },
];

export function SiteHeader({ transparent = false }: { transparent?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className={
        transparent
          ? "absolute inset-x-0 top-0 z-40 bg-transparent text-white"
          : "sticky top-0 z-40 border-b border-white/15 bg-navy/75 text-white backdrop-blur-md shadow-[0_8px_30px_rgb(11_32_55/0.22)]"
      }
    >
      {/* Utility bar */}
      <div className={transparent ? "hidden border-b border-white/15 md:block" : "hidden border-b border-white/10 md:block"}>
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-6 py-2 text-[13px]">
          <a href="/#register" className="mr-auto flex items-center gap-2 text-white/70 hover:text-white">
            <Icon name="search" size={15} /> Verify a member
          </a>
          <Link to="/login" className="rounded-md border border-white/30 px-3 py-1.5 font-semibold hover:bg-white/10">
            Member login
          </Link>
          <Link to="/apply" className="rounded-md bg-green px-3 py-1.5 font-semibold text-white hover:bg-green-dark">
            Apply to join
          </Link>
        </div>
      </div>

      {/* Main navigation */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <Wordmark />
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-7 text-[13px] font-semibold uppercase tracking-[0.12em]">
            {NAV.map((item) => (
              <li key={item.label}>
                <a href={item.href} className="text-white/80 transition hover:text-green">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <button
          className="rounded-md p-2 hover:bg-white/10 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? "close" : "menu"} size={24} />
        </button>
      </div>

      {/* Mobile navigation */}
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-white/10 lg:hidden">
          <ul className="mx-auto max-w-7xl px-6 py-3">
            {NAV.map((item) => (
              <li key={item.label}>
                <a href={item.href} onClick={() => setOpen(false)} className="block py-3 font-semibold text-white/85">
                  {item.label}
                </a>
              </li>
            ))}
            <li className="flex gap-3 py-3">
              <Link to="/login" className="flex-1 rounded-md border border-white/30 px-3 py-2.5 text-center font-semibold">
                Member login
              </Link>
              <Link to="/apply" className="flex-1 rounded-md bg-green px-3 py-2.5 text-center font-semibold">
                Apply to join
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
