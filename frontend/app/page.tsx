'use client';

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Typewriter from "typewriter-effect";
import { Mic, Presentation, Zap, Sparkles, Layers, ShieldCheck, ChevronRight, Quote, Star, Users } from "lucide-react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("home");

  return (
    <div className="flex flex-col min-h-screen bg-black relative selection:bg-primary/30">
      <div className="bg-grid" />
      <Navbar />

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-32 pb-20 lg:pt-20 lg:pb-16 min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8 max-w-4xl mx-auto"
          >
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
              <span className="text-white">{t("hero.while")}</span>
              <br />
              <span className="text-primary truncate block min-h-[1.2em]">
                <Typewriter
                  options={{
                    strings: [t("hero.typewriter1"), t("hero.typewriter2"), t("hero.typewriter3")],
                    autoStart: true,
                    loop: true,
                    deleteSpeed: 50,
                    delay: 80,
                  }}
                />
              </span>
            </h1>

            <p className="text-secondary-text text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed px-4">
              {t("hero.description")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10 px-6 sm:px-0">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground px-10 py-4 rounded-xl font-bold text-sm sm:text-base transition-all active:scale-95 shadow-xl shadow-primary/30 group"
              >
                <Image src="/favicon.ico" alt="Icon" width={18} height={18} className="w-[18px] h-[18px]" />
                {t("hero.cta")}
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 px-6 relative">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">{t("features.title")}</h2>
              <p className="text-secondary-text max-w-2xl mx-auto text-sm sm:text-base px-4">{t("features.description")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              <FeatureCard
                icon={<Mic className="text-primary" size={24} />}
                title={t("features.voiceControl.title")}
                desc={t("features.voiceControl.desc")}
              />
              <FeatureCard
                icon={<Presentation className="text-blue-400" size={24} />}
                title={t("features.rehearsalAnalytics.title")}
                desc={t("features.rehearsalAnalytics.desc")}
              />
              <FeatureCard
                icon={<Zap className="text-purple-400" size={24} />}
                title={t("features.smartInsights.title")}
                desc={t("features.smartInsights.desc")}
              />
              <FeatureCard
                icon={<Sparkles className="text-amber-400" size={24} />}
                title={t("features.realtimeFeedback.title")}
                desc={t("features.realtimeFeedback.desc")}
              />
              <FeatureCard
                icon={<Layers className="text-emerald-400" size={24} />}
                title={t("features.archive.title")}
                desc={t("features.archive.desc")}
              />
              <FeatureCard
                icon={<ShieldCheck className="text-rose-400" size={24} />}
                title={t("features.secure.title")}
                desc={t("features.secure.desc")}
              />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 px-6 border-t border-white/5 bg-white/[0.01]">
          <div className="container mx-auto max-w-5xl">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
              <div className="flex-1 space-y-8 w-full">
                <div className="space-y-4 text-center lg:text-left">
                  <h2 className="text-3xl sm:text-4xl font-bold text-white">{t("howItWorks.title")}</h2>
                  <p className="text-secondary-text">{t("howItWorks.subtitle")}</p>
                </div>

                <div className="space-y-10">
                  <StepItem
                    number="1"
                    color="bg-primary/20 border-primary/40 text-primary"
                    title={t("howItWorks.step1.title")}
                    desc={t("howItWorks.step1.desc")}
                  />
                  <StepItem
                    number="2"
                    color="bg-blue-500/20 border-blue-500/40 text-blue-400"
                    title={t("howItWorks.step2.title")}
                    desc={t("howItWorks.step2.desc")}
                  />
                  <StepItem
                    number="3"
                    color="bg-purple-500/20 border-purple-500/40 text-purple-400"
                    title={t("howItWorks.step3.title")}
                    desc={t("howItWorks.step3.desc")}
                  />
                </div>
              </div>

              <div className="flex-1 w-full max-w-2xl">
                <div className="relative aspect-video bg-zinc-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                  <video
                    className="h-full w-full object-cover"
                    src="/videos/scenerio.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Customers / Testimonials Section */}
        <section id="customers" className="py-24 px-6 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-[120px] rounded-full pointer-events-none opacity-50" />

          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="text-center mb-20 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">
                <Users size={12} className="text-primary" />
                {t("testimonials.badge")}
              </div>
              <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">{t("testimonials.title")}</h2>
              <p className="text-secondary-text max-w-2xl mx-auto text-sm sm:text-base">{t("testimonials.subtitle")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              <TestimonialCard
                name="Sarah Jenkins"
                role="Marketing Director @ TechFlow"
                content={t("testimonials.sarah.content")}
                rating={5}
                avatar="SJ"
              />
              <TestimonialCard
                name="Marcus Thorne"
                role="Professional Keynote Speaker"
                content={t("testimonials.marcus.content")}
                rating={5}
                avatar="MT"
              />
              <TestimonialCard
                name="Elena Rossi"
                role="Graduate Researcher"
                content={t("testimonials.elena.content")}
                rating={5}
                avatar="ER"
              />
            </div>

          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-8 sm:p-10 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-primary/40 hover:bg-white/[0.04] transition-all duration-500 text-left group flex flex-col items-start gap-4">
      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all duration-500">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-bold mb-3 text-white group-hover:text-primary transition-colors duration-300">{title}</h3>
        <p className="text-secondary-text text-sm sm:text-base leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">{desc}</p>
      </div>
    </div>
  )
}


function TestimonialCard({ name, role, content, rating, avatar }: { name: string, role: string, content: string, rating: number, avatar: string }) {
  return (
    <div className="p-8 rounded-[2rem] bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all duration-500 relative group flex flex-col justify-between h-full">
      <div className="absolute top-6 right-8 text-primary/20 group-hover:text-primary/40 transition-colors">
        <Quote size={40} fill="currentColor" />
      </div>

      <div className="space-y-6">
        <div className="flex gap-1">
          {[...Array(rating)].map((_, i) => (
            <Star key={i} size={14} className="text-amber-500 fill-amber-500" />
          ))}
        </div>
        <p className="text-zinc-300 text-base leading-relaxed italic">&quot;{content}&quot;</p>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-bold text-primary">
          {avatar}
        </div>
        <div>
          <h4 className="text-white font-bold text-sm">{name}</h4>
          <p className="text-zinc-500 text-xs">{role}</p>
        </div>
      </div>
    </div>
  )
}
function StepItem({ number, color, title, desc }: { number: string, color: string, title: string, desc: string }) {
  return (
    <div className="flex gap-6 items-start">
      <div className={`flex-shrink-0 w-10 h-10 rounded-2xl border flex items-center justify-center font-black text-lg ${color} shadow-lg`}>
        {number}
      </div>
      <div>
        <h4 className="text-white text-lg font-bold mb-1.5">{title}</h4>
        <p className="text-secondary-text text-sm sm:text-base leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}
