'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import Typewriter from "typewriter-effect";
import { Mic, Presentation, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 container mx-auto">
        <div className="font-bold text-xl flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center text-white">AI</div>
          Presentation Assistant
        </div>
        <div className="space-x-4">
          <Link href="/login" className="text-zinc-400 hover:text-white transition-colors">Sign In</Link>
          <Link href="/register" className="bg-white text-black px-4 py-2 rounded-md font-medium hover:bg-zinc-200 transition-colors">Sign Up</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 mt-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6 max-w-4xl"
        >
          <div className="inline-block px-3 py-1 border border-orange-500/30 bg-orange-500/10 rounded-full text-orange-400 text-sm mb-4">
            v1.0 Public Beta
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent pb-4">
            While Presenting <br />
            <span className="text-orange-500">
              <Typewriter
                options={{
                  strings: ['Forget the Slides.', 'Focus on the Stage.', 'Trust the AI.'],
                  autoStart: true,
                  loop: true,
                }}
              />
            </span>
          </h1>

          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto">
            You speak, AI listens and switches your slides at the perfect moment.
            Rehearse, get analytics, and overcome your stage fright.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link href="/dashboard" className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2">
              <Presentation className="w-5 h-5" />
              Try Demo (Guest)
            </Link>
            <Link href="/register" className="border border-zinc-700 hover:bg-zinc-800 text-white px-8 py-4 rounded-lg font-medium text-lg transition-all flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-orange-400" />
              Sign Up for Free
            </Link>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 container mx-auto pb-20">
          <FeatureCard
            icon={<Mic className="text-orange-500" />}
            title="Voice Control"
            desc="Ditch the remote. Just speak, and AI understands the context to change slides."
          />
          <FeatureCard
            icon={<Presentation className="text-blue-500" />}
            title="Rehearsal Mode"
            desc="Track your time, analyze speaking pace, and identify mistakes before the big day."
          />
          <FeatureCard
            icon={<Zap className="text-purple-500" />}
            title="Smart Analytics"
            desc="Upload your presentation, and let AI generate summaries and Q&A for you."
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-orange-500/50 transition-colors text-left">
      <div className="w-12 h-12 bg-zinc-900 rounded-lg flex items-center justify-center mb-4 border border-zinc-800">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-zinc-400">{desc}</p>
    </div>
  )
}