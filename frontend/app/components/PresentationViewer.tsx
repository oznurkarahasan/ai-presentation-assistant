'use client';

import { FileText, Presentation, ChevronRight, Layout } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useState } from "react";


interface PresentationViewerProps {
    fileUrl: string | null;
    fileType: string | null;
    title: string;
    currentPage: number;
    totalPages: number;
    isLoading: boolean;
    onPageChange: (page: number) => void;
    showControls?: boolean;
    isFullScreen?: boolean;
    initialOrientation?: 'landscape' | 'portrait';
}

export default function PresentationViewer({
    fileUrl,
    fileType,
    title,
    currentPage,
    totalPages,
    isLoading,
    onPageChange,
    showControls = true,
    isFullScreen = false,
    initialOrientation = 'landscape'
}: PresentationViewerProps) {
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>(initialOrientation);

    const toggleOrientation = useCallback(() => {
        setOrientation((prev: 'landscape' | 'portrait') => prev === 'landscape' ? 'portrait' : 'landscape');
    }, []);


    const handleNextPage = useCallback(() => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    }, [currentPage, totalPages, onPageChange]);

    const handlePrevPage = useCallback(() => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    }, [currentPage, onPageChange]);

    return (
        <div className={`relative flex items-center justify-center group ${isFullScreen ? 'w-full h-full rounded-none' : 'rounded-2xl'} overflow-hidden border border-white/5 shadow-2xl bg-zinc-900/50 transition-all duration-500 ${orientation === 'landscape' ? 'w-full aspect-[16/9]' : 'h-full aspect-[0.707] mx-auto overflow-y-auto'
            }`}>

            {fileUrl ? (
                fileType === 'pdf' ? (
                    <div className="w-full h-full relative flex items-center justify-center">
                        <div className="relative w-full h-full max-w-full overflow-hidden">
                            <iframe
                                key={`${currentPage}-${orientation}`}
                                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/${fileUrl}#page=${currentPage}&view=${orientation === 'landscape' ? 'FitH' : 'Fit'}&toolbar=0&navpanes=0&scrollbar=0`}
                                className="w-full h-full border-none pointer-events-none scale-[1.01]"
                                title="Presentation Preview"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            />

                            {/* Mask built-in PDF toolbar area */}
                            <div className="pointer-events-none absolute top-0 left-0 right-0 h-10 bg-[#050505]" />
                        </div>

                        {/* Solid Smooth Loading Overlay */}
                        <AnimatePresence mode="wait">
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-[#050505] flex flex-col items-center justify-center gap-4 z-50 px-8 text-center"
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 border-2 border-white/5 rounded-full" />
                                        <div className="absolute inset-0 w-12 h-12 border-t-2 border-primary rounded-full animate-spin" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.3em] animate-pulse">Synchronizing</p>
                                        <p className="text-xs text-zinc-600 font-mono italic">Slide {currentPage} / {totalPages}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="absolute inset-0 pointer-events-none" />

                        {/* Manual controls footer */}
                        {showControls && (
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/40 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] scale-90 md:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 hover:border-primary/30">
                                <button
                                    onClick={handlePrevPage}
                                    disabled={currentPage <= 1 || isLoading}
                                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-primary hover:text-white transition-all text-zinc-400 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-zinc-400 active:scale-90"
                                    title="Previous Slide (←)"
                                >
                                    <ChevronRight className="rotate-180" size={22} />
                                </button>

                                <div className="px-6 flex flex-col items-center justify-center min-w-[120px]">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-0.5">Slide</span>
                                    <div className="flex items-center gap-2 font-mono text-sm font-bold">
                                        <span className="text-primary">{currentPage.toString().padStart(2, '0')}</span>
                                        <span className="text-zinc-700">/</span>
                                        <span className="text-zinc-400">{totalPages.toString().padStart(2, '0')}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage >= totalPages || isLoading}
                                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-primary hover:text-white transition-all text-zinc-400 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-zinc-400 active:scale-90"
                                    title="Next Slide (→)"
                                >
                                    <ChevronRight size={22} />
                                </button>

                                <div className="h-8 w-[1px] bg-white/10 mx-1" />

                                <button
                                    onClick={toggleOrientation}
                                    className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${orientation === 'portrait' ? 'bg-primary text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
                                    title={`Switch to ${orientation === 'landscape' ? 'Portrait' : 'Landscape'}`}
                                >
                                    <Layout size={18} className={orientation === 'landscape' ? 'rotate-90' : ''} />
                                </button>
                            </div>
                        )}
                    </div>

                ) : (
                    <div className="relative z-10 w-full max-w-3xl aspect-[16/9] bg-white rounded-sm shadow-[0_0_100px_rgba(255,255,255,0.05)] overflow-hidden">
                        <div className="p-12 h-full flex flex-col text-black font-sans">
                            <div className="flex justify-between items-start mb-12">
                                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">P</div>
                                <div className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">PowerPoint Preview</div>
                            </div>
                            <h3 className="text-5xl font-black italic uppercase tracking-tighter leading-none mb-6">{title}</h3>
                            <div className="h-1 w-24 bg-primary mb-8" />
                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 rounded-2xl bg-zinc-50/50">
                                <Presentation size={64} className="text-zinc-200 mb-4" />
                                <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs text-center px-8">
                                    PPTX Viewer is coming soon. Use &quot;Real-Time&quot; mode for live presentation controls.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                <div className="absolute inset-0 bg-zinc-800 animate-pulse flex items-center justify-center opacity-10">
                    <FileText size={120} />
                </div>
            )}
        </div>
    );
}
