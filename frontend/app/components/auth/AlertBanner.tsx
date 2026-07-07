'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, type LucideIcon } from 'lucide-react';

type AlertVariant = 'success' | 'error';

const VARIANT_STYLES: Record<AlertVariant, string> = {
    success: 'bg-green-500/10 border-green-500/20 text-green-400',
    error: 'bg-red-500/10 border-red-500/20 text-red-400',
};

const VARIANT_ICONS: Record<AlertVariant, LucideIcon> = {
    success: CheckCircle2,
    error: AlertCircle,
};

interface AlertBannerProps {
    variant: AlertVariant;
    message: string | null | false;
}

export default function AlertBanner({ variant, message }: AlertBannerProps) {
    const Icon = VARIANT_ICONS[variant];

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className={`border p-4 rounded-xl flex items-center gap-3 text-sm ${VARIANT_STYLES[variant]}`}
                >
                    <Icon className="w-5 h-5 shrink-0" />
                    {message}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
