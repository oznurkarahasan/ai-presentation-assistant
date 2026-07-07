"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import client from "../../api/client";
import { useTranslations } from "next-intl";
import { ButtonSpinner } from "../../components/Spinner";
import { getErrorMessage } from "../../lib/getErrorMessage";

export default function ResetPasswordPage() {
    const t = useTranslations("resetPassword");
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        new_password: "",
        new_password_confirm: ""
    });

    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const tokenParam = searchParams.get("token");
        if (!tokenParam) {
            setError(t("errors.tokenMissing"));
        } else {
            setToken(tokenParam);
        }
    }, [searchParams, t]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!token) {
            setError(t("errors.tokenMissingShort"));
            return;
        }

        if (formData.new_password !== formData.new_password_confirm) {
            setError(t("errors.passwordMismatch"));
            return;
        }

        if (formData.new_password.length < 8) {
            setError(t("errors.passwordTooShort"));
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await client.post("/api/v1/auth/reset-password", {
                token,
                new_password: formData.new_password,
                new_password_confirm: formData.new_password_confirm
            });

            setSuccess(true);
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (err: unknown) {
            console.error("Reset Password Error:", err);
            setError(getErrorMessage(err, t("errors.resetFailed")));
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
                    <h2 className="text-2xl font-bold text-white mb-3">{t("success.title")}</h2>
                    <p className="text-zinc-400 mb-8">
                        {t("success.body")}
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-primary hover:text-primary-hover transition-colors font-medium"
                    >
                        <ArrowRight size={18} />
                        {t("success.action")}
                    </Link>
                </div>
            </motion.div>
        );
    }

    if (!token) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md"
            >
                <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-2xl shadow-2xl text-center">
                    <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">{t("invalidLink.title")}</h2>
                    <p className="text-zinc-400 mb-8">
                        {t("invalidLink.body")}
                    </p>
                    <Link
                        href="/forgot-password"
                        className="inline-flex items-center gap-2 text-primary hover:text-primary-hover transition-colors font-medium"
                    >
                        <ArrowRight size={18} />
                        {t("invalidLink.action")}
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
            className="w-full max-w-md space-y-6"
        >
            <div className="text-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="inline-block mb-4"
                >
                    <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto">
                        <Lock className="w-8 h-8 text-primary" />
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
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-start gap-3"
                    >
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <span className="text-red-400 text-sm">{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-2"
                >
                    <label htmlFor="new_password" className="block text-sm font-medium text-zinc-300">
                        {t("form.newPassword")}
                    </label>
                    <div className="relative">
                        <input
                            id="new_password"
                            name="new_password"
                            type={showPassword ? "text" : "password"}
                            value={formData.new_password}
                            onChange={handleChange}
                            placeholder={t("form.newPasswordPlaceholder")}
                            className="w-full px-4 py-3 pr-10 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-400 transition-colors"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-2"
                >
                    <label htmlFor="new_password_confirm" className="block text-sm font-medium text-zinc-300">
                        {t("form.confirmPassword")}
                    </label>
                    <div className="relative">
                        <input
                            id="new_password_confirm"
                            name="new_password_confirm"
                            type={showConfirmPassword ? "text" : "password"}
                            value={formData.new_password_confirm}
                            onChange={handleChange}
                            placeholder={t("form.confirmPasswordPlaceholder")}
                            className="w-full px-4 py-3 pr-10 bg-zinc-900/50 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-400 transition-colors"
                        >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </motion.div>

                <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-primary to-primary-hover text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <ButtonSpinner />
                            {t("form.resetting")}
                        </>
                    ) : (
                        <>
                            <Lock size={18} />
                            {t("form.submit")}
                        </>
                    )}
                </motion.button>
            </form>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-center"
            >
                <p className="text-zinc-400 text-sm">
                    {t("footer.prompt")} {" "}
                    <Link href="/login" className="text-primary hover:text-primary-hover transition-colors font-medium">
                        {t("footer.action")}
                    </Link>
                </p>
            </motion.div>
        </motion.div>
    );
}
