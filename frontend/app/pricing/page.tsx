'use client';

import { motion } from "framer-motion";
import { Check, Zap, Sparkles, ShieldCheck, ChevronRight } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Link from "next/link";

export default function PricingPage() {
    return (
        <div className="flex flex-col min-h-screen bg-black relative selection:bg-primary/30">
            <div className="bg-grid" />
            <Navbar />

            <main className="flex-1 pt-44 pb-20 px-6 relative z-10">
                <div className="container mx-auto max-w-7xl">
                    <div className="text-center mb-20 space-y-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight">Simple, Transparent Pricing</h1>
                            <p className="text-secondary-text max-w-2xl mx-auto text-lg pt-4">
                                Choose the plan that's right for your presentation goals. No hidden fees.
                            </p>
                        </motion.div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                        {/* Free Tier */}
                        <PricingCard
                            tier="Free"
                            price="0"
                            desc="Perfect for trying out PreCue's core features."
                            features={[
                                "3 Presentations per month",
                                "Basic AI Voice Control",
                                "Standard Analytics",
                                "Email Support"
                            ]}
                            buttonText="Get Started"
                            href="/register"
                        />

                        {/* Pro Tier */}
                        <PricingCard
                            tier="Pro"
                            price="10"
                            desc="The power user's choice for professional speaking."
                            features={[
                                "Unlimited Presentations",
                                "Advanced AI Voice Control",
                                "Full Rehearsal Analytics",
                                "Smart Q&A Generation",
                                "Priority Support",
                                "Early Access to Beta Features"
                            ]}
                            buttonText="Start Pro Trial"
                            featured={true}
                            href="/register?plan=pro"
                        />

                        {/* Enterprise Tier */}
                        <PricingCard
                            tier="Enterprise"
                            price="50"
                            desc="Global scale tools for teams and top-tier speakers."
                            features={[
                                "Everything in Pro",
                                "Team Collaboration Tools",
                                "Custom AI Training",
                                "Dedicated Account Manager",
                                "White-label Options",
                                "Custom Integration Support"
                            ]}
                            buttonText="Contact Sales"
                            href="/contact"
                        />
                    </div>

                    {/* FAQ/Notice Section */}
                    <div className="mt-32 text-center max-w-3xl mx-auto p-12 rounded-[2.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-sm">
                        <h2 className="text-2xl font-bold text-white mb-4">Frequently Asked Questions</h2>
                        <div className="text-left space-y-8 mt-10">
                            <div>
                                <h4 className="text-white font-semibold mb-2">Can I cancel anytime?</h4>
                                <p className="text-secondary-text text-sm">Yes, you can cancel your subscription at any time. You'll keep your features until the end of your billing cycle.</p>
                            </div>
                            <div>
                                <h4 className="text-white font-semibold mb-2">What format of presentations are supported?</h4>
                                <p className="text-secondary-text text-sm">We currently support PDF and PPTX (PowerPoint) formats. Google Slides support is coming soon.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

function PricingCard({ tier, price, desc, features, buttonText, featured = false, href }: {
    tier: string,
    price: string,
    desc: string,
    features: string[],
    buttonText: string,
    featured?: boolean,
    href: string
}) {
    return (
        <motion.div
            whileHover={{ y: featured ? -10 : -5 }}
            className={`relative p-8 sm:p-10 rounded-[2.5rem] flex flex-col h-full transition-all duration-500 border
                ${featured
                    ? 'bg-gradient-to-b from-primary/10 to-zinc-900 border-primary/40 shadow-[0_0_50px_rgba(234,88,12,0.15)] ring-1 ring-primary/20'
                    : 'bg-zinc-900/40 border-white/10 hover:border-white/20'
                }`}
        >
            {featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
                    Most Popular
                </div>
            )}

            <div className="mb-8">
                <h3 className={`text-xl font-bold mb-2 ${featured ? 'text-primary' : 'text-white'}`}>{tier}</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-white">${price}</span>
                    <span className="text-secondary-text">/month</span>
                </div>
                <p className="text-secondary-text text-sm mt-4 leading-relaxed">{desc}</p>
            </div>

            <div className="space-y-4 mb-10 flex-1">
                {features.map((feature, i) => (
                    <div key={i} className="flex gap-3 items-start group">
                        <div className={`mt-1 p-0.5 rounded-full flex-shrink-0 ${featured ? 'bg-primary/20 text-primary' : 'bg-white/10 text-zinc-400'}`}>
                            <Check size={12} strokeWidth={3} />
                        </div>
                        <span className="text-zinc-300 text-sm leading-tight group-hover:text-white transition-colors">{feature}</span>
                    </div>
                ))}
            </div>

            <Link
                href={href}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-base
                    ${featured
                        ? 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20'
                        : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                    }`}
            >
                {buttonText}
                <ChevronRight size={18} />
            </Link>
        </motion.div>
    );
}
