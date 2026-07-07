"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Calendar, ArrowRight, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import client from "../../api/client";
import AuthCard from "../../components/auth/AuthCard";
import AlertBanner from "../../components/auth/AlertBanner";
import FormField from "../../components/auth/FormField";
import { getErrorMessage } from "../../lib/getErrorMessage";

export default function RegisterPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const t = useTranslations("register");

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        birth_date: "",
        password: "",
        confirm_password: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.type === 'date' ? 'birth_date' : e.target.type === 'email' ? 'email' : e.target.type === 'text' ? 'full_name' : e.target.name]: e.target.value
        });
        if (e.target.name) {
            setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        }
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (formData.password !== formData.confirm_password) {
            setError(t("passwordMismatch"));
            setLoading(false);
            return;
        }

        if (formData.password.length < 8) {
            setError(t("passwordTooShort"));
            setLoading(false);
            return;
        }

        if (!formData.birth_date) {
            setError(t("birthDateRequired"));
            setLoading(false);
            return;
        }

        try {
            const payload = {
                email: formData.email,
                password: formData.password,
                password_confirm: formData.confirm_password,
                full_name: formData.full_name,
                birth_date: formData.birth_date
            };

            await client.post("/api/v1/auth/register", payload);
            router.push("/login?registered=true");

        } catch (err: unknown) {
            console.error("Register Error:", err);
            setError(getErrorMessage(err, t("registrationFailed")));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthCard
            subtitle={t("subtitle")}
            cardClassName="p-6"
            banner={<AlertBanner variant="error" message={error} />}
            footer={
                <p className="text-center text-xs text-zinc-500 px-8">
                    {t("termsText")}{" "}
                    <Link href="/legal/terms" className="underline hover:text-zinc-300">{t("termsOfService")}</Link>{" "}
                    {t("and")}{" "}
                    <Link href="/legal/privacy" className="underline hover:text-zinc-300">{t("privacyPolicy")}</Link>.
                </p>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormField
                    label={t("fullName")}
                    icon={User}
                    name="full_name"
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="John Doe"
                />

                <FormField
                    label={t("email")}
                    icon={Mail}
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                />

                <FormField
                    label={t("birthDate")}
                    icon={Calendar}
                    name="birth_date"
                    type="date"
                    required
                    value={formData.birth_date}
                    onChange={handleChange}
                    className="appearance-none"
                    style={{ colorScheme: 'dark' }}
                />

                <FormField
                    label={t("password")}
                    icon={Lock}
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                />

                <FormField
                    label={t("confirmPassword")}
                    icon={CheckCircle2}
                    name="confirm_password"
                    type="password"
                    required
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="••••••••"
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {t("creatingAccount")}
                        </div>
                    ) : (
                        <>
                            {t("createAccount")}
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
                        <span className="bg-zinc-900 px-2 text-zinc-500">{t("alreadyHaveAccount")}</span>
                    </div>
                </div>

                <div className="mt-6">
                    <Link
                        href="/login"
                        className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98]"
                    >
                        {t("signBackIn")}
                    </Link>
                </div>
            </div>
        </AuthCard>
    );
}
