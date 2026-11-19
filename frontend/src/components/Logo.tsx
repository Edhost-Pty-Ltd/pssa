import { Link } from "react-router-dom";

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
