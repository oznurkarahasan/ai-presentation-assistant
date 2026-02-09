"use client";

import { motion } from "framer-motion";
import { usePresentation } from "./PresentationContext";

const TranscriptPanel = () => {
    const { isStarted, transcript } = usePresentation();

    if (!isStarted) return null;

    const transcriptLines = transcript.split('.').filter(t => t.trim().length > 0);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden md:flex flex-col w-[350px] h-full py-2 gap-4"
        >
            <div className="flex-1 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 flex flex-col gap-4 overflow-hidden relative">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Live Transcript</p>
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                </div>
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-none flex flex-col-reverse gap-3">
                    <div className="space-y-4">
                        {transcriptLines.map((text, i) => (
                            <motion.p
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`text-xs leading-relaxed ${i === transcriptLines.length - 1 ? 'text-white font-bold' : 'text-zinc-500'}`}
                            >
                                {text.trim()}.
                            </motion.p>
                        ))}
                        {transcript === "" && (
                            <p className="text-zinc-600 text-[10px] italic font-medium">Start speaking to see the transcript...</p>
                        )}
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-zinc-900/80 to-transparent pointer-events-none" />
            </div>
        </motion.div>
    );
};

export default TranscriptPanel;
