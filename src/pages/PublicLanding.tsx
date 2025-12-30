import { PublicLayout } from "@/components/public/PublicLayout";
import { HeroSection } from "@/components/public/HeroSection";
import { WhoWeServe } from "@/components/public/WhoWeServe";
import { HowItWorks } from "@/components/public/HowItWorks";
import { EnvironmentalImpact } from "@/components/public/EnvironmentalImpact";
import { ServiceAreaPreview } from "@/components/public/ServiceAreaPreview";
import { CTASection } from "@/components/public/CTASection";
import { TireRecyclingProcess } from "@/components/public/TireRecyclingProcess";

export default function PublicLanding() {
  return (
    <PublicLayout>
      <HeroSection />
      <WhoWeServe />
      <TireRecyclingProcess />
      <EnvironmentalImpact />
      <HowItWorks />
      <ServiceAreaPreview />
      <CTASection />
    </PublicLayout>
  );
}
