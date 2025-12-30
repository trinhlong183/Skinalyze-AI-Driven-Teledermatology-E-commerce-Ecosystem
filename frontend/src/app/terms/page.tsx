"use client";

import Navbar from "@/components/navbar/Navbar";
import React from "react";
import { useTranslation } from "@/contexts/LanguageContext";

const Terms = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-32">
        <h1 className="text-4xl font-bold mb-6 gradient-text">
          {t("terms.title")}
        </h1>
        <p className="mb-6 text-gray-300">{t("terms.intro")}</p>

        <h2 className="text-2xl font-semibold mt-8 mb-3 text-emerald-400">
          {t("terms.section1Title")}
        </h2>
        <p className="mb-4 text-gray-300">{t("terms.section1Content")}</p>

        <h2 className="text-2xl font-semibold mt-8 mb-3 text-emerald-400">
          {t("terms.section2Title")}
        </h2>
        <ul className="list-disc pl-6 mb-4 text-gray-300">
          <li>{t("terms.section2Item1")}</li>
          <li>{t("terms.section2Item2")}</li>
          <li>{t("terms.section2Item3")}</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-3 text-emerald-400">
          {t("terms.section3Title")}
        </h2>
        <ul className="list-disc pl-6 mb-4 text-gray-300">
          <li>{t("terms.section3Item1")}</li>
          <li>{t("terms.section3Item2")}</li>
          <li>{t("terms.section3Item3")}</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-3 text-emerald-400">
          {t("terms.section4Title")}
        </h2>
        <p className="mb-4 text-gray-300">{t("terms.section4Content")}</p>

        <h2 className="text-2xl font-semibold mt-8 mb-3 text-emerald-400">
          {t("terms.section5Title")}
        </h2>
        <p className="mb-4 text-gray-300">{t("terms.section5Content")}</p>

        <h2 className="text-2xl font-semibold mt-8 mb-3 text-emerald-400">
          {t("terms.section6Title")}
        </h2>
        <p className="mb-4 text-gray-300">{t("terms.section6Content")}</p>

        <h2 className="text-2xl font-semibold mt-8 mb-3 text-emerald-400">
          {t("terms.section7Title")}
        </h2>
        <p className="mb-4 text-gray-300">
          {t("terms.section7Content")}{" "}
          <a
            href="mailto:support@Skinalyze.ai"
            className="text-emerald-400 underline hover:text-emerald-300 transition-colors"
          >
            support@Skinalyze.ai
          </a>
        </p>

        <div className="mt-12 text-gray-500 text-sm">
          {t("terms.lastUpdated")}
        </div>
      </main>
    </div>
  );
};

export default Terms;
