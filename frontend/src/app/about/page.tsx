"use client";

import Navbar from "@/components/navbar/Navbar";
import React from "react";
import { useTranslation } from "@/contexts/LanguageContext";

const About = () => {
  const { t } = useTranslation();
  const stats = [
    { number: "94%", label: t("about.stat1") },
    { number: "1M+", label: t("about.stat2") },
    { number: "50+", label: t("about.stat3") },
    { number: "24/7", label: t("about.stat4") },
  ];

  const timeline = [
    {
      year: "2025",
      title: "Company Founded",
      description:
        "Skinalyze was founded with a vision to apply AI to skin health care",
    },
    {
      year: "2025",
      title: "AI Engine Development",
      description:
        "Built the first AI algorithm for skin analysis with 85% accuracy",
    },
    {
      year: "2026",
      title: "Beta Version Launch",
      description: "Tested with 1000+ users and improved accuracy to 85%",
    },
    {
      year: "2027",
      title: "Market Expansion",
      description:
        "Officially launched in Vietnam and Southeast Asian countries",
    },
    {
      year: "2028",
      title: "AI 3.0 & 3D Modeling",
      description:
        "Upgraded to AI 3.0 with 94% accuracy and integrated 3D technology",
    },
  ];

  const team = [
    {
      name: "Dr. Nguyễn Minh Anh",
      position: "CEO & Co-founder",
      specialty: "AI Research & Product Strategy",
      image:
        "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=300&h=300&fit=crop&crop=face",
      description: "15+ năm kinh nghiệm trong AI và công nghệ y tế",
    },
    {
      name: "Dr. Trần Thị Mai",
      position: "Chief Medical Officer",
      specialty: "Dermatology & Clinical Research",
      image:
        "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=300&h=300&fit=crop&crop=face",
      description: "Chuyên gia da liễu với 20+ năm kinh nghiệm lâm sàng",
    },
    {
      name: "Lê Văn Đức",
      position: "CTO & Co-founder",
      specialty: "Machine Learning & Software Architecture",
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face",
      description: "Chuyên gia AI với background từ Google và Microsoft",
    },
    {
      name: "Phạm Thị Hương",
      position: "Head of UX Design",
      specialty: "Healthcare UX & Product Design",
      image:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=300&h=300&fit=crop&crop=face",
      description: "10+ năm thiết kế UX cho các ứng dụng y tế",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-emerald-950/50 to-teal-950/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 glass-card border border-emerald-400/30 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
            <span className="gradient-text">{t("about.badge")}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t("about.title")}{" "}
            <span className="gradient-text">{t("about.titleHighlight")}</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            {t("about.subtitle")}
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-[#0a0e1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-8">
                {t("about.missionVisionTitle")}
              </h2>

              <div className="space-y-8">
                <div className="border-l-4 border-emerald-500 pl-6">
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {t("about.missionTitle")}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {t("about.missionDesc")}
                  </p>
                </div>

                <div className="border-l-4 border-teal-500 pl-6">
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {t("about.visionTitle")}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {t("about.visionDesc")}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="glass-card border border-white/10 rounded-3xl p-8 h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 glow-emerald">
                    <svg
                      className="w-12 h-12 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    {t("about.innovationTitle")}
                  </h3>
                  <p className="text-gray-400">{t("about.innovationDesc")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-gradient-to-br from-emerald-950/30 to-teal-950/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              {t("about.achievementsTitle")}
            </h2>
            <p className="text-lg text-gray-400">
              {t("about.achievementsDesc")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="glass-card border border-white/10 rounded-2xl p-8 text-center hover:border-emerald-400/50 transition-all"
              >
                <div className="text-4xl font-bold gradient-text mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-300 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-[#0a0e1a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Development Journey
            </h2>
            <p className="text-lg text-gray-400">
              From idea to reality - the story of Skinalyze
            </p>
          </div>

          <div className="relative">
            <div className="space-y-12">
              {timeline.map((item, index) => (
                <div key={index} className="relative flex items-start">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg z-10 glow-emerald">
                    {item.year.slice(-2)}
                  </div>
                  <div className="ml-8 glass-card border border-white/10 rounded-2xl p-6 hover:border-emerald-400/50 transition-all flex-1">
                    <div className="text-sm text-emerald-400 font-semibold mb-1">
                      {item.year}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">
                      {item.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 bg-gradient-to-br from-emerald-950/30 to-teal-950/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Core Values</h2>
            <p className="text-lg text-gray-400">
              The principles that guide all our activities
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="glass-card border border-white/10 rounded-2xl p-8 text-center hover:border-emerald-400/50 transition-all">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-emerald-400"
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
              <h3 className="text-xl font-bold text-white mb-4">Chính xác</h3>
              <p className="text-gray-400">
                Cam kết cung cấp kết quả phân tích chính xác và đáng tin cậy
                nhất
              </p>
            </div>

            <div className="glass-card border border-white/10 rounded-2xl p-8 text-center hover:border-emerald-400/50 transition-all">
              <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-teal-400"
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
              <h3 className="text-xl font-bold text-white mb-4">Security</h3>
              <p className="text-gray-400">
                Protecting users&apos; personal information and medical data
                absolutely
              </p>
            </div>

            <div className="glass-card border border-white/10 rounded-2xl p-8 text-center hover:border-emerald-400/50 transition-all">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-cyan-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Innovation</h3>
              <p className="text-gray-400">
                Continuously researching and developing new technologies
              </p>
            </div>

            <div className="glass-card border border-white/10 rounded-2xl p-8 text-center hover:border-emerald-400/50 transition-all">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">
                Collaboration
              </h3>
              <p className="text-gray-400">
                Working closely with the medical and research community
              </p>
            </div>

            <div className="glass-card border border-white/10 rounded-2xl p-8 text-center hover:border-emerald-400/50 transition-all">
              <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-teal-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Care</h3>
              <p className="text-gray-400">
                Putting users&apos; health and interests first
              </p>
            </div>

            <div className="glass-card border border-white/10 rounded-2xl p-8 text-center hover:border-emerald-400/50 transition-all">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-cyan-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Global</h3>
              <p className="text-gray-400">Aiming to serve users worldwide</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-[#0a0e1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Leadership Team
            </h2>
            <p className="text-lg text-gray-400">
              Leading experts driving Skinalyze forward
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div
                key={index}
                className="glass-card border border-white/10 rounded-2xl overflow-hidden hover:border-emerald-400/50 transition-all"
              >
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-64 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {member.name}
                  </h3>
                  <div className="text-emerald-400 font-semibold mb-2">
                    {member.position}
                  </div>
                  <div className="text-sm text-gray-500 mb-3">
                    {member.specialty}
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {member.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Join us in revolutionizing skin care
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Discover the power of AI in caring for your skin health
          </p>
          <a
            href="https://drive.usercontent.google.com/download?id=123ZloJnFZ7Zl_ifoFm61ntP1f1r0LqAt&export=download&authuser=0&confirm=t&uuid=9131b936-3d60-41c7-a7ad-cc2b70e843a5&at=AN8xHopwJHFiAzU-0nvW7l_zIAeV%3A1752304941111"
            className="bg-white text-emerald-600 font-semibold py-4 px-8 rounded-2xl hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl"
          >
            Download Free App
          </a>
        </div>
      </section>
    </div>
  );
};

export default About;
