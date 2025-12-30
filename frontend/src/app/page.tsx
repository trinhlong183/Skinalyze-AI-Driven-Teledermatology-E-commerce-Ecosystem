"use client";

import Navbar from "@/components/navbar/Navbar";
import HeroSection from "@/components/home/HeroSection";
import TechnologySection from "@/components/home/TechnologySection";
import HowItWorksSection from "@/components/howitworkssection/HowItWorksSection";
import FeaturesSection from "@/components/featuresection/FeatureSection";
import MedicalTeamSection from "@/components/medicalteam/MedicalTeamSection";
import DownloadCTASection from "@/components/download-section/DownloadCTASection";
import Footer from "@/components/home/Footer";
import CosmicBackground from "@/components/shared/CosmicBackground";
import CustomCursor from "@/components/ui/CustomCursor";

export default function Home() {
  return (
    <div className="relative min-h-screen text-white selection:bg-emerald-400 selection:text-black overflow-x-hidden bg-[#0a0e1a]" style={{cursor: 'none'}}>
      <CustomCursor />
      <div className="fixed inset-0 z-0">
        <CosmicBackground />
      </div>

      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <HowItWorksSection />
        <TechnologySection />
        <FeaturesSection />
        <MedicalTeamSection />
        <DownloadCTASection />
        <Footer />
      </div>
    </div>
  );
}
