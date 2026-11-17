import { Link } from "react-router-dom";
import { Wordmark } from "./Wordmark";

// Public site footer.
const COLUMNS = [
  {
    title: "Association",
    links: [
      { label: "About PSSA", href: "/#about" },
      { label: "How membership works", href: "/#membership" },
      { label: "Apply to join", href: "/apply" },
      { label: "Member login", href: "/login" },
    ],
  },
  {
    title: "Customers",
    links: [
      { label: "Verify a member", href: "/#register" },
      { label: "Buy safely", href: "/#buy-safely" },
      { label: "Customer order template", href: "/policies/order-template" },
      { label: "Raise a concern", href: "/concern" },
    ],
  },
  {
    title: "Standards",
    links: [
      { label: "Code of Conduct", href: "/policies/code-of-conduct" },
      { label: "Verification Standard", href: "/policies/verification" },
      { label: "Complaints and Appeals", href: "/policies/complaints" },
      { label: "Privacy and Retention", href: "/policies/privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Wordmark />
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-white/65">
            A voluntary membership association for personal shoppers and sourcing traders. Membership does not make
            PSSA the seller or guarantee a transaction.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="font-display text-lg font-semibold text-white">{column.title}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {column.links.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith("/#") ? (
                    <a href={link.href} className="text-white/65 hover:text-green">{link.label}</a>
                  ) : (
                    <Link to={link.href} className="text-white/65 hover:text-green">{link.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6 text-xs text-white/50 md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} Personal Shoppers and Sourcing Association</p>
          <p>Policies are drafts pending board approval. PSSA is not a government body.</p>
        </div>
      </div>
    </footer>
  );
}
