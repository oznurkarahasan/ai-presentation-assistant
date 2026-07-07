'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface AuthCardProps {
    subtitle: string;
    banner?: ReactNode;
    footer?: ReactNode;
    cardClassName?: string;
    children: ReactNode;
}

/** Shared visual skeleton (header + bordered card) for the auth pages —
 * previously copy-pasted near-identically across login and register. */
export default function AuthCard({ subtitle, banner, footer, cardClassName = 'p-8', children }: AuthCardProps) {
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
                    {subtitle}
                </motion.p>
            </div>

            {banner}

            <div className={`bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl ${cardClassName}`}>
                {children}
            </div>

            {footer}
        </motion.div>
    );
}
