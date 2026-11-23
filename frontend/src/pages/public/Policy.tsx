import { Link, useParams } from "react-router-dom";
import { Icon, type IconName } from "../../components/Icon";
import { SiteFooter } from "../../components/site/SiteFooter";
import { SiteHeader } from "../../components/site/SiteHeader";

interface PolicyInfo {
  title: string;
  icon: IconName;
  covers: string;
}

const POLICIES: Record<string, PolicyInfo> = {
  "code-of-conduct": {
    title: "Code of Conduct",
    icon: "book",
    covers: "The standards every PSASA member agrees to follow when sourcing and selling for customers.",
  },
  verification: {
    title: "Verification Standard",
    icon: "shield",
    covers: "What PSASA checks before a member is verified: identity, address or business registration, banking and trading channels.",
  },
  complaints: {
    title: "Complaints and Appeals",
    icon: "flag",
    covers: "How to raise a concern about a member, how PSASA handles it, the time limits, and how to appeal a decision.",
  },
  privacy: {
    title: "Privacy and Retention",
    icon: "lock",
    covers: "What personal information PSASA collects, why, who can see it, and how long it is kept.",
  },
  "badge-rules": {
    title: "Badge Rules",
    icon: "badge",
    covers: "When and how members may use the PSASA name, certificate and badge, and what happens if they are misused.",
  },
  "order-template": {
    title: "Customer order template",
    icon: "file",
    covers: "A written order customers can use to agree items, prices, all fees and delivery with a personal shopper before paying.",
  },
};

export default function Policy() {
  const { slug = "" } = useParams<{ slug: string }>();
  const policy = POLICIES[slug];

  return (
    <div className="landing font-body">
      <SiteHeader />
      <main className="bg-soft">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 py-14 sm:py-20 lg:grid-cols-[1fr_280px]">
          {policy ? (
            <article>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-green-dark">
                <Icon name={policy.icon} size={16} /> PSASA standards
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold text-navy sm:text-5xl">{policy.title}</h1>
              <p className="mt-4 text-lg text-muted">{policy.covers}</p>
              <div className="mt-8 flex gap-3 rounded-2xl bg-[var(--amber-soft)] p-6">
                <span className="text-[#9a6700]"><Icon name="clock" /></span>
                <div>
                  <p className="font-semibold text-ink">The official text is being finalised</p>
                  <p className="mt-1 text-muted">
                    PSASA will publish the approved {policy.title.toLowerCase()} on this page. Until then, nothing else
                    should be treated as the official version.
                  </p>
                </div>
              </div>
              {slug === "complaints" && (
                <Link to="/concern" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green px-5 py-3 font-semibold text-white hover:bg-green-dark">
                  <Icon name="flag" size={16} /> Raise a concern
                </Link>
              )}
            </article>
          ) : (
            <article>
              <h1 className="font-display text-4xl font-semibold text-navy">Page not found</h1>
              <p className="mt-3 text-muted">That policy doesn't exist. Choose one from the list.</p>
            </article>
          )}

          <nav aria-label="Policies" className="self-start rounded-2xl border border-line bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Standards and policies</p>
            <ul className="mt-3 space-y-1">
              {Object.entries(POLICIES).map(([key, p]) => (
                <li key={key}>
                  <Link
                    to={`/policies/${key}`}
                    aria-current={key === slug ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${key === slug ? "bg-green-soft text-green-dark" : "text-ink hover:bg-soft"}`}
                  >
                    <Icon name={p.icon} size={16} /> {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
