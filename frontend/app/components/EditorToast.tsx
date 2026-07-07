'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { ToastState } from '../hooks/useToast';

export default function EditorToast({ toast }: { toast: ToastState | null }) {
    return (
        <AnimatePresence>
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-900 border border-white/10 px-4.5 py-3 rounded-xl shadow-2xl max-w-sm"
                >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
                    <span className="text-xs font-bold text-zinc-200">{toast.message}</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
