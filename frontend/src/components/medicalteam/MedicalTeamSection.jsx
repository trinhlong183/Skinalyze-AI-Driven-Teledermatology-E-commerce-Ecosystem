"use client";

import React, { useEffect } from "react"; // Import thêm useEffect
import { motion, AnimatePresence } from "framer-motion";
import SpecialistCard from "../SpecialistCard/SpecialistCard";
import { X, ChevronLeft, ChevronRight, Building2, Play } from "lucide-react";

const MedicalTeamSection = () => {
  const [selectedSpecialist, setSelectedSpecialist] = React.useState(null);
  const [imageError, setImageError] = React.useState(false);

  useEffect(() => {
    if (selectedSpecialist) {
      setImageError(false);
    }
  }, [selectedSpecialist]);

  const errorImage = (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="p-12 bg-[#080C16]"
    >
      <circle cx="50" cy="50" r="48" stroke="#76E0C2" strokeWidth="4" />
      <path
        d="M50 50C58.2843 50 65 43.2843 65 35C65 26.7157 58.2843 20 50 20C41.7157 20 35 26.7157 35 35C35 43.2843 41.7157 50 50 50Z"
        stroke="#76E0C2"
        strokeWidth="4"
      />
      <path
        d="M77 80H23C23 66.7452 33.7452 56 47 56H53C66.2548 56 77 66.7452 77 80Z"
        stroke="#76E0C2"
        strokeWidth="4"
      />
    </svg>
  );

  const SPECIALISTS = [
    {
      id: 1,
      name: "Dr. Minh Trí",
      title: "Dermatologist & AI Specialist",
      specialty: "Dermatologist & AI Specialist",
      experience: "15+ years experience",
      description:
        "Leading expert in diagnosing and treating skin diseases. Pioneer in applying AI to dermatology medicine in Vietnam.",
      specialties: ["AI Diagnosis", "General Dermatology", "AI Research"],
      image: "/DoctorMinhTri.png",
      hospital: "Hospital Hoan Thien",
      color: "emerald",
    },
    {
      id: 2,
      name: "Dr. Tinh",
      title: "Dermatologist & Machine Learning",
      specialty: "Dermatologist & Machine Learning",
      experience: "12+ years experience",
      description:
        "Expert in dermatology and cosmetic skin, with deep experience in applying AI technology to diagnosis and skin care consultation.",
      specialties: ["Cosmetic Derm", "Skin Care", "AI Consulting"],
      image: "/DoctorTinh.png", // Giả sử ảnh này lỗi, nó sẽ hiện SVG
      hospital: "Medical Center Excellence",
      color: "teal",
    },
  ];

  const navigateSpecialist = (direction) => {
    const currentIndex = SPECIALISTS.findIndex(
      (s) => s.id === selectedSpecialist.id
    );
    const newIndex =
      direction === "next"
        ? (currentIndex + 1) % SPECIALISTS.length
        : (currentIndex - 1 + SPECIALISTS.length) % SPECIALISTS.length;
    setSelectedSpecialist(SPECIALISTS[newIndex]);
  };

  return (
    <section
      id="specialists"
      className="relative z-10 py-20 md:py-32 overflow-hidden"
    >
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 md:mb-16 px-4">
          <h2 className="text-5xl md:text-8xl font-heading font-bold uppercase leading-[0.9] drop-shadow-lg break-words w-full md:w-auto">
            Medical <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a8fbd3] to-[#4fb7b3]">
              Board
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-l border-white/10 bg-transparent">
          {SPECIALISTS.map((specialist) => (
            <SpecialistCard
              key={specialist.id}
              specialist={specialist}
              onClick={() => setSelectedSpecialist(specialist)}
            />
          ))}
        </div>
      </div>

      {/* Specialist Detail Modal */}
      <AnimatePresence>
        {selectedSpecialist && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedSpecialist(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md cursor-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl bg-[#1a1b3b] border border-white/10 overflow-hidden flex flex-col md:flex-row shadow-2xl shadow-[#4fb7b3]/10"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedSpecialist(null)}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-white hover:text-black transition-colors"
                data-hover="true"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Navigation Buttons */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateSpecialist("prev");
                }}
                className="absolute left-4 bottom-4 translate-y-0 md:top-1/2 md:bottom-auto md:-translate-y-1/2 z-20 p-3 rounded-full bg-black/50 text-white hover:bg-white hover:text-black transition-colors border border-white/10 backdrop-blur-sm"
                data-hover="true"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateSpecialist("next");
                }}
                className="absolute right-4 bottom-4 translate-y-0 md:top-1/2 md:bottom-auto md:-translate-y-1/2 z-20 p-3 rounded-full bg-black/50 text-white hover:bg-white hover:text-black transition-colors border border-white/10 backdrop-blur-sm md:right-8"
                data-hover="true"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Image Side */}
              <div className="w-full md:w-1/2 h-64 md:h-auto relative overflow-hidden flex items-center justify-center bg-[#080C16]">
                <AnimatePresence mode="wait">
                  {!imageError ? (
                    <motion.img
                      key={selectedSpecialist.id}
                      src={selectedSpecialist.image}
                      alt={selectedSpecialist.name}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      // SỬ DỤNG onError ĐỂ SET STATE
                      onError={() => setImageError(true)}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    // RENDER SVG TRỰC TIẾP KHI CÓ LỖI
                    <motion.div
                      key="error-svg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-full h-full flex items-center justify-center"
                    >
                      {errorImage}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1b3b] via-transparent to-transparent md:bg-gradient-to-r pointer-events-none" />
              </div>

              {/* Content Side */}
              <div className="w-full md:w-1/2 p-8 pb-24 md:p-12 flex flex-col justify-center relative">
                <motion.div
                  key={selectedSpecialist.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <div className="flex items-center gap-3 text-[#4fb7b3] mb-4">
                    <Building2 className="w-4 h-4" />
                    <span className="font-mono text-sm tracking-widest uppercase">
                      {selectedSpecialist.hospital}
                    </span>
                  </div>

                  <h3 className="text-3xl md:text-5xl font-heading font-bold uppercase leading-none mb-2 text-white">
                    {selectedSpecialist.name}
                  </h3>

                  <p className="text-lg text-[#a8fbd3] font-medium tracking-widest uppercase mb-6">
                    {selectedSpecialist.specialty}
                  </p>

                  <div className="h-px w-20 bg-white/20 mb-6" />

                  <p className="text-gray-300 leading-relaxed text-lg font-light mb-8">
                    {selectedSpecialist.description}
                  </p>

                  <button
                    className="flex items-center gap-3 bg-[#4fb7b3] text-black px-6 py-3 font-bold uppercase tracking-widest text-sm hover:bg-white transition-colors w-fit"
                    data-hover="true"
                  >
                    Book Consultation <Play className="w-4 h-4" />
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default MedicalTeamSection;
