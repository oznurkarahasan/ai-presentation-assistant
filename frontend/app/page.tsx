'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import Typewriter from "typewriter-effect";
import { Mic, Presentation, Zap, Sparkles, Layers, ShieldCheck, ChevronRight, Play, Quote, Star, Users } from "lucide-react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Script from "next/script";
import Head from "next/head";


export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#E5E6E3] relative selection:bg-primary/30">
      <Head>
        {/* Preload the Spline Viewer Script and Scene Data for instant execution */}
        <link rel="preload" href="https://unpkg.com/@splinetool/viewer@1.9.7/build/spline-viewer.js" as="script" crossOrigin="anonymous" />
        <link rel="preload" href="https://prod.spline.design/gxGodnnFG7BPqJ2e/scene.splinecode" as="fetch" crossOrigin="anonymous" />
      </Head>
      <Navbar />

      <main className="flex-1 flex flex-col relative">
        {/* Spline 3D Scene Background */}
        <Script type="module" src="https://unpkg.com/@splinetool/viewer@1.9.7/build/spline-viewer.js" strategy="beforeInteractive" />
        <div className="absolute inset-0 z-0 h-screen w-full overflow-hidden pointer-events-none sm:pointer-events-auto">
          {/* USER: Replace the URL below with your own exported Splinecode URL */}
          {/* @ts-expect-error - Custom element not typed */}
          <spline-viewer url="https://prod.spline.design/gxGodnnFG7BPqJ2e/scene.splinecode"></spline-viewer>
        </div>

        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-32 pb-20 lg:pt-20 lg:pb-16 min-h-screen relative z-10 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8 max-w-4xl mx-auto pointer-events-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-primary/30 bg-primary/10 rounded-full text-primary text-[11px] sm:text-[13px] mb-4 backdrop-blur-sm">
              <Sparkles size={14} />
              v1.0 Public Beta • Build for Professionals
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
              <span className="text-white">While Presenting</span>
              <br />
              <span className="text-primary truncate block min-h-[1.2em]">
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

            <p className="text-orange-400 font-medium text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed px-4">
              Ditch the remote. You speak, AI listens and switches your slides at the perfect moment.
              Rehearse, get analytics, and dominate the stage.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10 px-6 sm:px-0">
              <Link
                href="/upload"
                className="inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-black text-orange-400 px-8 py-4 rounded-xl font-bold text-sm sm:text-base transition-all active:scale-95 shadow-lg shadow-black/20 group"
              >
                <Presentation size={18} />
                Try Demo (Guest)
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-white/50 hover:bg-white/70 text-zinc-900 px-8 py-4 rounded-xl font-bold text-sm sm:text-base transition-all border border-zinc-200 backdrop-blur-md"
              >
                <Zap size={18} className="text-primary" />
                Sign Up for Free
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 px-6 relative">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">Powerful Features for the Stage</h2>
              <p className="text-secondary-text max-w-2xl mx-auto text-sm sm:text-base px-4">PreCue is equipped with advanced AI tools that transform your presentation experience from start to finish.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              <FeatureCard
                icon={<Mic className="text-primary" size={24} />}
                title="AI Voice Control"
                desc="Leave the remote behind. Just speak, and AI understands the context to switch slides for you."
              />
              <FeatureCard
                icon={<Presentation className="text-blue-400" size={24} />}
                title="Rehearsal Analytics"
                desc="Track your speaking pace, duration, and pauses. See all your mistakes before you step on stage."
              />
              <FeatureCard
                icon={<Zap className="text-purple-400" size={24} />}
                title="Smart Insights"
                desc="Upload your presentation and let AI generate summaries, key points, and Q&A sets automatically."
              />
              <FeatureCard
                icon={<Sparkles className="text-amber-400" size={24} />}
                title="Real-time Feedback"
                desc="Get instant tips on tonality, energy, and flow during rehearsals to sharpen your performance."
              />
              <FeatureCard
                icon={<Layers className="text-emerald-400" size={24} />}
                title="Presentation Archive"
                desc="Store all your rehearsals and live presentations in one place, and track your progress over time."
              />
              <FeatureCard
                icon={<ShieldCheck className="text-rose-400" size={24} />}
                title="Secure & Fast"
                desc="Your presentations are encrypted end-to-end. Access them instantly from any device, anywhere."
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
                  <h2 className="text-3xl sm:text-4xl font-bold text-white">How It Works</h2>
                  <p className="text-secondary-text">Mastering your stage presence in three simple steps.</p>
                </div>

                <div className="space-y-10">
                  <StepItem
                    number="1"
                    color="bg-primary/20 border-primary/40 text-primary"
                    title="Upload Your Deck"
                    desc="Import your presentation in PDF or PPTX format in seconds."
                  />
                  <StepItem
                    number="2"
                    color="bg-blue-500/20 border-blue-500/40 text-blue-400"
                    title="Train the AI"
                    desc="Set keywords for slide transitions or let the AI decide based on context."
                  />
                  <StepItem
                    number="3"
                    color="bg-purple-500/20 border-purple-500/40 text-purple-400"
                    title="Own the Stage"
                    desc="Focus entirely on your storytelling; PreCue handles the rest seamlessly."
                  />
                </div>
              </div>

              <div className="flex-1 w-full max-w-2xl">
                <div className="relative aspect-video bg-zinc-900 rounded-3xl border border-white/10 flex items-center justify-center overflow-hidden group shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 cursor-pointer shadow-inner">
                      <Play className="text-primary fill-primary ml-1" size={32} />
                    </div>
                    <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md">Watch Demo Video</span>
                  </div>

                  {/* Decorative Elements */}
                  <div className="absolute top-4 right-4 flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-white/10" />
                    <div className="w-2 h-2 rounded-full bg-white/10" />
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                  </div>
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
                Community Loved
              </div>
              <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">Trusted by Leading Speakers</h2>
              <p className="text-secondary-text max-w-2xl mx-auto text-sm sm:text-base">Join the professionals who have transformed their presentation style with PreCue.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              <TestimonialCard
                name="Sarah Jenkins"
                role="Marketing Director @ TechFlow"
                content="PreCue changed the way I present. No more awkward fumbling for the remote. It's like having a silent assistant on stage with me."
                rating={5}
                avatar="SJ"
              />
              <TestimonialCard
                name="Marcus Thorne"
                role="Professional Keynote Speaker"
                content="The rehearsal analytics are a game-changer. Being able to track my pace and filler words helped me land my biggest contract yet."
                rating={5}
                avatar="MT"
              />
              <TestimonialCard
                name="Elena Rossi"
                role="Graduate Researcher"
                content="I used to be terrified of stage fright. PreCue handles the technical side flawlessly, so I can just focus on my data and storytelling."
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
