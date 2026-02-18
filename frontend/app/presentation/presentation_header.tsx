"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, Maximize } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePresentation } from "./presentation_context";

const PresentationHeader = () => {
    const router = useRouter();
    const {
        isFullscreen,
        presentationTitle,
        elapsedTime,
        toggleFullscreen
    } = usePresentation();

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <AnimatePresence>
            {!isFullscreen && (
                <motion.header
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5 px-6 py-4"
                >
                    <div className="max-w-[1800px] mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => router.back()}
                                className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full transition-all border border-transparent hover:border-white/10"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <div className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-[9px] font-black text-primary uppercase tracking-widest">
                                        Live Mode
                                    </div>
                                    <h1 className="text-sm md:text-base font-black tracking-tight italic uppercase max-w-[200px] truncate">
                                        {presentationTitle}
                                    </h1>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            <div className="hidden md:flex flex-col items-end">
                                <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Elapsed Time</p>
                                <div className="flex items-center gap-2 text-white font-mono text-lg tracking-tighter">
                                    <Clock size={16} className="text-primary" />
                                    {formatTime(elapsedTime)}
                                </div>
                            </div>
                            <div className="h-8 w-[1px] bg-white/5 rounded-full" />
                            <button
                                onClick={toggleFullscreen}
                                className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full transition-all border border-transparent hover:border-white/10"
                            >
                                <Maximize size={18} />
                            </button>
                        </div>
                    </div>
                </motion.header>
            )}
        </AnimatePresence>
    );
};

export default PresentationHeader;
