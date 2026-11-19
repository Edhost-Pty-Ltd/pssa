import { Link, useLocation } from "react-router-dom";
import { SiteFooter } from "../components/site/SiteFooter";
import { SiteHeader } from "../components/site/SiteHeader";

export default function ComingSoon() {
  const { pathname } = useLocation();
  return (
    <div className="landing font-body">
      <SiteHeader />
      <main className="bg-soft">
        <div className="mx-auto max-w-2xl px-6 py-28 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-green-dark">Coming soon</p>
          <h1 className="mt-4 text-4xl font-bold text-navy sm:text-5xl">This page is being built.</h1>
          <p className="mt-4 text-lg text-muted">
            <code className="rounded bg-white px-2 py-1 text-sm">{pathname}</code> is part of the next tasks.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/" className="rounded-xl bg-navy px-6 py-3.5 font-semibold text-white hover:bg-navy-2">Back to home</Link>
            <Link to="/design" className="rounded-xl border border-line bg-white px-6 py-3.5 font-semibold text-navy hover:border-green">
              See the full Figma design
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
