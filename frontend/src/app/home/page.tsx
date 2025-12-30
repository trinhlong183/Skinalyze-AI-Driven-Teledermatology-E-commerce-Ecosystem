import Navbar from "../../components/navbar/Navbar";
import HeroSection from "../../components/herosection/HeroSection";
import HowItWorksSection from "@/components/howitworkssection/HowItWorksSection";
import FeaturesSection from "@/components/featuresection/FeatureSection";
import MedicalTeamSection from "@/components/medicalteam/MedicalTeamSection";
import DownloadCTASection from "@/components/download-section/DownloadCTASection";

const Home = () => {
  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <MedicalTeamSection />
      <DownloadCTASection />
    </div>
  );
};

export default Home;
