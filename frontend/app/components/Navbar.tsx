"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-zinc-800">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform">
                            AI
                        </div>
                        <span className="font-bold text-lg">
                            Driven<span className="text-primary"> Assistant</span>
                        </span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8">
                        <Link href="/#features" className="text-zinc-400 hover:text-white transition-colors text-sm">
                            Features
                        </Link>
                        <Link href="/#pricing" className="text-zinc-400 hover:text-white transition-colors text-sm">
                            Pricing
                        </Link>
                        <Link href="/#about" className="text-zinc-400 hover:text-white transition-colors text-sm">
                            About
                        </Link>
                        <div className="h-6 w-px bg-zinc-800" />
                        <Link href="/login" className="text-zinc-400 hover:text-white transition-colors text-sm">
                            Sign In
                        </Link>
                        <Link
                            href="/register"
                            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95"
                        >
                            Get Started
                        </Link>
                    </div>

                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden text-zinc-400 hover:text-white transition-colors"
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {mobileMenuOpen && (
                <div className="md:hidden border-t border-zinc-800 bg-black/95 backdrop-blur-xl">
                    <div className="container mx-auto px-4 py-4 space-y-3">
                        <Link
                            href="/#features"
                            className="block text-zinc-400 hover:text-white transition-colors py-2"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Features
                        </Link>
                        <Link
                            href="/#pricing"
                            className="block text-zinc-400 hover:text-white transition-colors py-2"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Pricing
                        </Link>
                        <Link
                            href="/#about"
                            className="block text-zinc-400 hover:text-white transition-colors py-2"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            About
                        </Link>
                        <div className="h-px bg-zinc-800 my-2" />
                        <Link
                            href="/login"
                            className="block text-zinc-400 hover:text-white transition-colors py-2"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/register"
                            className="block bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-center font-medium transition-all"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
