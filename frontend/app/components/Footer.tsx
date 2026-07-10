"use client";

import Link from "next/link";
import Image from "next/image";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Footer() {
    const t = useTranslations("footer");

    return (
        <footer className="border-t border-zinc-800 bg-black/50 backdrop-blur-xl mt-auto">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 group">
                            <div className="relative w-8 h-8 flex items-center justify-center">
                                <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-full group-hover:bg-primary/30 transition-colors" />
                                <Image
                                    src="/favicon.ico"
                                    alt="PreCue Logo"
                                    width={32}
                                    height={32}
                                    className="relative z-10 group-hover:scale-110 transition-transform duration-300"
                                />
                            </div>
                            <span className="font-bold text-lg text-white/90">
                                PreCue<span className="text-primary">.ai</span>
                            </span>
                        </div>
                        <p className="text-zinc-400 text-sm">
                            {t("description")}
                        </p>
                        <div className="flex gap-3">
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                            >
                                <Github size={18} />
                            </a>
                            <a
                                href="https://twitter.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                            >
                                <Twitter size={18} />
                            </a>
                            <a
                                href="https://linkedin.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                            >
                                <Linkedin size={18} />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-white mb-4">{t("product")}</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/#features" className="text-zinc-400 hover:text-white transition-colors text-sm">
                                    {t("features")}
                                </Link>
                            </li>
                            <li>
                                <Link href="/pricing" className="text-zinc-400 hover:text-white transition-colors text-sm">
                                    {t("pricing")}
                                </Link>
                            </li>
                            <li>
                                <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors text-sm">
                                    {t("demo")}
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-white mb-4">{t("company")}</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/#customers" className="text-zinc-400 hover:text-white transition-colors text-sm">
                                    {t("customers")}
                                </Link>
                            </li>
                            <li>
                                <Link href="/blog" className="text-zinc-400 hover:text-white transition-colors text-sm">
                                    {t("blog")}
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="text-zinc-400 hover:text-white transition-colors text-sm">
                                    {t("contact")}
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-white mb-4">{t("legal")}</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/legal/privacy" className="text-zinc-400 hover:text-white transition-colors text-sm">
                                    {t("privacyPolicy")}
                                </Link>
                            </li>
                            <li>
                                <Link href="/legal/terms" className="text-zinc-400 hover:text-white transition-colors text-sm">
                                    {t("termsOfService")}
                                </Link>
                            </li>
                            <li>
                                <Link href="/legal/cookies" className="text-zinc-400 hover:text-white transition-colors text-sm">
                                    {t("cookiePolicy")}
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-zinc-500 text-sm">
                        {t("copyright", { year: new Date().getFullYear() })}
                    </p>
                    <div className="flex items-center gap-2 text-zinc-500 text-sm">
                        <Mail size={16} />
                        <a href="mailto:hello@precue.ai" className="hover:text-white transition-colors">
                            hello@precue.ai
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
