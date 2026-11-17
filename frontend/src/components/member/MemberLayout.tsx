import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import { Icon, type IconName } from "../Icon";
import { Logo } from "../Logo";
import "./member.css";

// The member portal shell from the Figma design: navy sidebar, top bar, page content.
const NAV: { to: string; icon: IconName; label: string; end?: boolean }[] = [
  { to: "/member", icon: "home", label: "Overview", end: true },
  { to: "/member/profile", icon: "user", label: "Profile" },
  { to: "/member/verification", icon: "shield", label: "Verification" },
  { to: "/member/tutorials", icon: "play", label: "Tutorials" },
  { to: "/member/assessment", icon: "book", label: "Assessment" },
  { to: "/member/certificate", icon: "badge", label: "Certificate & badge" },
];

function initials(first: string | null, last: string | null, email: string) {
  const fromName = `${first?.[0] ?? ""}${last?.[0] ?? ""}`.trim();
  return (fromName || email[0] || "?").toUpperCase();
}

export function MemberLayout() {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null; // RequireMember already handles this case.
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");

  async function handleSignOut() {
    setSigningOut(true);
    await signOut(); // RequireMember then shows sign-in with "You're signed out."
  }

  return (
    <div className="workspace">
      <aside id="member-menu" className={`workspace-sidebar ${menuOpen ? "open" : ""}`} aria-label="Member portal">
        <Logo />
        <div className="workspace-label">Member portal</div>
        <nav>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)}>
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/">
            <Icon name="arrow" /> View public site
          </Link>
          <button className="sign-out" onClick={() => void handleSignOut()} disabled={signingOut}>
            <Icon name="lock" /> {signingOut ? "Signing out…" : "Sign out"}
          </button>
          <div className="user-chip">
            <span aria-hidden="true">{initials(user.firstName, user.lastName, user.email)}</span>
            <div>
              <b>{name || user.email}</b>
              <small>{name ? user.email : "Member portal"}</small>
            </div>
          </div>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-top">
          <button
            className="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="member-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
          <div>
            <span className="mobile-logo">PSSA</span>
          </div>
          <div className="top-actions">
            <span className="top-avatar" title={user.email} aria-hidden="true">
              {initials(user.firstName, user.lastName, user.email)}
            </span>
          </div>
        </header>
        <main className="workspace-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
