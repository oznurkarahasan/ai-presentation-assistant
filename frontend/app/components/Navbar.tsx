"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";

import Image from "next/image";

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navLinks = [
        { name: "Home", href: "/", hasDot: true },
        { name: "Enterprise", href: "/#features" },
        { name: "Pricing", href: "/#pricing" },
        { name: "Customers", href: "/#customers" },
    ];

    const secondaryLinks = [
        { name: "About us", href: "/#about", hasArrow: true },
        { name: "Careers", href: "/#careers", hasArrow: true },
        { name: "Blog", href: "/#blog", hasArrow: true },
        { name: "Contact", href: "/#contact", hasArrow: true },
        { name: "Docs", href: "/#docs", hasArrow: true },
    ];

    return (
        <div className="fixed top-0 left-0 right-0 z-50 px-6 py-8 pointer-events-none">
            <nav className="max-w-[1600px] mx-auto bg-[#0a0a0c]/60 backdrop-blur-xl border border-white/10 rounded-[24px] pointer-events-auto shadow-2xl overflow-hidden">
                <div className="px-6 lg:px-12">
                    <div className="flex justify-between items-center h-[64px]">
                        {/* Left Section: Logo & Main Links */}
                        <div className="flex items-center gap-14">
                            <Link href="/" className="flex items-center gap-3 group shrink-0">
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
                                <span className="font-bold text-xl tracking-tight hidden sm:block text-white/90">
                                    PreCue<span className="text-primary">.ai</span>
                                </span>
                            </Link>

                            <div className="hidden lg:flex items-center gap-8">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className="flex items-center gap-1.5 text-[13px] font-medium text-secondary-text hover:text-white transition-all duration-200"
                                    >
                                        {link.hasDot && <span className="w-1 h-1 bg-white rounded-full shadow-[0_0_5px_white]" />}
                                        <span className={link.hasDot ? "text-white" : ""}>{link.name}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Right Section: Secondary Links & Actions */}
                        <div className="flex items-center gap-4 lg:gap-14">
                            <div className="hidden xl:flex items-center gap-8">
                                {secondaryLinks.map((link) => (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className="flex items-center gap-0.5 text-[13px] font-medium text-secondary-text hover:text-white transition-all duration-200 group"
                                    >
                                        {link.name}
                                        {link.hasArrow && (
                                            <ArrowUpRight size={13} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                                        )}
                                    </Link>
                                ))}
                            </div>

                            <div className="flex items-center gap-5 lg:gap-10 border-l border-white/5 pl-5 lg:pl-10 ml-0 lg:ml-2">
                                <Link
                                    href="/login"
                                    className="hidden md:flex items-center gap-0.5 text-[13px] font-medium text-secondary-text hover:text-white transition-all duration-200 group"
                                >
                                    Login
                                    <ArrowUpRight size={13} className="opacity-40 group-hover:opacity-100 transition-all" />
                                </Link>
                                <Link
                                    href="/register"
                                    className="bg-primary hover:bg-primary-hover text-primary-foreground px-6 py-2 rounded-[14px] text-[13px] font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.1)]"
                                >
                                    Get started
                                </Link>

                                <button
                                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                    className="lg:hidden text-zinc-400 hover:text-white transition-colors p-1"
                                >
                                    {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="lg:hidden bg-[#0a0a0c]/95 border-t border-white/5 overflow-hidden p-6 space-y-6 animate-in slide-in-from-top duration-300">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Product</p>
                                <div className="flex flex-col gap-3">
                                    {navLinks.map((link) => (
                                        <Link
                                            key={link.name}
                                            href={link.href}
                                            className="text-[15px] text-zinc-300 hover:text-white transition-colors"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            {link.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4 border-l border-white/5 pl-8">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Company</p>
                                <div className="flex flex-col gap-3">
                                    {secondaryLinks.map((link) => (
                                        <Link
                                            key={link.name}
                                            href={link.href}
                                            className="text-[15px] text-zinc-400 hover:text-white transition-colors"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            {link.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="pt-6 border-t border-white/5 flex flex-col gap-3">
                            <Link
                                href="/login"
                                className="block w-full py-3 text-center text-zinc-400 hover:text-white font-medium border border-white/5 rounded-xl transition-all"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Login
                            </Link>
                            <Link
                                href="/register"
                                className="block w-full bg-[#d2e2f0] text-zinc-950 py-3 rounded-xl text-center font-bold transition-all shadow-lg"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                )}
            </nav>
        </div>
    );
}
