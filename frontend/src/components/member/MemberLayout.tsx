import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import { useSmoothScroll } from "../../pages/public/landing/motion";
import { GrainOverlay } from "../../pages/public/landing/ui";
import { Icon, type IconName } from "../Icon";
import { SiteFooter } from "../site/SiteFooter";
import { Wordmark } from "../site/Wordmark";
import "./member.css";

const NAV: { to: string; icon: IconName; label: string; end?: boolean }[] = [
  { to: "/member", icon: "home", label: "Application", end: true },
  { to: "/member/profile", icon: "user", label: "Profile" },
  { to: "/member/verification", icon: "shield", label: "Documents" },
  { to: "/member/tutorials", icon: "play", label: "Tutorials" },
  { to: "/member/assessment", icon: "book", label: "Assessment" },
  { to: "/member/certificate", icon: "badge", label: "Certificate" },
  { to: "/member/renewal", icon: "calendar", label: "Renewal" },
  { to: "/member/complaints", icon: "flag", label: "Concerns" },
];

function initials(first: string | null, last: string | null, email: string) {
  const fromName = `${first?.[0] ?? ""}${last?.[0] ?? ""}`.trim();
  return (fromName || email[0] || "?").toUpperCase();
}

export function MemberLayout() {
  useSmoothScroll();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const isApproved = Boolean(user.memberProfile?.memberStatus);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  return (
    <div className="landing relative flex min-h-screen flex-col overflow-x-clip bg-navy font-body text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <img
          src="/images/landing/hero-city.jpg"
          alt=""
          className="h-full w-full scale-105 object-cover opacity-20 blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/90 via-navy/85 to-navy-2/95" />
        <div
          className="absolute -top-40 right-[-10%] h-[540px] w-[540px] rounded-full opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(circle, #18a269 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-15%] left-[-8%] h-[520px] w-[520px] rounded-full opacity-20 blur-[120px]"
          style={{ background: "radial-gradient(circle, #efe6d4 0%, transparent 70%)" }}
        />
        <GrainOverlay />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy/65 text-white backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Wordmark />

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/80 transition hover:border-green/50 hover:text-white"
            >
              Public site <Icon name="arrow" size={13} />
            </Link>
            <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-white/10 py-1 pl-1.5 pr-3.5 backdrop-blur-md">
              <span
                aria-hidden="true"
                className="flex size-7 items-center justify-center rounded-full bg-green text-xs font-bold text-white"
              >
                {initials(user.firstName, user.lastName, user.email)}
              </span>
              <span className="max-w-[160px] truncate text-xs font-semibold text-white">
                {name || user.email}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/10 disabled:opacity-50"
            >
              <Icon name="lock" size={13} /> {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>

          <button
            type="button"
            className="rounded-xl border border-white/15 p-2 text-white hover:bg-white/10 md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="member-mobile-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name={menuOpen ? "close" : "menu"} size={22} />
          </button>
        </div>

        {isApproved ? (
          <nav aria-label="Member account navigation" className="border-t border-white/10 bg-white/[0.03]">
            <div className="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto px-6 py-2.5">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? "bg-green text-white shadow-[0_8px_24px_-6px_rgba(24,162,105,0.75)]"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icon name={item.icon} size={14} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        ) : (
          <div className="border-t border-white/10 bg-white/[0.03]">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2 text-xs text-white/70">
              <span className="inline-flex items-center gap-2 font-semibold text-white">
                <span className="size-2 rounded-full bg-green" />
                Application Portal
              </span>
              <span>Complete your application to unlock your member account</span>
            </div>
          </div>
        )}

        {menuOpen && (
          <div id="member-mobile-nav" className="border-t border-white/10 bg-navy/95 px-6 py-4 backdrop-blur-xl md:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{name || user.email}</p>
                {name && <p className="truncate text-xs text-white/60">{user.email}</p>}
              </div>
              <div className="flex gap-2">
                <Link
                  to="/"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/85"
                >
                  Public site
                </Link>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 flex-1">
        <div className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
          <Outlet />
        </div>
      </main>

      <div className="relative z-10 border-t border-white/10">
        <SiteFooter />
      </div>
    </div>
  );
}
