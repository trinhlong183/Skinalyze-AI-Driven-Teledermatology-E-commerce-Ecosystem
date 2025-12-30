import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope } from "lucide-react";

interface SpecialistCardProps {
  specialist: Specialist;
  onClick: () => void;
}

interface Specialist {
  id?: string | number;
  name: string;
  image: string;
  hospital: string;
  specialty: string;
}

const SpecialistCard: React.FC<SpecialistCardProps> = ({
  specialist,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  // 2. The Fallback SVG (Centered and styled)
  const FallbackImage = (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="p-12 md:p-16 opacity-50"
    >
      <circle cx="50" cy="50" r="48" stroke="#76E0C2" strokeWidth="2" />
      <path
        d="M50 50C58.2843 50 65 43.2843 65 35C65 26.7157 58.2843 20 50 20C41.7157 20 35 26.7157 35 35C35 43.2843 41.7157 50 50 50Z"
        stroke="#76E0C2"
        strokeWidth="2"
      />
      <path
        d="M77 80H23C23 66.7452 33.7452 56 47 56H53C66.2548 56 77 66.7452 77 80Z"
        stroke="#76E0C2"
        strokeWidth="2"
      />
    </svg>
  );

  return (
    <motion.div
      className="group relative h-[400px] md:h-[500px] w-full overflow-hidden border-b md:border-r border-white/10 bg-black cursor-pointer"
      initial="rest"
      whileHover="hover"
      whileTap="hover"
      animate="rest"
      data-hover="true"
      onClick={onClick}
    >
      <div className="absolute inset-0 overflow-hidden bg-[#080C16]">
        <AnimatePresence mode="wait">
          {!imageError ? (
            <motion.img
              key="real-image"
              src={specialist.image}
              alt={specialist.name}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover grayscale will-change-transform"
              variants={{
                rest: { scale: 1, opacity: 0.6, filter: "grayscale(100%)" },
                hover: { scale: 1.05, opacity: 0.9, filter: "grayscale(0%)" },
              }}
              transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
            />
          ) : (
            <motion.div
              key="fallback-image"
              className="h-full w-full flex items-center justify-center bg-[#080C16]"
              variants={{
                rest: { scale: 1, opacity: 0.8 },
                hover: { scale: 1.05, opacity: 1 },
              }}
              transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
            >
              {FallbackImage}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
      </div>

      <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between pointer-events-none">
        <div className="flex justify-between items-start">
          <span className="text-xs font-mono border border-[#4fb7b3]/30 text-[#4fb7b3] px-3 py-1 rounded-full backdrop-blur-md bg-[#4fb7b3]/10">
            {specialist.hospital}
          </span>
          <motion.div
            variants={{
              rest: { opacity: 0, x: 20, y: -20 },
              hover: { opacity: 1, x: 0, y: 0 },
            }}
            className="bg-[#4fb7b3] text-black rounded-full p-2 will-change-transform"
          >
            <Stethoscope className="w-5 h-5" />
          </motion.div>
        </div>

        <div>
          <div className="overflow-hidden">
            <motion.h3
              className="font-heading text-2xl md:text-3xl font-bold uppercase text-white mix-blend-difference will-change-transform leading-tight"
              variants={{
                rest: { y: 0 },
                hover: { y: -5 },
              }}
              transition={{ duration: 0.4 }}
            >
              {specialist.name}
            </motion.h3>
          </div>
          <motion.p
            className="text-xs md:text-sm font-medium uppercase tracking-widest text-[#a8fbd3] mt-2 will-change-transform"
            variants={{
              rest: { opacity: 0, y: 10 },
              hover: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {specialist.specialty}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
};

export default SpecialistCard;
