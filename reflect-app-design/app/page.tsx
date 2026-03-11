import { LpHeader } from "@/components/lp/lp-header";
import { LpHero } from "@/components/lp/lp-hero";
import { LpFeatures } from "@/components/lp/lp-features";
import { LpHowItWorks } from "@/components/lp/lp-how-it-works";
import { LpPricing } from "@/components/lp/lp-pricing";
import { LpFooter } from "@/components/lp/lp-footer";

export default function Page() {
  return (
    <main>
      <LpHeader />
      <LpHero />
      <LpFeatures />
      <LpHowItWorks />
      <LpPricing />
      <LpFooter />
    </main>
  );
}
