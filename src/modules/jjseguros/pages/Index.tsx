import { Header } from "@/modules/jjseguros/components/Header";
import HeroSection from "@/modules/jjseguros/components/HeroSection";
import { InsuranceTypes } from "@/modules/jjseguros/components/InsuranceTypes";
import { TrustSection } from "@/modules/jjseguros/components/TrustSection";
import { Footer } from "@/modules/jjseguros/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="relative flex-1">
        {/* Hero Section - Curtain scroll global */}
        <section className="relative z-0 lg:sticky lg:top-0 min-h-[100svh]">
          <HeroSection />
        </section>

        {/* Insurance Types Section - Curtain effect on desktop only */}
        <section className="relative z-10 lg:sticky lg:top-0 lg:min-h-[100svh] bg-[#fcfcfc] shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5">
          <InsuranceTypes />
        </section>

        {/* Trust Section - Curtain effect on desktop only */}
        <section className="relative z-20 lg:sticky lg:top-0 lg:min-h-[100svh] bg-background shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5">
          <TrustSection />
        </section>
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;