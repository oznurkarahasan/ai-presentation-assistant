'use client';

import { motion } from "framer-motion";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { Scale, UserCheck, Copyright, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function TermsPage() {
    const t = useTranslations("terms");

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
                            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">{t("title")}</h1>
                            <p className="text-zinc-500">{t("lastUpdated")}</p>
                        </div>

                        <div className="glass-card p-8 sm:p-12 space-y-10 bg-zinc-900/50 border-white/5 backdrop-blur-md rounded-[2.5rem]">
                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-primary">
                                    <Scale size={24} />
                                    <h2 className="text-xl font-bold tracking-tight">{t("sections.acceptance.title")}</h2>
                                </div>
                                <p className="text-zinc-400 leading-relaxed">
                                    {t("sections.acceptance.body")}
                                </p>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-primary">
                                    <UserCheck size={24} />
                                    <h2 className="text-xl font-bold tracking-tight">{t("sections.responsibilities.title")}</h2>
                                </div>
                                <p className="text-zinc-400 leading-relaxed">
                                    {t("sections.responsibilities.body")}
                                </p>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-primary">
                                    <Copyright size={24} />
                                    <h2 className="text-xl font-bold tracking-tight">{t("sections.ip.title")}</h2>
                                </div>
                                <p className="text-zinc-400 leading-relaxed">
                                    {t("sections.ip.body")}
                                </p>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-primary">
                                    <AlertCircle size={24} />
                                    <h2 className="text-xl font-bold tracking-tight">{t("sections.liability.title")}</h2>
                                </div>
                                <p className="text-zinc-400 leading-relaxed">
                                    {t("sections.liability.body")}
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
