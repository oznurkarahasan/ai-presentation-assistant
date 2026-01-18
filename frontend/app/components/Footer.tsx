import Link from "next/link";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";

export default function Footer() {
    return (
        <footer className="border-t border-zinc-800 bg-black/50 backdrop-blur-xl mt-auto">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                P
                            </div>
                            <span className="font-bold text-lg">
                                PreCue<span className="text-primary">.ai</span>
                            </span>
                        </div>
                        <p className="text-zinc-400 text-sm">
                            Master your presentations with AI-powered voice control and analytics.
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
                        <h3 className="font-semibold text-white mb-4">Product</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/#features" className="text-zinc-400 hover:text-white transition-colors text-sm">
                                    Features
                                </Link>
                            </li>
                            <li>
                                <Link href="/#pricing" className="text-zinc-400 hover:text-white transition-colors text-sm">
                                    Pricing
                                </Link>
                            </li>
                            <li>
                                <Link href="/dashboard" className="text-zinc-400 hover:text-white transition-colors text-sm">
                                    Demo
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-white mb-4">Company</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/#about" className="text-zinc-400 hover:text-white transition-colors text-sm">
                                    About
                                </Link>
                            </li>
                            <li>
                                <Link href="/blog" className="text-zinc-400 hover:text-white transition-colors text-sm">
                                    Blog
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="text-zinc-400 hover:text-white transition-colors text-sm">
                                    Contact
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-white mb-4">Legal</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link href="/privacy" className="text-zinc-400 hover:text-white transition-colors text-sm">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="text-zinc-400 hover:text-white transition-colors text-sm">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="/cookies" className="text-zinc-400 hover:text-white transition-colors text-sm">
                                    Cookie Policy
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-zinc-500 text-sm">
                        © {new Date().getFullYear()} PreCue.ai. All rights reserved.
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
