import { SiteFooter } from "../../components/site/SiteFooter";
import { SiteHeader } from "../../components/site/SiteHeader";
import { RegisterSection } from "./landing/RegisterSection";

export default function Register() {
  return (
    <div className="landing flex min-h-screen flex-col font-body text-ink">
      <SiteHeader />
      <main className="flex-1 bg-noir-2">
        <RegisterSection />
      </main>
      <SiteFooter />
    </div>
  );
}
