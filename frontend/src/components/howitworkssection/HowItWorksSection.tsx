"use client";

import { motion } from "framer-motion";
import { useTranslation } from "@/contexts/LanguageContext";

const HowItWorksSection = () => {
  const { t } = useTranslation();

  const steps = [
    {
      step: t("howItWorks.step1Number"),
      title: t("howItWorks.step1Title"),
      description: t("howItWorks.step1Desc"),
      icon: t("howItWorks.step1Icon"),
    },
    {
      step: t("howItWorks.step2Number"),
      title: t("howItWorks.step2Title"),
      description: t("howItWorks.step2Desc"),
      icon: t("howItWorks.step2Icon"),
    },
    {
      step: t("howItWorks.step3Number"),
      title: t("howItWorks.step3Title"),
      description: t("howItWorks.step3Desc"),
      icon: t("howItWorks.step3Icon"),
    },
  ];

  return (
    <section className="relative py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-6"
          >
            <span className="inline-flex items-center px-4 py-2 rounded-full text-xs font-mono uppercase tracking-widest glass-card text-teal-300 border-teal-300/30">
              {t("howItWorks.badge")}
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight"
          >
            {t("howItWorks.title")}{" "}
            <span className="gradient-text">
              {t("howItWorks.titleHighlight")}
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto font-light"
          >
            {t("howItWorks.subtitle")}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center group"
            >
              <div className="relative mb-8">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-24 h-24 glass-card rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl border border-emerald-500/30 relative overflow-hidden"
                  data-hover="true"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20"></div>
                  <span className="relative z-10">{item.icon}</span>
                </motion.div>
                <div className="absolute -top-2 -right-2 w-12 h-12 glass-card border-2 border-emerald-400 rounded-full flex items-center justify-center">
                  <span className="font-black text-emerald-400 text-sm">
                    {item.step}
                  </span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 uppercase tracking-wide">
                {item.title}
              </h3>
              <p className="text-gray-400 leading-relaxed font-light">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
