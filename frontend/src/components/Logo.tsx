import { Link } from "react-router-dom";

// Placeholder logo for the member portal, using the design's .logo styles.
// Text only until the team decides on a logo (the Badge Rules say not to invent a seal).
export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="logo" aria-label="PSSA home">
      <span>
        <b>PSSA</b>
        <small>Personal Shoppers &amp; Sourcing Association</small>
      </span>
    </Link>
  );
}
