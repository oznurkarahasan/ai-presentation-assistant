'use client';

import { motion } from "framer-motion";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { Shield, Lock, Eye, FileText } from "lucide-react";

export default function PrivacyPage() {
    return (
        <div className="flex flex-col min-h-screen bg-black relative selection:bg-primary/30">
            <div className="bg-grid" />
            <Navbar />

            <main className="flex-1 pt-44 pb-20 px-6 relative z-10">
                <div className="container mx-auto max-w-4xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-12"
                    >
                        <div className="text-center space-y-4">
                            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">Privacy Policy</h1>
                            <p className="text-zinc-500">Last updated: March 13, 2026</p>
                        </div>

                        <div className="glass-card p-8 sm:p-12 space-y-10 bg-zinc-900/50 border-white/5 backdrop-blur-md rounded-[2.5rem]">
                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-primary">
                                    <Shield size={24} />
                                    <h2 className="text-xl font-bold tracking-tight">Introduction</h2>
                                </div>
                                <p className="text-zinc-400 leading-relaxed">
                                    At PreCue.ai, we take your privacy seriously. This policy describes how we collect, use, and handle your data when you use our AI-powered presentation assistant.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-primary">
                                    <Eye size={24} />
                                    <h2 className="text-xl font-bold tracking-tight">Data We Collect</h2>
                                </div>
                                <ul className="list-disc list-inside text-zinc-400 space-y-3 pl-2">
                                    <li><span className="text-zinc-200">Account Info:</span> Email address and name provided during registration.</li>
                                    <li><span className="text-zinc-200">Presentation Files:</span> Documents (PDF, PPTX) you upload for processing.</li>
                                    <li><span className="text-zinc-200">Voice Data:</span> Real-time speech processed locally or on our secure servers for slide control.</li>
                                    <li><span className="text-zinc-200">Usage Data:</span> Analytics on how you interact with the application.</li>
                                </ul>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-primary">
                                    <Lock size={24} />
                                    <h2 className="text-xl font-bold tracking-tight">How We Protect Your Data</h2>
                                </div>
                                <p className="text-zinc-400 leading-relaxed">
                                    Your files are encrypted using 256-bit AES encryption. We do not store raw voice recordings unless explicitly enabled for rehearsal feedback, and such data is automatically deleted after 30 days.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-primary">
                                    <FileText size={24} />
                                    <h2 className="text-xl font-bold tracking-tight">Third-Party Services</h2>
                                </div>
                                <p className="text-zinc-400 leading-relaxed">
                                    We use trusted AI partners like Google and OpenAI to process text and speech. Your data is used only for processing requested actions and is never used to train global models.
                                </p>
                            </section>
                        </div>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
