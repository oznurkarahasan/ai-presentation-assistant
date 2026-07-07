"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import client from "../../api/client";
import { ButtonSpinner } from "../../components/Spinner";
import { getErrorMessage } from "../../lib/getErrorMessage";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const t = useTranslations("forgotPassword");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await client.post("/api/v1/auth/forgot-password", { email });
            setSuccess(true);
        } catch (err: unknown) {
            console.error("Forgot Password Error:", err);
            setError(getErrorMessage(err, t("failedToSend")));
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md"
            >
                <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-2xl shadow-2xl text-center">
                    <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-8 h-8 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">{t("checkEmailTitle")}</h2>
                    <p className="text-zinc-400 mb-6">
                        {t("checkEmailDesc")} <span className="text-white font-medium">{email}</span>
                    </p>
                    <p className="text-sm text-zinc-500 mb-8">{t("spamNote")}</p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-primary hover:text-primary-hover transition-colors font-medium"
                    >
                        <ArrowLeft size={18} />
                        {t("backToSignIn")}
                    </Link>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md space-y-8"
        >
            <div className="text-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="inline-block mb-4"
                >
                    <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto">
                        <Mail className="w-8 h-8 text-primary" />
                    </div>
                </motion.div>
                <motion.h1
                    className="text-3xl font-bold tracking-tight text-white mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {t("title")}
                </motion.h1>
                <motion.p
                    className="text-zinc-400 text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    {t("subtitle")}
                </motion.p>
            </div>

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 text-sm"
                    >
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-2xl shadow-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300 ml-1">{t("emailAddress")}</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (error) setError(null);
                                }}
                                className="input-field pl-11"
                                placeholder="name@example.com"
                            />
                        </div>
                        <p className="text-xs text-zinc-500 ml-1 mt-2">{t("emailHint")}</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <ButtonSpinner />
                                {t("sending")}
                            </div>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                {t("sendResetLink")}
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={16} />
                        {t("backToSignIn")}
                    </Link>
                </div>
            </div>

            <p className="text-center text-xs text-zinc-500 px-8">
                {t("rememberPassword")}{" "}
                <Link href="/login" className="text-primary hover:text-primary-hover transition-colors">
                    {t("signInHere")}
                </Link>
            </p>
        </motion.div>
    );
}
