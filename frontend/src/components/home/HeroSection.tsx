"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import GradientText from "@/components/ui/GradientText";
import { useTranslation } from "@/contexts/LanguageContext";

export default function HeroSection() {
  const { t } = useTranslation();
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <header className="relative h-screen min-h-[600px] flex flex-col items-center justify-center overflow-hidden px-4">
      <motion.div
        style={{ y, opacity }}
        className="z-10 text-center flex flex-col items-center w-full max-w-6xl pb-24 md:pb-20"
      >
        {/* Main Title */}
        <div className="relative w-full flex justify-center items-center flex-col">
          <GradientText
            text={t("hero.title")}
            as="h1"
            className="text-[12vw] md:text-[10vw] leading-[0.9] font-black tracking-tighter text-center drop-shadow-[0_0_30px_rgba(52,211,153,0.5)]"
          />
          {/* Optimized Orb - moved further back */}
          <motion.div
            className="absolute -z-30 w-[35vw] h-[35vw] bg-emerald-400/10 blur-[80px] rounded-full pointer-events-none"
            animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
        </div>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }}
          className="w-full max-w-md h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent mt-8 mb-8 shadow-[0_0_15px_rgba(52,211,153,0.4)]"
        />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="text-base md:text-xl font-light max-w-xl mx-auto text-white leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
        >
          {t("hero.subtitle")} <br />
          {t("hero.subtitle2")}
        </motion.p>
      </motion.div>

      <div className="absolute bottom-0 left-0 w-full py-4 bg-white text-[#0a0e1a] z-20 overflow-hidden border-t-4 border-emerald-400">
        <motion.div
          className="flex w-fit will-change-transform"
          animate={{ x: "-50%" }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
          {[0, 1].map((key) => (
            <div key={key} className="flex whitespace-nowrap shrink-0">
              {[...Array(4)].map((_, i) => (
                <span
                  key={i}
                  className="text-2xl md:text-4xl font-black px-8 flex items-center gap-4"
                >
                  {t("hero.scrollText1")}{" "}
                  <span className="text-emerald-400 text-2xl">●</span>
                  {t("hero.scrollText2")}{" "}
                  <span className="text-emerald-400 text-2xl">●</span>
                  {t("hero.scrollText3")}{" "}
                  <span className="text-emerald-400 text-2xl">●</span>
                </span>
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    </header>
  );
}
