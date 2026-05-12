'use client';

import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function PricingPage() {
    const t = useTranslations("pricing");

    const freeFeatures = [t("freeFeature0"), t("freeFeature1"), t("freeFeature2"), t("freeFeature3")];
    const proFeatures = [t("proFeature0"), t("proFeature1"), t("proFeature2"), t("proFeature3"), t("proFeature4"), t("proFeature5")];
    const enterpriseFeatures = [t("enterpriseFeature0"), t("enterpriseFeature1"), t("enterpriseFeature2"), t("enterpriseFeature3"), t("enterpriseFeature4"), t("enterpriseFeature5")];

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
                            <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight">{t("title")}</h1>
                            <p className="text-secondary-text max-w-2xl mx-auto text-lg pt-4">{t("subtitle")}</p>
                        </motion.div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                        {/* Free Tier */}
                        <PricingCard
                            tier={t("freeName")}
                            price="0"
                            desc={t("freeDesc")}
                            features={freeFeatures}
                            buttonText={t("freeButton")}
                            href="/register"
                            mostPopular={t("mostPopular")}
                            perMonth={t("perMonth")}
                        />

                        {/* Pro Tier */}
                        <PricingCard
                            tier={t("proName")}
                            price="9.99"
                            desc={t("proDesc")}
                            features={proFeatures}
                            buttonText={t("proButton")}
                            featured={true}
                            href="/register?plan=pro"
                            mostPopular={t("mostPopular")}
                            perMonth={t("perMonth")}
                        />

                        {/* Enterprise Tier */}
                        <PricingCard
                            tier={t("enterpriseName")}
                            price="49.99"
                            desc={t("enterpriseDesc")}
                            features={enterpriseFeatures}
                            buttonText={t("enterpriseButton")}
                            href="/contact"
                            mostPopular={t("mostPopular")}
                            perMonth={t("perMonth")}
                        />
                    </div>

                    {/* FAQ/Notice Section */}
                    <div className="mt-32 text-center max-w-3xl mx-auto p-12 rounded-[2.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-sm">
                        <h2 className="text-2xl font-bold text-white mb-4">{t("faqTitle")}</h2>
                        <div className="text-left space-y-8 mt-10">
                            <div>
                                <h4 className="text-white font-semibold mb-2">{t("cancelTitle")}</h4>
                                <p className="text-secondary-text text-sm">{t("cancelAnswer")}</p>
                            </div>
                            <div>
                                <h4 className="text-white font-semibold mb-2">{t("formatsTitle")}</h4>
                                <p className="text-secondary-text text-sm">{t("formatsAnswer")}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

function PricingCard({ tier, price, desc, features, buttonText, featured = false, href, mostPopular, perMonth }: {
    tier: string,
    price: string,
    desc: string,
    features: string[],
    buttonText: string,
    featured?: boolean,
    href: string,
    mostPopular: string,
    perMonth: string
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
                    {mostPopular}
                </div>
            )}

            <div className="mb-8">
                <h3 className={`text-xl font-bold mb-2 ${featured ? 'text-primary' : 'text-white'}`}>{tier}</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-white">${price}</span>
                    <span className="text-secondary-text">{perMonth}</span>
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
