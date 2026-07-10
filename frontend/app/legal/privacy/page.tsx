'use client';

import { motion } from "framer-motion";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { Shield, Lock, Eye, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

export default function PrivacyPage() {
    const t = useTranslations("privacy");

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
                                    <Shield size={24} />
                                    <h2 className="text-xl font-bold tracking-tight">{t("sections.introduction.title")}</h2>
                                </div>
                                <p className="text-zinc-400 leading-relaxed">
                                    {t("sections.introduction.body")}
                                </p>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-primary">
                                    <Eye size={24} />
                                    <h2 className="text-xl font-bold tracking-tight">{t("sections.data.title")}</h2>
                                </div>
                                <ul className="list-disc list-inside text-zinc-400 space-y-3 pl-2">
                                    <li><span className="text-zinc-200">{t("sections.data.items.account.label")}</span> {t("sections.data.items.account.body")}</li>
                                    <li><span className="text-zinc-200">{t("sections.data.items.files.label")}</span> {t("sections.data.items.files.body")}</li>
                                    <li><span className="text-zinc-200">{t("sections.data.items.voice.label")}</span> {t("sections.data.items.voice.body")}</li>
                                    <li><span className="text-zinc-200">{t("sections.data.items.usage.label")}</span> {t("sections.data.items.usage.body")}</li>
                                </ul>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-primary">
                                    <Lock size={24} />
                                    <h2 className="text-xl font-bold tracking-tight">{t("sections.protection.title")}</h2>
                                </div>
                                <p className="text-zinc-400 leading-relaxed">
                                    {t("sections.protection.body")}
                                </p>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-3 text-primary">
                                    <FileText size={24} />
                                    <h2 className="text-xl font-bold tracking-tight">{t("sections.thirdParty.title")}</h2>
                                </div>
                                <p className="text-zinc-400 leading-relaxed">
                                    {t("sections.thirdParty.body")}
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
