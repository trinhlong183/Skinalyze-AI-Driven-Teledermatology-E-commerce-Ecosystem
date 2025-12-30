"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

const DownloadCTASection = () => {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const stats = [
    { number: t("download.stat1"), label: t("download.stat1Label") },
    { number: t("download.stat2"), label: t("download.stat2Label") },
    { number: t("download.stat3"), label: t("download.stat3Label") },
    { number: t("download.stat4"), label: t("download.stat4Label") },
  ];

  const handleDownload = () => {
    setDownloading(true);
    const downloadUrl = "http://download-app.nhatlonh.id.vn:6767/skinalyze.apk";
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "Skinalyze.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
      setDownloaded(true);
    }, 2000);
  };

  return (
    <section id="download" className="relative py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6"
        >
          <span className="inline-flex items-center px-4 py-2 rounded-full text-xs font-mono uppercase tracking-widest glass-card text-emerald-300 border-emerald-300/30">
            <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
            {t("download.badge")}
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-7xl font-black text-white mb-6 uppercase tracking-tight"
        >
          {t("download.title")}{" "}
          <span className="gradient-text">{t("download.titleHighlight")}</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light"
        >
          {t("download.subtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-6 justify-center mb-16"
        >
          <motion.button
            onClick={handleDownload}
            disabled={downloading || downloaded}
            whileHover={!downloading && !downloaded ? { scale: 1.05 } : {}}
            whileTap={!downloading && !downloaded ? { scale: 0.95 } : {}}
            className={`flex items-center justify-center glass-card px-8 py-4 rounded-xl transition-all font-bold uppercase tracking-widest text-sm group overflow-hidden relative ${
              downloaded
                ? "bg-emerald-400/20 border-emerald-400 text-emerald-300 cursor-default"
                : downloading
                ? "bg-white/10 text-white cursor-wait"
                : "text-white border-white/20 hover:border-emerald-400/50 glow-emerald"
            }`}
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
              <div className="text-xs opacity-60 font-sans">
                {downloading
                  ? t("download.downloading")
                  : downloaded
                  ? t("download.downloaded")
                  : t("download.downloadFor")}
              </div>
              <div className="text-lg font-bold">{t("download.android")}</div>
            </div>
            {downloaded && <Check className="w-5 h-5 ml-3 text-emerald-300" />}
          </motion.button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="text-center group"
            >
              <div className="text-4xl md:text-5xl font-black gradient-text mb-2">
                {stat.number}
              </div>
              <div className="text-gray-400 text-sm font-mono uppercase tracking-widest">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DownloadCTASection;
