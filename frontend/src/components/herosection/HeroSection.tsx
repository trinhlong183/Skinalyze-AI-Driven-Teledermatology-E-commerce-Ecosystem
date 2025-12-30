"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import GradientText from "../ui/GradientText";

const HeroSection = () => {
  const [selectedRisk, setSelectedRisk] = useState<"medium" | "high">("medium");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const riskLevels = {
    medium: {
      name: "Medium Risk",
      title: "Skin, nail, hair mycoses",
      description:
        "Fungal skin diseases can significantly reduce quality of life and be contagious to others, treatment is needed",
      color: "yellow",
      bgImage:
        "https://skinive.com/wp-content/uploads/2023/09/Group-2609542.webp",
      textColor: "text-yellow-600",
      svgColor: "text-yellow-500",
      strokeColor: "text-yellow-300",
      strokeColor2: "text-yellow-400",
    },
    high: {
      name: "High Risk",
      title: "HPV & Herpes",
      description:
        "Skin herpes is a dangerous viral infection, which may lead to severe complications if not treated early",
      color: "red",
      bgImage:
        "https://skinive.com/wp-content/uploads/2023/09/Group-2609541.webp",
      textColor: "text-red-600",
      svgColor: "text-red-500",
      strokeColor: "text-red-300",
      strokeColor2: "text-red-400",
    },
  };

  const riskKeys = Object.keys(riskLevels);
  const currentIndex = riskKeys.indexOf(selectedRisk);

  const switchRisk = (newRisk: "medium" | "high") => {
    if (newRisk !== selectedRisk) {
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedRisk(newRisk);
        setTimeout(() => setIsTransitioning(false), 150);
      }, 150);
    }
  };

  const goToPrevious = () => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : riskKeys.length - 1;
    switchRisk(riskKeys[prevIndex] as "medium" | "high");
  };

  const goToNext = () => {
    const nextIndex = currentIndex < riskKeys.length - 1 ? currentIndex + 1 : 0;
    switchRisk(riskKeys[nextIndex] as "medium" | "high");
  };

  return (
    <section className="relative py-20 overflow-hidden pt-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            className="text-center lg:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-xs font-mono uppercase tracking-widest glass-card text-emerald-300 border-emerald-300/30">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                AI Medical Technology
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-8 tracking-tight">
              SMART <GradientText text="SKIN" />
              <br />
              <span className="text-white/90">DIAGNOSIS</span>
              <br />
              <span className="text-2xl md:text-3xl font-normal text-white/60">
                with AI
              </span>
            </h1>

            <p className="text-xl text-gray-300 mb-10 leading-relaxed max-w-2xl font-light">
              Detect skin issues quickly and accurately with artificial
              intelligence technology developed by leading medical experts.
            </p>

            {/* Key Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <motion.div
                className="flex items-center p-4 glass-card rounded-xl glass-card-hover"
                whileHover={{ scale: 1.02 }}
                data-hover="true"
              >
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mr-3 border border-emerald-500/30">
                  <svg
                    className="w-5 h-5 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-white">85% Accuracy</div>
                  <div className="text-xs text-gray-400 font-mono uppercase tracking-wider">
                    High Reliability
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="flex items-center p-4 glass-card rounded-xl glass-card-hover"
                whileHover={{ scale: 1.02 }}
                data-hover="true"
              >
                <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center mr-3 border border-teal-500/30">
                  <svg
                    className="w-5 h-5 text-teal-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-white">Instant</div>
                  <div className="text-xs text-gray-400 font-mono uppercase tracking-wider">
                    Immediate Results
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="flex items-center p-4 glass-card rounded-xl glass-card-hover"
                whileHover={{ scale: 1.02 }}
                data-hover="true"
              >
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center mr-3 border border-cyan-500/30">
                  <svg
                    className="w-5 h-5 text-cyan-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-white">Secure</div>
                  <div className="text-xs text-gray-400 font-mono uppercase tracking-wider">
                    Data Protection
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                className="flex items-center justify-center glass-card px-6 py-4 rounded-xl glass-card-hover font-medium text-white glow-emerald"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-hover="true"
              >
                <svg
                  className="w-6 h-6 mr-3"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="text-left">
                  <div className="text-xs opacity-60 font-mono">
                    Download on
                  </div>
                  <div className="font-bold">App Store</div>
                </div>
              </motion.button>

              <motion.button
                className="flex items-center justify-center glass-card px-6 py-4 rounded-xl glass-card-hover font-medium text-white glow-teal"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-hover="true"
              >
                <svg
                  className="w-6 h-6 mr-3"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                </svg>
                <div className="text-left">
                  <div className="text-xs opacity-60 font-mono">
                    Download on
                  </div>
                  <div className="font-bold">Google Play</div>
                </div>
              </motion.button>
            </div>
          </motion.div>

          {/* Right Content - SVG Graphic with Arrow Navigation */}
          <div className="relative flex justify-center">
            <div className="relative">
              <div
                className={`transition-all duration-300 ${
                  isTransitioning
                    ? "scale-95 opacity-70"
                    : "scale-100 opacity-100"
                }`}
              >
                <svg
                  width="600"
                  height="600"
                  viewBox="0 0 556 556"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="animate-pulse relative z-10 transition-all duration-300"
                >
                  <path
                    fillOpacity="0"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`${riskLevels[selectedRisk].strokeColor} transition-colors duration-300`}
                    d="M517 278C517 409.996 409.996 517 278 517C146.004 517 39 409.996 39 278C39 146.004 146.004 39 278 39C409.996 39 517 146.004 517 278ZM79.63 278C79.63 387.557 168.443 476.37 278 476.37C387.557 476.37 476.37 387.557 476.37 278C476.37 168.443 387.557 79.63 278 79.63C168.443 79.63 79.63 168.443 79.63 278Z"
                  />
                  <path
                    fillOpacity="0"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`${riskLevels[selectedRisk].strokeColor2} transition-colors duration-300`}
                    d="M556 278C556 431.535 431.535 556 278 556C124.465 556 0 431.535 0 278C0 124.465 124.465 0 278 0C431.535 0 556 124.465 556 278ZM22.2574 278C22.2574 419.243 136.757 533.743 278 533.743C419.243 533.743 533.743 419.243 533.743 278C533.743 136.757 419.243 22.2574 278 22.2574C136.757 22.2574 22.2574 136.757 22.2574 278Z"
                  />
                  <circle
                    cx="278"
                    cy="278"
                    r="183"
                    fill="currentColor"
                    className={`${riskLevels[selectedRisk].svgColor} transition-colors duration-300`}
                  />

                  {/* Scanning animation dots */}
                  <circle
                    cx="278"
                    cy="95"
                    r="6"
                    fill="white"
                    className="animate-ping"
                  />
                  <circle
                    cx="461"
                    cy="278"
                    r="6"
                    fill="white"
                    className="animate-ping"
                    style={{ animationDelay: "0.5s" }}
                  />
                  <circle
                    cx="278"
                    cy="461"
                    r="6"
                    fill="white"
                    className="animate-ping"
                    style={{ animationDelay: "1s" }}
                  />
                  <circle
                    cx="95"
                    cy="278"
                    r="6"
                    fill="white"
                    className="animate-ping"
                    style={{ animationDelay: "1.5s" }}
                  />
                </svg>

                {/* Overlaid Phone Image */}
                {riskLevels[selectedRisk].bgImage && (
                  <div className="absolute inset-0 flex items-center justify-center z-15">
                    <img
                      src={riskLevels[selectedRisk].bgImage}
                      alt={riskLevels[selectedRisk].name}
                      className={`w-auto h-auto mt-35 object-contain transition-all duration-500 ${
                        isTransitioning
                          ? "opacity-0 scale-110 rotate-3"
                          : "opacity-90 scale-100 rotate-0"
                      }`}
                      style={{
                        filter: isTransitioning ? "blur(4px)" : "blur(0px)",
                      }}
                    />
                  </div>
                )}

                {/* Description Card */}
                <div
                  className={`absolute top-[69%] left-[5%] z-30 w-64 bg-white/90 backdrop-blur-md text-gray-900 rounded-2xl p-4 border border-white/50 shadow-2xl transition-all duration-300 ${
                    isTransitioning
                      ? "opacity-0 scale-90"
                      : "opacity-100 scale-100"
                  }`}
                >
                  <h3 className="text-base font-bold mb-2 text-gray-900">
                    {riskLevels[selectedRisk].title}
                  </h3>

                  <div
                    className={`flex items-center mb-3 px-2 py-1 rounded-full ${
                      riskLevels[selectedRisk].color === "red"
                        ? "bg-red-600"
                        : "bg-yellow-600"
                    }`}
                  >
                    <svg
                      width="10"
                      height="8"
                      viewBox="0 0 14 12"
                      fill="none"
                      className="mr-1"
                    >
                      <path
                        d="M13.1592 8.50836L8.685 1.08836C8.50408 0.805334 8.25482 0.572414 7.96019 0.411072C7.66557 0.249731 7.33507 0.165161 6.99916 0.165161C6.66326 0.165161 6.33275 0.249731 6.03813 0.411072C5.74351 0.572414 5.49425 0.805334 5.31333 1.08836L0.839163 8.50836C0.681111 8.77182 0.595207 9.07226 0.590087 9.37945C0.584967 9.68664 0.660812 9.98977 0.809997 10.2584C0.982476 10.5607 1.23213 10.8118 1.53345 10.986C1.83476 11.1602 2.17694 11.2514 2.525 11.25H11.4733C11.8191 11.2537 12.1597 11.1661 12.4608 10.9961C12.762 10.8261 13.0129 10.5797 13.1883 10.2817C13.3419 10.0103 13.4202 9.70283 13.415 9.39106C13.4099 9.07928 13.3216 8.77454 13.1592 8.50836ZM6.99916 8.91669C6.88379 8.91669 6.77101 8.88248 6.67508 8.81838C6.57915 8.75428 6.50438 8.66318 6.46023 8.55659C6.41608 8.45 6.40453 8.33271 6.42704 8.21955C6.44955 8.1064 6.5051 8.00246 6.58668 7.92088C6.66826 7.8393 6.7722 7.78374 6.88536 7.76123C6.99852 7.73873 7.11581 7.75028 7.2224 7.79443C7.32899 7.83858 7.42009 7.91335 7.48419 8.00927C7.54828 8.1052 7.5825 8.21799 7.5825 8.33336C7.5825 8.48807 7.52104 8.63644 7.41164 8.74584C7.30225 8.85523 7.15387 8.91669 6.99916 8.91669ZM7.5825 6.58336C7.5825 6.73807 7.52104 6.88644 7.41164 6.99584C7.30225 7.10523 7.15387 7.16669 6.99916 7.16669C6.84445 7.16669 6.69608 7.10523 6.58668 6.99584C6.47729 6.88644 6.41583 6.73807 6.41583 6.58336V4.25002C6.41583 4.09532 6.47729 3.94694 6.58668 3.83755C6.69608 3.72815 6.84445 3.66669 6.99916 3.66669C7.15387 3.66669 7.30225 3.72815 7.41164 3.83755C7.52104 3.94694 7.5825 4.09532 7.5825 4.25002V6.58336Z"
                        fill="white"
                      />
                    </svg>
                    <p className="text-xs font-semibold text-white">
                      {riskLevels[selectedRisk].name}
                    </p>
                  </div>

                  <p className="text-gray-700 leading-relaxed text-xs mb-3">
                    {riskLevels[selectedRisk].description}
                  </p>

                  <div className="flex justify-between items-center">
                    <button
                      onClick={goToPrevious}
                      disabled={isTransitioning}
                      className="w-6 h-6 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors duration-200 shadow-md"
                    >
                      <svg
                        width="6"
                        height="12"
                        viewBox="0 0 10 19"
                        fill="none"
                      >
                        <path
                          d="M8.5 1.5L1 9.625L8.5 17.75"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={goToNext}
                      disabled={isTransitioning}
                      className="w-6 h-6 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors duration-200 shadow-md"
                    >
                      <svg
                        width="6"
                        height="12"
                        viewBox="0 0 10 19"
                        fill="none"
                      >
                        <path
                          d="M1.5 1.5L9 9.625L1.5 17.75"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
