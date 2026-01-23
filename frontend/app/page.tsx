'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import Typewriter from "typewriter-effect";
import { Mic, Presentation, Zap, Sparkles } from "lucide-react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-black relative">
      <div className="bg-grid" />
      <Navbar />

      <main className="flex-1 flex flex-col">
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8 max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-primary/30 bg-primary/10 rounded-full text-primary text-[13px] mb-4">
              <Sparkles size={14} />
              v1.0 Public Beta
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
              <span className="text-white">While Presenting</span>
              <br />
              <span className="text-primary">
                <Typewriter
                  options={{
                    strings: ['Trust the AI.', 'Forget the Slides.', 'Focus on the Stage.'],
                    autoStart: true,
                    loop: true,
                    deleteSpeed: 50,
                    delay: 80,
                  }}
                />
              </span>
            </h1>

            <p className="text-secondary-text text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              You speak, AI listens and switches your slides at the perfect moment.
              Rehearse, get analytics, and overcome your stage fright.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
              <Link
                href="/upload"
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground px-6 py-3 rounded-lg font-medium text-sm transition-all active:scale-95 shadow-lg shadow-primary/20"
              >
                <Presentation size={18} />
                Try Demo (Guest)
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white px-6 py-3 rounded-lg font-medium text-sm transition-all border border-white/10"
              >
                <Zap size={18} className="text-primary" />
                Sign Up for Free
              </Link>
            </div>
          </motion.div>
        </section>

        <section className="py-20 px-6 bg-gradient-to-b from-transparent to-card/50">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon={<Mic className="text-primary" size={24} />}
                title="Voice Control"
                desc="Ditch the remote. Just speak, and AI understands the context to change slides."
              />
              <FeatureCard
                icon={<Presentation className="text-blue-400" size={24} />}
                title="Rehearsal Mode"
                desc="Track your time, analyze speaking pace, and identify mistakes before the big day."
              />
              <FeatureCard
                icon={<Zap className="text-purple-400" size={24} />}
                title="Smart Analytics"
                desc="Upload your presentation, and let AI generate summaries and Q&A for you."
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
    <div className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-all text-left group">
      <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center mb-4 border border-white/10 group-hover:border-primary/30 transition-all">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2 text-white">{title}</h3>
      <p className="text-secondary-text text-sm leading-relaxed">{desc}</p>
    </div>
  )
}
