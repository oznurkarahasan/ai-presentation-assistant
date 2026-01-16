"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Calendar, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import client from "../../api/client";

export default function RegisterPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

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
             setFormData(prev => ({...prev, [e.target.name]: e.target.value}));
        }
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (formData.password !== formData.confirm_password) {
            setError("Passwords do not match!");
            setLoading(false);
            return;
        }

        if (formData.password.length < 8) {
            setError("Password must be at least 8 characters.");
            setLoading(false);
            return;
        }

        if (!formData.birth_date) {
            setError("Birth date is required.");
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

        } catch (err: any) {
            console.error("Register Error:", err);
            const message = err.response?.data?.detail || "Registration failed. Please try again.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md space-y-8 my-8"
        >
            <div className="text-center">
                <motion.h1
                    className="text-4xl font-bold tracking-tight text-white mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    PreCue<span className="text-primary">.ai</span>
                </motion.h1>
                <motion.p
                    className="text-zinc-400 text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    Join us and master your preparation today
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
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300 ml-1">Full Name</label>
                        <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                            <input
                                name="full_name"
                                type="text"
                                required
                                value={formData.full_name}
                                onChange={handleChange}
                                className="input-field pl-11"
                                placeholder="John Doe"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300 ml-1">Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                            <input
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="input-field pl-11"
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300 ml-1">Birth Date</label>
                        <div className="relative group">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                            <input
                                name="birth_date"
                                type="date"
                                required
                                value={formData.birth_date}
                                onChange={handleChange}
                                className="input-field pl-11 appearance-none"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300 ml-1">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                            <input
                                name="password"
                                type="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="input-field pl-11"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300 ml-1">Confirm Password</label>
                        <div className="relative group">
                            <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                            <input
                                name="confirm_password"
                                type="password"
                                required
                                value={formData.confirm_password}
                                onChange={handleChange}
                                className="input-field pl-11"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Creating Account...
                            </div>
                        ) : (
                            <>
                                Create Account
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-zinc-800"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-zinc-900 px-2 text-zinc-500">Already have an account?</span>
                        </div>
                    </div>

                    <div className="mt-6">
                        <Link
                            href="/login"
                            className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all active:scale-[0.98]"
                        >
                            Sign back in
                        </Link>
                    </div>
                </div>
            </div>

            <p className="text-center text-xs text-zinc-500 px-8">
                By clicking continue, you agree to our{" "}
                <Link href="/terms" className="underline hover:text-zinc-300">Terms of Service</Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline hover:text-zinc-300">Privacy Policy</Link>.
            </p>
        </motion.div>
    );
}