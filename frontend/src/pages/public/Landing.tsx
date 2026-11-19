import { SiteFooter } from "../../components/site/SiteFooter";
import { SiteHeader } from "../../components/site/SiteHeader";
import { Audiences } from "./landing/Audiences";
import { CheckBeforeYouPay } from "./landing/CheckBeforeYouPay";
import { Complaints } from "./landing/Complaints";
import { Faq } from "./landing/Faq";
import { FinalCta } from "./landing/FinalCta";
import { Gates } from "./landing/Gates";
import { Hero } from "./landing/Hero";
import { LiveStatus } from "./landing/LiveStatus";
import { ProfileAnatomy } from "./landing/ProfileAnatomy";
import { Standards } from "./landing/Standards";
import { TrustGap } from "./landing/TrustGap";
import { useSmoothScroll } from "./landing/motion";
import { VerificationPipeline } from "./landing/VerificationPipeline";
import { WhatIsShopper } from "./landing/WhatIsShopper";

export default function Landing() {
  useSmoothScroll();

  return (
    <div className="landing font-body text-ink">
      <SiteHeader transparent />
      <main>
        <Hero />
        <WhatIsShopper />
        <TrustGap />
        <VerificationPipeline />
        <ProfileAnatomy />
        <CheckBeforeYouPay />
        <LiveStatus />
        <Audiences />
        <Gates />
        <Complaints />
        <Standards />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
