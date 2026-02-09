"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { usePresentation } from "./PresentationContext";

const PresentationHero = () => {
    const { isStarted, setIsStarted, setIsAudioActive } = usePresentation();

    if (isStarted) return null;

    const handleStart = () => {
        setIsStarted(true);
        setIsAudioActive(true);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4"
        >
            <div className="w-full max-w-lg bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/5 rounded-[3rem] p-12 flex flex-col items-center text-center shadow-[0_0_100px_rgba(234,88,12,0.15)] relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center border border-primary/20 shadow-2xl mb-8 relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                    <Play className="text-primary relative z-10 fill-primary ml-1" size={36} />
                </div>

                <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white mb-4">Ready for <span className="text-primary italic">Stage</span></h2>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] leading-relaxed mb-10 max-w-xs">
                    Once started, the AI will listen for your cues and sync slides in real-time.
                </p>

                <button
                    onClick={handleStart}
                    className="bg-primary hover:bg-primary-hover text-white px-12 py-5 rounded-[1.25rem] font-black transition-all active:scale-95 shadow-[0_0_30px_rgba(234,88,12,0.4)] text-lg uppercase tracking-tighter"
                >
                    Launch Session
                </button>
            </div>
        </motion.div>
    );
};

export default PresentationHero;
