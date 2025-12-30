"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/contexts/LanguageContext";

const FeaturesSection = () => {
  const { t } = useTranslation();

  const keyFeatures = [
    {
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      title: t("features.keyFeature1Title"),
      description: t("features.keyFeature1Desc"),
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      ),
      title: t("features.keyFeature2Title"),
      description: t("features.keyFeature2Desc"),
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
      title: t("features.keyFeature3Title"),
      description: t("features.keyFeature3Desc"),
      gradient: "from-purple-500 to-pink-500",
    },
  ];

  const features = [
    {
      icon: "🎯",
      title: t("features.feature1Title"),
      description: t("features.feature1Desc"),
      color: "bg-blue-50 text-blue-600 border-blue-200",
    },
    {
      icon: "⚡",
      title: t("features.feature2Title"),
      description: t("features.feature2Desc"),
      color: "bg-green-50 text-green-600 border-green-200",
    },
    {
      icon: "📊",
      title: t("features.feature3Title"),
      description: t("features.feature3Desc"),
      color: "bg-purple-50 text-purple-600 border-purple-200",
    },
    {
      icon: "🔒",
      title: t("features.feature4Title"),
      description: t("features.feature4Desc"),
      color: "bg-red-50 text-red-600 border-red-200",
    },
    {
      icon: "💡",
      title: t("features.feature5Title"),
      description: t("features.feature5Desc"),
      color: "bg-yellow-50 text-yellow-600 border-yellow-200",
    },
    {
      icon: "👨‍⚕️",
      title: t("features.feature6Title"),
      description: t("features.feature6Desc"),
      color: "bg-indigo-50 text-indigo-600 border-indigo-200",
    },
  ];

  return (
    <section id="features" className="relative py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Main Features Hero */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center px-4 py-2 glass-card text-emerald-300 rounded-full text-xs font-mono uppercase tracking-widest mb-6 border border-emerald-300/30"
          >
            <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
            {t("features.badge")}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tight uppercase"
          >
            {t("features.title")}{" "}
            <span className="gradient-text">
              {t("features.titleHighlight")}
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed font-light"
          >
            {t("features.subtitle")}
          </motion.p>
        </div>

        {/* Key Features Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {keyFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative"
              data-hover="true"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-3xl blur-xl opacity-10 group-hover:opacity-20 transition-opacity duration-500"></div>
              <motion.div
                whileHover={{ y: -8 }}
                className="relative glass-card border border-white/10 rounded-3xl p-8 hover:border-emerald-400/30 transition-all duration-500"
              >
                <div
                  className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 text-white transform group-hover:scale-110 transition-transform duration-300`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-emerald-300 transition-colors uppercase tracking-wide">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed font-light">
                  {feature.description}
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-b-3xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Feature Showcase */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="relative mb-20"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 rounded-3xl"></div>
          <div className="relative grid lg:grid-cols-2 gap-16 items-center p-12 lg:p-16 glass-card border border-white/10 rounded-3xl">
            {/* Left - Image */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-3xl blur-2xl opacity-20"></div>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                  <defs>
                    <radialGradient
                      id="bgGrad"
                      cx="50%"
                      cy="50%"
                      r="80%"
                      fx="50%"
                      fy="50%"
                    >
                      <stop offset="0%" stop-color="#1e293b" />
                      <stop offset="100%" stop-color="#0f172a" />
                    </radialGradient>

                    <linearGradient
                      id="bodyGrad"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop
                        offset="0%"
                        stop-color="#38bdf8"
                        stop-opacity="0.8"
                      />
                      <stop
                        offset="100%"
                        stop-color="#38bdf8"
                        stop-opacity="0.1"
                      />
                    </linearGradient>

                    <linearGradient
                      id="scanBeam"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0" />
                      <stop
                        offset="50%"
                        stop-color="#22d3ee"
                        stop-opacity="0.5"
                      />
                      <stop
                        offset="51%"
                        stop-color="#e0f2fe"
                        stop-opacity="0.9"
                      />
                      <stop
                        offset="100%"
                        stop-color="#22d3ee"
                        stop-opacity="0"
                      />
                    </linearGradient>

                    <radialGradient id="virusGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stop-color="#fca5a5" />
                      <stop offset="60%" stop-color="#ef4444" />
                      <stop offset="100%" stop-color="#991b1b" />
                    </radialGradient>

                    <linearGradient
                      id="aiGrad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stop-color="#a78bfa" />
                      <stop offset="100%" stop-color="#8b5cf6" />
                    </linearGradient>

                    <filter
                      id="glow"
                      x="-20%"
                      y="-20%"
                      width="140%"
                      height="140%"
                    >
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite
                        in="SourceGraphic"
                        in2="blur"
                        operator="over"
                      />
                    </filter>
                  </defs>

                  <rect width="512" height="512" fill="url(#bgGrad)" />

                  <g stroke="#334155" stroke-width="1" opacity="0.3">
                    <line x1="0" y1="128" x2="512" y2="128" />
                    <line x1="0" y1="256" x2="512" y2="256" />
                    <line x1="0" y1="384" x2="512" y2="384" />
                    <line x1="128" y1="0" x2="128" y2="512" />
                    <line x1="256" y1="0" x2="256" y2="512" />
                    <line x1="384" y1="0" x2="384" y2="512" />
                  </g>

                  <g transform="translate(106, 60)">
                    <path
                      d="M150,0 C120,0 100,25 100,55 C100,75 110,90 125,98 C90,105 60,130 50,170 L40,350 C40,380 150,380 150,380 C150,380 260,380 260,350 L250,170 C240,130 210,105 175,98 C190,90 200,75 200,55 C200,25 180,0 150,0 Z"
                      fill="url(#bodyGrad)"
                      stroke="#0ea5e9"
                      stroke-width="2"
                    />

                    <path
                      d="M110,140 Q140,140 145,190 Q148,230 120,250 Q90,230 90,190 Q90,150 110,140 Z"
                      fill="#0f172a"
                      opacity="0.4"
                    />
                    <path
                      d="M190,140 Q160,140 155,190 Q152,230 180,250 Q210,230 210,190 Q210,150 190,140 Z"
                      fill="#0f172a"
                      opacity="0.4"
                    />

                    <g filter="url(#glow)">
                      <circle cx="180" cy="180" r="12" fill="url(#virusGrad)" />
                      <path
                        d="M180,164 L180,196 M164,180 L196,180 M169,169 L191,191 M169,191 L191,169"
                        stroke="#ef4444"
                        stroke-width="2"
                      />

                      <circle cx="165" cy="200" r="8" fill="url(#virusGrad)" />
                      <path
                        d="M165,188 L165,212 M153,200 L177,200"
                        stroke="#ef4444"
                        stroke-width="1.5"
                      />

                      <circle cx="195" cy="210" r="6" fill="url(#virusGrad)" />
                    </g>

                    <g id="scannerMover">
                      <rect
                        x="20"
                        y="0"
                        width="260"
                        height="40"
                        fill="url(#scanBeam)"
                        opacity="0.6"
                      />
                      <line
                        x1="20"
                        y1="20"
                        x2="280"
                        y2="20"
                        stroke="#a5f3fc"
                        stroke-width="1"
                        opacity="0.8"
                      />

                      <animateTransform
                        attributeName="transform"
                        type="translate"
                        values="0,0; 0,340; 0,0"
                        keyTimes="0; 0.5; 1"
                        dur="4s"
                        repeatCount="indefinite"
                      />
                    </g>
                    <g
                      stroke="#ef4444"
                      stroke-width="2"
                      fill="none"
                      opacity="0.9"
                    >
                      <path d="M140,150 L150,150 M140,150 L140,160" />{" "}
                      <path d="M220,150 L210,150 M220,150 L220,160" />{" "}
                      <path d="M140,230 L150,230 M140,230 L140,220" />{" "}
                      <path d="M220,230 L210,230 M220,230 L220,220" />{" "}
                    </g>

                    <rect
                      x="225"
                      y="145"
                      width="70"
                      height="16"
                      rx="2"
                      fill="#ef4444"
                    />
                    <text
                      x="230"
                      y="157"
                      font-family="sans-serif"
                      font-size="9"
                      font-weight="bold"
                      fill="white"
                    >
                      DETECTED
                    </text>
                    <line
                      x1="220"
                      y1="155"
                      x2="225"
                      y2="155"
                      stroke="#ef4444"
                      stroke-width="1"
                    />
                  </g>

                  <g transform="translate(360, 100)">
                    <rect
                      x="0"
                      y="0"
                      width="120"
                      height="200"
                      rx="8"
                      fill="#1e293b"
                      stroke="#475569"
                      stroke-width="1"
                      opacity="0.8"
                    />

                    <g transform="translate(35, 20)">
                      <path
                        d="M25,0 C11,0 0,11 0,25 C0,39 11,50 25,50 C39,50 50,39 50,25 C50,11 39,0 25,0 Z"
                        fill="none"
                        stroke="url(#aiGrad)"
                        stroke-width="2"
                      />
                      <circle cx="25" cy="25" r="4" fill="url(#aiGrad)" />
                      <circle cx="15" cy="15" r="3" fill="#a78bfa" />
                      <circle cx="35" cy="15" r="3" fill="#a78bfa" />
                      <circle cx="15" cy="35" r="3" fill="#a78bfa" />
                      <circle cx="35" cy="35" r="3" fill="#a78bfa" />
                      <path
                        d="M25,25 L15,15 M25,25 L35,15 M25,25 L15,35 M25,25 L35,35"
                        stroke="#a78bfa"
                        stroke-width="1.5"
                      />
                    </g>

                    <g transform="translate(20, 90)">
                      <text
                        x="0"
                        y="-10"
                        font-family="monospace"
                        font-size="10"
                        fill="#94a3b8"
                      >
                        ANALYSIS
                      </text>
                      <rect
                        x="0"
                        y="0"
                        width="80"
                        height="6"
                        rx="3"
                        fill="#334155"
                      />
                      <rect
                        x="0"
                        y="0"
                        width="60"
                        height="6"
                        rx="3"
                        fill="#22d3ee"
                      />
                      <rect
                        x="0"
                        y="15"
                        width="80"
                        height="6"
                        rx="3"
                        fill="#334155"
                      />
                      <rect
                        x="0"
                        y="15"
                        width="75"
                        height="6"
                        rx="3"
                        fill="#ef4444"
                      />{" "}
                      <rect
                        x="0"
                        y="30"
                        width="80"
                        height="6"
                        rx="3"
                        fill="#334155"
                      />
                      <rect
                        x="0"
                        y="30"
                        width="40"
                        height="6"
                        rx="3"
                        fill="#a78bfa"
                      />
                    </g>

                    <path
                      d="M-5,45 L-30,45 L-54,80"
                      stroke="#a78bfa"
                      stroke-width="1"
                      fill="none"
                      stroke-dasharray="4 2"
                    />
                    <circle cx="-5" cy="45" r="3" fill="#a78bfa" />
                  </g>

                  <g fill="#64748b">
                    <circle cx="50" cy="450" r="2" />
                    <circle cx="60" cy="450" r="2" />
                    <circle cx="70" cy="450" r="2" />
                    <rect x="50" y="460" width="100" height="2" rx="1" />
                    <rect x="50" y="470" width="60" height="2" rx="1" />
                  </g>

                  <path
                    d="M20,50 L20,20 L50,20"
                    stroke="#22d3ee"
                    stroke-width="3"
                    fill="none"
                  />
                  <path
                    d="M492,50 L492,20 L462,20"
                    stroke="#22d3ee"
                    stroke-width="3"
                    fill="none"
                  />
                  <path
                    d="M20,462 L20,492 L50,492"
                    stroke="#22d3ee"
                    stroke-width="3"
                    fill="none"
                  />
                  <path
                    d="M492,462 L492,492 L462,492"
                    stroke="#22d3ee"
                    stroke-width="3"
                    fill="none"
                  />
                </svg>

                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-3xl"></div>
              </div>
            </div>

            {/* Right - Content */}
            <div className="space-y-8">
              <div>
                <div className="inline-flex items-center px-3 py-1 glass-card text-emerald-300 rounded-full text-xs font-mono uppercase tracking-widest mb-4 border border-emerald-300/30">
                  ✨ AI TECHNOLOGY
                </div>
                <h3 className="text-4xl font-black text-white mb-6 leading-tight uppercase tracking-tight">
                  NEXT-GEN <span className="gradient-text">AI TECHNOLOGY</span>
                </h3>
                <p className="text-lg text-gray-400 mb-8 leading-relaxed font-light">
                  Using advanced machine learning algorithms to analyze skin
                  images with high accuracy, helping to detect potential issues
                  early and provide appropriate care recommendations.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 glass-card rounded-2xl border border-emerald-400/30">
                  <div className="text-3xl font-black gradient-text mb-2">
                    85%
                  </div>
                  <div className="text-sm text-gray-400 uppercase tracking-wider font-mono">
                    Accuracy
                  </div>
                </div>
                <div className="text-center p-4 glass-card rounded-2xl border border-teal-400/30">
                  <div className="text-3xl font-black gradient-text mb-2">
                    4s
                  </div>
                  <div className="text-sm text-gray-400 uppercase tracking-wider font-mono">
                    Analysis
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.a
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  href="http://download-app.nhatlonh.id.vn:6767/skinalyze.apk"
                  className="group flex items-center justify-center glass-card text-white border border-white/20 px-8 py-4 rounded-2xl font-bold hover:border-emerald-400/50 transition-all duration-300 glow-emerald uppercase tracking-widest text-sm"
                  data-hover="true"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                  </svg>
                  Download Android
                </motion.a>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Additional Features Grid */}
        <div className="text-center mb-16">
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-black text-white mb-4 uppercase tracking-tight"
          >
            {t("features.whyChoose")}{" "}
            <span className="gradient-text">
              {t("features.whyChooseHighlight")}
            </span>
            ?
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto font-light"
          >
            {t("features.whyChooseDesc")}
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -8 }}
              className="group relative glass-card rounded-3xl p-8 hover:border-[#4fb7b3]/30 transition-all duration-500 border border-white/10"
              data-hover="true"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#4fb7b3] to-[#a8fbd3] rounded-t-3xl transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>

              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-16 h-16 glass-card rounded-2xl flex items-center justify-center text-2xl mb-6 border border-emerald-400/30"
              >
                {feature.icon}
              </motion.div>

              <h4 className="text-xl font-bold text-white mb-4 group-hover:text-emerald-300 transition-colors uppercase tracking-wide">
                {feature.title}
              </h4>

              <p className="text-gray-400 leading-relaxed font-light">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
