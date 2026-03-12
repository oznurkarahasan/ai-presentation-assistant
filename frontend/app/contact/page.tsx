'use client';

import { motion } from "framer-motion";
import { Mail, MessageSquare, Send, MapPin, Phone, Github, Twitter, Linkedin } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function ContactPage() {
    return (
        <div className="flex flex-col min-h-screen bg-black relative selection:bg-primary/30">
            <div className="bg-grid" />
            <Navbar />

            <main className="flex-1 pt-44 pb-20 px-6 relative z-10">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16 space-y-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight">Get in Touch</h1>
                            <p className="text-secondary-text max-w-2xl mx-auto text-lg pt-4">
                                Have questions about PreCue? Our team is here to help you master your stage performance.
                            </p>
                        </motion.div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        {/* Contact Info */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="space-y-8"
                        >
                            <div className="glass-card p-8 rounded-[2.5rem] bg-zinc-900/40 border-white/5 space-y-8">
                                <h2 className="text-2xl font-bold text-white">Contact Information</h2>

                                <div className="space-y-6">
                                    <ContactInfoItem
                                        icon={<Mail className="text-primary" />}
                                        title="Email us"
                                        detail="hello@precue.ai"
                                        sub="We usually reply within 24 hours."
                                    />
                                    <ContactInfoItem
                                        icon={<MessageSquare className="text-blue-400" />}
                                        title="Live Support"
                                        detail="Available for Pro users"
                                        sub="Monday - Friday, 9am - 6pm EST."
                                    />
                                    <ContactInfoItem
                                        icon={<MapPin className="text-purple-400" />}
                                        title="Office"
                                        detail="Innovation Hub"
                                        sub="Tech District, San Francisco, CA"
                                    />
                                </div>

                                <div className="pt-8 border-t border-white/5">
                                    <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-widest">Follow Us</h3>
                                    <div className="flex gap-4">
                                        <SocialLink icon={<Twitter size={20} />} href="https://twitter.com" />
                                        <SocialLink icon={<Github size={20} />} href="https://github.com" />
                                        <SocialLink icon={<Linkedin size={20} />} href="https://linkedin.com" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Contact Form */}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                        >
                            <form className="glass-card p-8 sm:p-10 rounded-[2.5rem] bg-zinc-900/60 border-white/10 backdrop-blur-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />

                                <div className="space-y-6 relative z-10">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Full Name</label>
                                            <input
                                                type="text"
                                                placeholder="John Doe"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
                                            <input
                                                type="email"
                                                placeholder="john@example.com"
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Subject</label>
                                        <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white appearance-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer">
                                            <option className="bg-zinc-900">General Inquiry</option>
                                            <option className="bg-zinc-900">Technical Support</option>
                                            <option className="bg-zinc-900">Billing Question</option>
                                            <option className="bg-zinc-900">Partnership</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Message</label>
                                        <textarea
                                            rows={5}
                                            placeholder="How can we help you?"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        onClick={(e) => e.preventDefault()}
                                        className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                                    >
                                        Send Message
                                        <Send size={18} />
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

function ContactInfoItem({ icon, title, detail, sub }: { icon: React.ReactNode, title: string, detail: string, sub: string }) {
    return (
        <div className="flex gap-5 items-start">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                {icon}
            </div>
            <div>
                <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">{title}</h4>
                <div className="text-white font-bold text-lg mb-0.5">{detail}</div>
                <p className="text-secondary-text text-sm opacity-60">{sub}</p>
            </div>
        </div>
    );
}

function SocialLink({ icon, href }: { icon: React.ReactNode, href: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
        >
            {icon}
        </a>
    );
}
