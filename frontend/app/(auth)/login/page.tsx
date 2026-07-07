"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight, Github, Chrome } from "lucide-react";
import { useTranslations } from "next-intl";
import client from "../../api/client";
import AuthCard from "../../components/auth/AuthCard";
import AlertBanner from "../../components/auth/AlertBanner";
import FormField from "../../components/auth/FormField";
import { getErrorMessage } from "../../lib/getErrorMessage";

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const t = useTranslations("login");

    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get("registered")) {
            setShowSuccess(true);
            const timer = setTimeout(() => setShowSuccess(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [searchParams]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const loginData = new URLSearchParams();
            loginData.append('username', formData.email);
            loginData.append('password', formData.password);

            const response = await client.post("/api/v1/auth/login", loginData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const { access_token } = response.data;
            localStorage.setItem("access_token", access_token);
            router.push("/dashboard");

        } catch (err: unknown) {
            console.error("Login Error:", err);
            setError(getErrorMessage(err, t("loginFailed")));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthCard
            subtitle={t("subtitle")}
            banner={
                <>
                    <AlertBanner variant="success" message={showSuccess && t("successMessage")} />
                    <AlertBanner variant="error" message={error} />
                </>
            }
            footer={
                <p className="text-center text-sm text-zinc-500">
                    {t("noAccount")}{" "}
                    <Link
                        href="/register"
                        className="text-primary hover:text-primary-hover font-medium transition-colors"
                    >
                        {t("signUpFree")}
                    </Link>
                </p>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormField
                    label={t("email")}
                    icon={Mail}
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                />

                <FormField
                    label={t("password")}
                    icon={Lock}
                    labelExtra={
                        <Link
                            href="/forgot-password"
                            className="text-xs text-primary hover:text-primary-hover transition-colors"
                        >
                            {t("forgotPassword")}
                        </Link>
                    }
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {t("signingIn")}
                        </div>
                    ) : (
                        <>
                            {t("signIn")}
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-800"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-zinc-900 px-2 text-zinc-500">{t("orContinueWith")}</span>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                    <button className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98]">
                        <Chrome className="w-4 h-4" />
                        Google
                    </button>
                    <button className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98]">
                        <Github className="w-4 h-4" />
                        GitHub
                    </button>
                </div>
            </div>
        </AuthCard>
    );
}
