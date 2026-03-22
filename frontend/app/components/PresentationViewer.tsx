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
    isFullScreen = false,
    initialOrientation = 'landscape',
    aspectRatio = null
}: PresentationViewerProps) {
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>(initialOrientation);
    const [zoom, setZoom] = useState<number | null>(null); // null means "Fit"
    const [pageInputValue, setPageInputValue] = useState(currentPage.toString());

    useEffect(() => {
        setOrientation(initialOrientation);
    }, [initialOrientation]);

    useEffect(() => {
        setPageInputValue(currentPage.toString());
    }, [currentPage]);

    const handleZoomIn = () => {
        if (zoom === null) setZoom(120);
        else setZoom(prev => Math.min((prev || 100) + 20, 300));
    };

    const handleZoomOut = () => {
        if (zoom === null) return;
        const nextZoom = (zoom || 100) - 20;
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
        const fragments = `#page=${currentPage}&view=Fit&toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0`;
        return `${baseUrl}${fragments}`;
    };

    // Portrait + zoomed → switch to landscape display for better viewing
    const displayAsLandscape = orientation === 'landscape' || (orientation === 'portrait' && zoom !== null);

    // Use provided aspectRatio or fallback based on effective orientation
    const effectiveRatio = displayAsLandscape
        ? (aspectRatio && aspectRatio >= 1 ? aspectRatio : 1.777)
        : (aspectRatio || 0.707);

    // containerStyle ensures the viewer maintains its aspect ratio while fitting within its parent
    const containerStyle: React.CSSProperties = {
        aspectRatio: `${effectiveRatio}`,
        height: !displayAsLandscape ? '100%' : 'auto',
        width: displayAsLandscape ? '100%' : 'auto',
        maxWidth: '100%',
        maxHeight: '100%',
    };

    return (
        <div
            style={containerStyle}
            className={`relative flex items-center justify-center group ${isFullScreen ? 'rounded-none' : 'rounded-2xl'} overflow-hidden border border-white/5 shadow-2xl bg-[#0a0a0a] transition-all duration-300 mx-auto`}
        >
            {fileUrl ? (
                fileType === 'pdf' ? (
                    <div className="absolute inset-0 w-full h-full flex flex-col overflow-hidden">

                        {/* Custom toolbar */}
                        <div className="flex-none h-10 bg-[#050505] z-50 border-b border-white/5 flex items-center justify-between px-4">
                            {/* Left: Zoom Controls */}
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
                                    title="Reset to Fit"
                                >
                                    {zoom ? `${zoom}%` : 'FIT'}
                                </button>
                                <button onClick={handleZoomIn} className="p-1 hover:bg-white/10 rounded-md transition-colors text-zinc-400">
                                    <Plus size={14} />
                                </button>
                            </div>

                            {/* Right: Page Navigation */}
                            <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10">
                                <button
                                    onClick={handlePrevPage}
                                    disabled={currentPage <= 1 || isLoading}
                                    className="p-1 hover:bg-white/10 rounded-md transition-colors text-zinc-400 disabled:opacity-20"
                                    title="Previous Slide"
                                >
                                    <ChevronRight className="rotate-180" size={14} />
                                </button>
                                <div className="h-4 w-[1px] bg-white/10 mx-1" />
                                <form onSubmit={handlePageSubmit} className="flex items-center gap-1.5 px-2">
                                    <input
                                        type="text"
                                        value={pageInputValue}
                                        onChange={(e) => setPageInputValue(e.target.value)}
                                        className="w-6 bg-transparent text-[10px] text-center font-bold text-white outline-none"
                                    />
                                    <span className="text-[10px] text-zinc-500 font-bold">/ {totalPages}</span>
                                </form>
                                <div className="h-4 w-[1px] bg-white/10 mx-1" />
                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage >= totalPages || isLoading}
                                    className="p-1 hover:bg-white/10 rounded-md transition-colors text-zinc-400 disabled:opacity-20"
                                    title="Next Slide"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Page Viewport */}
                        <div
                            className="flex-1 relative select-none overflow-auto"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
                        >
                            {/*
                              Scale container: overflow:hidden clips the browser PDF toolbar.
                              The iframe sits at top:-56px so the ~40px browser toolbar is pushed
                              above the container boundary and hidden. height:calc(100%+76px)
                              fills the gap (56px top + 20px bottom). width:calc(100%+20px)
                              clips the right scrollbar.
                            */}
                            <div
                                style={{
                                    position: 'relative',
                                    width: zoom ? `${zoom}%` : '100%',
                                    height: zoom ? `${zoom}%` : '100%',
                                    overflow: 'hidden',
                                }}
                                className="transition-all duration-200 ease-out"
                            >
                                <iframe
                                    key={`${currentPage}-${displayAsLandscape ? 'landscape' : 'portrait'}`}
                                    src={getIframeSrc()}
                                    className="border-none pointer-events-none absolute"
                                    title="Presentation Preview"
                                    style={{
                                        top: '-56px',
                                        left: 0,
                                        width: 'calc(100% + 20px)',
                                        height: 'calc(100% + 56px)', // Adjusted to exactly match top offset, prevents bottom clipping
                                        display: 'block',
                                    } as React.CSSProperties}
                                />
                            </div>
                        </div>

                        {/* Loading overlay */}
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
