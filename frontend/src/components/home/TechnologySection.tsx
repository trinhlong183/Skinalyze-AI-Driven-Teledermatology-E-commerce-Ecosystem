"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import GradientText from "@/components/ui/GradientText";
import { useTranslation } from "@/contexts/LanguageContext";

export default function TechnologySection() {
  const { t } = useTranslation();

  const features = [
    {
      title: t("technology.feature1Title"),
      desc: t("technology.feature1Desc"),
    },
    {
      title: t("technology.feature2Title"),
      desc: t("technology.feature2Desc"),
    },
    {
      title: t("technology.feature3Title"),
      desc: t("technology.feature3Desc"),
    },
  ];

  return (
    <section
      id="technology"
      className="relative z-10 py-20 md:py-32 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16 items-center">
          <div className="lg:col-span-5 order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-7xl font-black mb-6 md:mb-8 leading-tight uppercase">
                {t("technology.title1")} <br />
                <GradientText
                  text={t("technology.title2")}
                  className="text-5xl md:text-8xl"
                />
              </h2>
              <p className="text-lg md:text-xl text-gray-300 mb-8 md:mb-12 font-light leading-relaxed">
                {t("technology.description")}
              </p>

              <div className="space-y-6 md:space-y-8">
                {features.map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-6"
                  >
                    <div className="p-4 rounded-2xl glass-card border border-emerald-400/30">
                      <Activity className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-lg md:text-xl font-bold mb-1 md:mb-2 uppercase tracking-wide">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-gray-400 font-light">
                        {feature.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-7 relative h-[400px] md:h-[600px] w-full order-1 lg:order-2">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-emerald-400 rounded-3xl rotate-3 opacity-20 blur-xl" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative h-full w-full rounded-3xl overflow-hidden border border-white/10 group shadow-2xl"
            >
              <img
                src="https://images.unsplash.com/photo-1581093450021-4a7360e9a6b5?q=80&w=1000&auto=format&fit=crop"
                alt="AI Technology"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />

              <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10">
                <div className="text-5xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/0 opacity-50">
                  99.8%
                </div>
                <div className="text-lg md:text-xl font-bold tracking-widest uppercase mt-2 text-white">
                  {t("technology.accuracyLabel")}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
