"use client";

import { motion } from "framer-motion";
import { Mic, MicOff, Minimize } from "lucide-react";
import { usePresentation } from "./PresentationContext";

const PresentationControls = () => {
    const {
        isStarted,
        isAudioActive,
        isFullscreen,
        currentSlide,
        slideCount,
        setIsAudioActive,
        setIsStarted,
        toggleFullscreen
    } = usePresentation();

    if (!isStarted) return null;

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={`fixed bottom-0 left-0 right-0 z-50 p-6 flex justify-center transition-all duration-500 ${isFullscreen ? 'bg-gradient-to-t from-black via-black/80 to-transparent' : 'bg-black/60 backdrop-blur-xl border-t border-white/5'}`}
        >
            <div className="max-w-4xl w-full flex items-center justify-between gap-6">
                <div className="flex items-center gap-4 bg-zinc-900/50 p-2 rounded-2xl border border-white/5">
                    <button
                        onClick={() => setIsAudioActive(!isAudioActive)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isAudioActive ? 'bg-green-500/20 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/10'}`}
                    >
                        {isAudioActive ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>
                    <div className="pr-4 hidden sm:block">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Listener</p>
                        <p className={`text-[9px] font-bold uppercase tracking-widest ${isAudioActive ? 'text-green-500/70' : 'text-red-500/70'}`}>
                            {isAudioActive ? 'Capturing Voice' : 'Standby Mode'}
                        </p>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Active Slide</p>
                            <p className="text-xs font-bold text-white uppercase tracking-tighter">Navigation Deck</p>
                        </div>
                        <div className="bg-white text-black font-black italic px-5 py-2 rounded-xl text-xl min-w-[60px] text-center shadow-xl">
                            {currentSlide}
                        </div>
                        <div className="text-zinc-600 font-black italic text-xl">/</div>
                        <div className="text-zinc-500 font-black italic text-xl">{slideCount}</div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setIsStarted(false);
                            setIsAudioActive(false);
                        }}
                        className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-black uppercase italic tracking-widest transition-all text-xs border border-white/5"
                    >
                        Pause
                    </button>
                    {isFullscreen && (
                        <button
                            onClick={toggleFullscreen}
                            className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all border border-white/5"
                        >
                            <Minimize size={20} />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default PresentationControls;
