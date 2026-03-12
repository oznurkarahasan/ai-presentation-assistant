'use client';

import { motion } from "framer-motion";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { Scale, UserCheck, Copyright, AlertCircle } from "lucide-react";

export default function TermsPage() {
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
                            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">Terms of Service</h1>
                            <p className="text-zinc-500">Last updated: March 13, 2026</p>
                        </div>

                        <div className="glass-card p-8 sm:p-12 space-y-10 bg-zinc-900/50 border-white/5 backdrop-blur-md rounded-[2.5rem]">
                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-primary">
                                    <Scale size={24} />
                                    <h2 className="text-xl font-bold tracking-tight">Acceptance of Terms</h2>
                                </div>
                                <p className="text-zinc-400 leading-relaxed">
                                    By accessing or using PreCue.ai, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-primary">
                                    <UserCheck size={24} />
                                    <h2 className="text-xl font-bold tracking-tight">User Responsibilities</h2>
                                </div>
                                <p className="text-zinc-400 leading-relaxed">
                                    You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree not to upload any content that violates third-party rights or applicable laws.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-primary">
                                    <Copyright size={24} />
                                    <h2 className="text-xl font-bold tracking-tight">Intellectual Property</h2>
                                </div>
                                <p className="text-zinc-400 leading-relaxed">
                                    The &quot;PreCue.ai&quot; platform, its UI, algorithms, and AI models are the exclusive property of PreCue.ai. However, <span className="text-zinc-200 font-semibold italic">you retain all ownership rights</span> to the presentation files and content you upload.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-primary">
                                    <AlertCircle size={24} />
                                    <h2 className="text-xl font-bold tracking-tight">Limitation of Liability</h2>
                                </div>
                                <p className="text-zinc-400 leading-relaxed">
                                    PreCue.ai is provided &quot;as is&quot;. While we strive for 100% accuracy, we are not liable for any presentation failures, slide sync delays, or data loss occurring during live events.
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
