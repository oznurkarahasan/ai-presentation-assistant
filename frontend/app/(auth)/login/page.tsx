"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ArrowRight, Github, Chrome, CheckCircle2, AlertCircle } from "lucide-react";
import client from "../../api/client";

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            let message = "Login failed. Please check your credentials.";
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosError = err as { response: { data: { detail?: string } } };
                message = axiosError.response?.data?.detail || message;
            }
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
            className="w-full max-w-md space-y-6 my-auto"
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
                    Master the Preparation, Control the Cue
                </motion.p>
            </div>

            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl flex items-center gap-3 text-sm"
                    >
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        Successfully registered! You can now sign in.
                    </motion.div>
                )}

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
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300 ml-1">Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                            <input
                                id="email"
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
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-sm font-medium text-zinc-300">Password</label>
                            <Link
                                href="/forgot-password"
                                className="text-xs text-primary hover:text-primary-hover transition-colors"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                            <input
                                id="password"
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Signing In...
                            </div>
                        ) : (
                            <>
                                Sign In
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
                            <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with</span>
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
            </div>

            <p className="text-center text-sm text-zinc-500">
                Don&apos;t have an account?{" "}
                <Link
                    href="/register"
                    className="text-primary hover:text-primary-hover font-medium transition-colors"
                >
                    Sign up for free
                </Link>
            </p>
        </motion.div>
    );
}