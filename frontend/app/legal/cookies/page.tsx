'use client';

import { motion } from "framer-motion";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { Cookie, Settings, BarChart, HardDrive } from "lucide-react";
import { useTranslations } from "next-intl";

export default function CookiesPage() {
    const t = useTranslations("cookies");

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
                                    <Cookie size={24} />
                                    <h2 className="text-xl font-bold tracking-tight">{t("sections.definition.title")}</h2>
                                </div>
                                <p className="text-zinc-400 leading-relaxed">
                                    {t("sections.definition.body")}
                                </p>
                            </section>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <section className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                                    <div className="flex items-center gap-2 text-white font-bold">
                                        <HardDrive size={18} className="text-blue-400" />
                                        {t("sections.categories.essential.title")}
                                    </div>
                                    <p className="text-zinc-500 text-sm">
                                        {t("sections.categories.essential.body")}
                                    </p>
                                </section>
                                <section className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                                    <div className="flex items-center gap-2 text-white font-bold">
                                        <Settings size={18} className="text-amber-400" />
                                        {t("sections.categories.preferences.title")}
                                    </div>
                                    <p className="text-zinc-500 text-sm">
                                        {t("sections.categories.preferences.body")}
                                    </p>
                                </section>
                            </div>

                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-primary">
                                    <BarChart size={24} />
                                    <h2 className="text-xl font-bold tracking-tight">{t("sections.analytics.title")}</h2>
                                </div>
                                <p className="text-zinc-400 leading-relaxed">
                                    {t("sections.analytics.body")}
                                </p>
                            </section>

                            <section className="p-6 border border-dashed border-white/10 rounded-2xl bg-zinc-900/30">
                                <h4 className="text-white font-semibold mb-2">{t("sections.manage.title")}</h4>
                                <p className="text-zinc-500 text-sm">
                                    {t("sections.manage.body")}
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
