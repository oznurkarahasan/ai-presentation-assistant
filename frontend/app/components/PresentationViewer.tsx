'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useState, useEffect } from "react";
import {
    FileText,
    Presentation,
    ChevronRight,
    Plus,
    Minus
} from "lucide-react";

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
    aspectRatio?: number | null;
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
    initialOrientation = 'landscape',
    aspectRatio = null
}: PresentationViewerProps) {
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>(initialOrientation);
    const [zoom, setZoom] = useState<number | null>(null); // null means "Fit Entire Page"
    const [pageInputValue, setPageInputValue] = useState(currentPage.toString());

    useEffect(() => {
        setOrientation(initialOrientation);
    }, [initialOrientation]);

    useEffect(() => {
        setPageInputValue(currentPage.toString());
    }, [currentPage]);

    const handleZoomIn = () => {
        if (zoom === null) setZoom(110);
        else setZoom(prev => Math.min((prev || 100) + 10, 200));
    };

    const handleZoomOut = () => {
        if (zoom === null) return;
        const nextZoom = (zoom || 100) - 10;
        if (nextZoom <= 100) setZoom(null);
        else setZoom(nextZoom);
    };

    const resetZoom = () => setZoom(null);

    const handlePageSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const page = parseInt(pageInputValue);
        if (!isNaN(page) && page >= 1 && page <= totalPages) {
            onPageChange(page);
        } else {
            setPageInputValue(currentPage.toString());
        }
    };

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

    const getIframeSrc = () => {
        const baseUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/${fileUrl}`;
        let fragments = `#page=${currentPage}`;

        if (zoom) {
            fragments += `&zoom=${zoom}`;
        } else {
            fragments += `&view=Fit`;
        }

        fragments += `&toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0`;
        return `${baseUrl}${fragments}`;
    };

    const orientationClass = orientation === 'landscape' ? 'w-full aspect-[16/9]' : 'h-full aspect-[0.707] mx-auto';

    return (
        <div
            style={aspectRatio ? {
                aspectRatio: `${aspectRatio}`,
                height: orientation === 'portrait' ? '100%' : 'auto',
                width: orientation === 'landscape' ? '100%' : 'auto'
            } : {}}
            className={`relative flex items-center justify-center group ${isFullScreen ? 'w-full h-full rounded-none' : 'rounded-2xl'} overflow-hidden border border-white/5 shadow-2xl bg-[#0a0a0a] transition-all duration-500 ${!aspectRatio ? orientationClass : 'mx-auto max-h-full max-w-full'
                }`}
        >
            {fileUrl ? (
                fileType === 'pdf' ? (
                    <div className="absolute inset-0 w-full h-full overflow-hidden">
                        {/* 1. PDF Frame (Fill Exactly) */}
                        <iframe
                            key={`${currentPage}-${orientation}-${zoom}`}
                            src={getIframeSrc()}
                            className="w-full h-full border-none pointer-events-none"
                            title="Presentation Preview"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        />

                        {/* 2. Custom UI Toolbar (Zoom & Page Only) */}
                        <div className="absolute top-0 left-0 right-0 h-10 bg-[#050505] z-30 border-b border-white/5 flex items-center justify-between px-4 pointer-events-auto">
                            {/* Left Side: Zoom & Page Jump */}
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/10">
                                    <button
                                        onClick={handleZoomOut}
                                        disabled={zoom === null}
                                        className="p-1 hover:bg-white/10 rounded-md transition-colors text-zinc-400 disabled:opacity-20"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <button
                                        onClick={resetZoom}
                                        className="text-[10px] font-mono font-bold text-zinc-300 w-12 text-center hover:bg-white/5 rounded py-0.5 transition-colors"
                                        title="Click to reset (Fit Page)"
                                    >
                                        {zoom ? `${zoom}%` : 'FIT'}
                                    </button>
                                    <button onClick={handleZoomIn} className="p-1 hover:bg-white/10 rounded-md transition-colors text-zinc-400">
                                        <Plus size={14} />
                                    </button>
                                </div>

                                <form onSubmit={handlePageSubmit} className="flex items-center gap-2 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                                    <input
                                        type="text"
                                        value={pageInputValue}
                                        onChange={(e) => setPageInputValue(e.target.value)}
                                        className="w-8 h-6 bg-transparent text-[10px] text-center font-bold text-white outline-none"
                                    />
                                    <span className="text-[10px] text-zinc-500 font-bold">/ {totalPages}</span>
                                </form>
                            </div>

                            {/* Right Side Empty */}
                            <div className="flex items-center">
                                {/* Search removed as requested */}
                            </div>
                        </div>

                        {/* Solid Loading Overlay */}
                        <AnimatePresence mode="wait">
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-[#050505] flex items-center justify-center z-40"
                                >
                                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Hover-based Navigation Controls */}
                        {showControls && (
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/40 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl shadow-2xl scale-90 md:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 hover:border-primary/30">
                                <button
                                    onClick={handlePrevPage}
                                    disabled={currentPage <= 1 || isLoading}
                                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-primary hover:text-white transition-all text-zinc-400 disabled:opacity-20 active:scale-90"
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
                                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-primary hover:text-white transition-all text-zinc-400 disabled:opacity-20 active:scale-90"
                                >
                                    <ChevronRight size={22} />
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="relative z-10 w-full max-w-3xl aspect-[16/9] bg-white rounded-sm shadow-2xl overflow-hidden">
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
