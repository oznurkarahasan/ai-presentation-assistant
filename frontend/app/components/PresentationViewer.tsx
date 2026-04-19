'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useState, useEffect, useRef } from "react";
import {
    FileText,
    Presentation,
    ChevronRight,
    Plus,
    Minus
} from "lucide-react";

type RegionType = 'TOP_LEFT' | 'TOP_RIGHT' | 'CENTER' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT';

type RegionCoord = {
    x: number;
    y: number;
    minZoom?: number;
};

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
    zoomCommand?: {
        action: 'ZOOM_IN' | 'ZOOM_OUT' | 'RESET_ZOOM';
        sequence: number;
    } | null;
    regionCommand?: {
        region: RegionType;
        sequence: number;
    } | null;
    focusCommand?: {
        coord: RegionCoord;
        sequence: number;
    } | null;
    regionMapping?: Partial<Record<number, Partial<Record<RegionType, RegionCoord>>>>;
    enableCoordinatePick?: boolean;
    onCoordinatePick?: (coord: RegionCoord) => void;
}
const REGION_DEFAULTS: Record<RegionType, RegionCoord> = {
    TOP_LEFT: { x: 0.18, y: 0.18, minZoom: 180 },
    TOP_RIGHT: { x: 0.82, y: 0.18, minZoom: 180 },
    CENTER: { x: 0.5, y: 0.5, minZoom: 180 },
    BOTTOM_LEFT: { x: 0.18, y: 0.82, minZoom: 180 },
    BOTTOM_RIGHT: { x: 0.82, y: 0.82, minZoom: 180 },
};


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
    aspectRatio = null,
    zoomCommand = null,
    regionCommand = null,
    focusCommand = null,
    regionMapping = {},
    enableCoordinatePick = false,
    onCoordinatePick
}: PresentationViewerProps) {
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>(initialOrientation);
    const [zoom, setZoom] = useState<number>(100);
    const [pageInputValue, setPageInputValue] = useState(currentPage.toString());
    const viewportRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const zoomAction = zoomCommand?.action;
    const zoomSequence = zoomCommand?.sequence;
    const region = regionCommand?.region;
    const regionSequence = regionCommand?.sequence;
    const focusCoord = focusCommand?.coord;
    const focusSequence = focusCommand?.sequence;
    const [pdfDoc, setPdfDoc] = useState<unknown>(null);
    const [isRenderingPdf, setIsRenderingPdf] = useState(false);
    const [renderTrigger, setRenderTrigger] = useState(0);
    const [renderedPageSize, setRenderedPageSize] = useState({ width: 0, height: 0 });
    const renderTaskRef = useRef<unknown>(null);
    const panRatioRef = useRef({ x: 0.5, y: 0.5 });
    const focusPointRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        setOrientation(initialOrientation);
    }, [initialOrientation]);

    useEffect(() => {
        setPageInputValue(currentPage.toString());
    }, [currentPage]);

    const applyPanByRatio = useCallback((x: number, y: number, behavior: ScrollBehavior = 'auto') => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);

        viewport.scrollTo({
            left: maxScrollLeft * x,
            top: maxScrollTop * y,
            behavior,
        });
    }, []);

    const getCurrentPanRatio = useCallback(() => {
        const viewport = viewportRef.current;
        if (!viewport) return { x: 0.5, y: 0.5 };

        const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);

        return {
            x: maxScrollLeft > 0 ? viewport.scrollLeft / maxScrollLeft : 0.5,
            y: maxScrollTop > 0 ? viewport.scrollTop / maxScrollTop : 0.5,
        };
    }, []);

    const clampRatio = useCallback((value: number) => {
        return Math.min(1, Math.max(0, value));
    }, []);

    const changeZoom = useCallback((delta: number) => {
        const currentPan = getCurrentPanRatio();
        panRatioRef.current = currentPan;
        setZoom(prev => Math.max(100, Math.min(300, prev + delta)));

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                applyPanByRatio(currentPan.x, currentPan.y);
            });
        });
    }, [applyPanByRatio, getCurrentPanRatio]);

    const handleZoomIn = useCallback(() => {
        changeZoom(20);
    }, [changeZoom]);

    const handleZoomOut = useCallback(() => {
        changeZoom(-20);
    }, [changeZoom]);

    const resetZoom = useCallback(() => {
        setZoom(100);
        const defaultPan = { x: 0.5, y: 0.5 };
        panRatioRef.current = defaultPan;
        focusPointRef.current = null;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                applyPanByRatio(0, 0, 'smooth');
            });
        });
    }, [applyPanByRatio]);

    useEffect(() => {
        if (!zoomAction) return;

        if (zoomAction === 'ZOOM_IN') {
            handleZoomIn();
        } else if (zoomAction === 'ZOOM_OUT') {
            handleZoomOut();
        } else if (zoomAction === 'RESET_ZOOM') {
            resetZoom();
        }
    }, [zoomAction, zoomSequence, handleZoomIn, handleZoomOut, resetZoom]);

    const centerOnNormalizedPoint = useCallback((nx: number, ny: number, behavior: ScrollBehavior = 'smooth') => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        const clampedX = clampRatio(nx);
        const clampedY = clampRatio(ny);
        const targetLeft = clampedX * viewport.scrollWidth - viewport.clientWidth / 2;
        const targetTop = clampedY * viewport.scrollHeight - viewport.clientHeight / 2;

        const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);

        viewport.scrollTo({
            left: Math.max(0, Math.min(targetLeft, maxScrollLeft)),
            top: Math.max(0, Math.min(targetTop, maxScrollTop)),
            behavior,
        });
    }, [clampRatio]);

    const zoomToPoint = useCallback((coord: RegionCoord) => {
        const nx = clampRatio(coord.x);
        const ny = clampRatio(coord.y);
        const minZoom = coord.minZoom ?? 180;

        panRatioRef.current = { x: nx, y: ny };
        focusPointRef.current = { x: nx, y: ny };
        setZoom(prev => Math.max(prev, minZoom));

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                centerOnNormalizedPoint(nx, ny, 'smooth');
            });
        });
    }, [centerOnNormalizedPoint, clampRatio]);

    useEffect(() => {
        if (!region) return;
        const slideMapping = regionMapping[currentPage]?.[region];
        const coords = slideMapping ?? REGION_DEFAULTS[region];
        zoomToPoint(coords);
    }, [region, regionSequence, currentPage, regionMapping, zoomToPoint]);

    useEffect(() => {
        if (!focusCoord) return;
        zoomToPoint(focusCoord);
    }, [focusCoord, focusSequence, zoomToPoint]);

    useEffect(() => {
        if (!fileUrl || fileType !== 'pdf') return;

        let cancelled = false;

        const loadPdf = async () => {
            try {
                // pdfjsLib is dynamically imported and may be from CDN or local
                // pdfjsLib is dynamically imported from local or CDN, so type safety cannot be guaranteed
                let pdfjsLib: {
                    GlobalWorkerOptions: { workerSrc: string };
                    version: string;
                    getDocument: (url: string) => { promise: Promise<{ getPage: (n: number) => Promise<unknown> }> };
                };
                try {
                    pdfjsLib = (await import('pdfjs-dist')) as unknown as typeof pdfjsLib;
                } catch (importErr) {
                    console.warn('[PDFViewer] Local pdfjs-dist not found, falling back to CDN import.', importErr);
                    pdfjsLib = (await import(
                        /* webpackIgnore: true */
                        // @ts-expect-error: TypeScript cannot resolve CDN imports
                        'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.min.mjs'
                    )) as unknown as typeof pdfjsLib;
                }

                if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
                }

                const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/${fileUrl}`;
                const doc = await (pdfjsLib.getDocument(url)).promise;
                if (!cancelled) {
                    setPdfDoc(doc);
                    setRenderTrigger(t => t + 1);
                }
            } catch (e) {
                console.error('[PDFViewer] Failed to load document:', e);
            }
        };

        loadPdf();
        return () => {
            cancelled = true;
            setPdfDoc(null);
        };
    }, [fileUrl, fileType]);

    useEffect(() => {
        if (pdfDoc) setRenderTrigger(t => t + 1);
    }, [currentPage, pdfDoc]);

    useEffect(() => {
        if (!pdfDoc || fileType !== 'pdf') return;

        let cancelled = false;

        const renderPage = async () => {
            const canvas = canvasRef.current;
            const viewportEl = viewportRef.current;
            if (!canvas || !viewportEl) return;

            setIsRenderingPdf(true);
            try {
                if (renderTaskRef.current) {
                    (renderTaskRef.current as unknown as { cancel: () => void; promise: Promise<unknown> }).cancel();
                    await (renderTaskRef.current as unknown as { promise: Promise<unknown> }).promise.catch(() => undefined);
                    renderTaskRef.current = null;
                }

                const page = await (pdfDoc as unknown as { getPage: (n: number) => Promise<unknown> }).getPage(currentPage);
                if (cancelled) return;

                const baseViewport = (page as unknown as { getViewport: (opts: { scale: number }) => { width: number; height: number } }).getViewport({ scale: 1 });
                const availableWidth = Math.max(320, viewportEl.clientWidth - 8);
                const availableHeight = Math.max(180, viewportEl.clientHeight - 8);
                const fitScale = Math.min(availableWidth / baseViewport.width, availableHeight / baseViewport.height);
                const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

                const displayViewport = (page as unknown as { getViewport: (opts: { scale: number }) => { width: number; height: number } }).getViewport({ scale: fitScale });
                const renderViewport = (page as unknown as { getViewport: (opts: { scale: number }) => { width: number; height: number } }).getViewport({ scale: fitScale * dpr });
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                canvas.width = Math.floor(renderViewport.width);
                canvas.height = Math.floor(renderViewport.height);
                canvas.style.width = `${displayViewport.width}px`;
                canvas.style.height = `${displayViewport.height}px`;
                setRenderedPageSize({ width: displayViewport.width, height: displayViewport.height });

                const renderTask = (page as unknown as { render: (opts: unknown) => { promise: Promise<unknown> } }).render({
                    canvasContext: ctx,
                    viewport: renderViewport,
                });

                renderTaskRef.current = renderTask;
                await (renderTask as unknown as { promise: Promise<unknown> }).promise;

                if (renderTaskRef.current === renderTask) {
                    renderTaskRef.current = null;
                }

                if (focusPointRef.current) {
                    const { x, y } = focusPointRef.current;
                    requestAnimationFrame(() => {
                        centerOnNormalizedPoint(x, y, 'auto');
                    });
                    focusPointRef.current = null;
                }
            } catch (e) {
                const errorName = (e as { name?: string } | null)?.name;
                if (!cancelled && errorName !== 'RenderingCancelledException') {
                    console.error('[PDFViewer] Render error:', e);
                }
            } finally {
                if (!cancelled) setIsRenderingPdf(false);
            }
        };

        renderPage();
        return () => {
            cancelled = true;
            if (renderTaskRef.current) {
                // @ts-expect-error: cancel is a dynamic property from pdfjs
                renderTaskRef.current.cancel();
            }
        };
    }, [renderTrigger, pdfDoc, fileType, currentPage, centerOnNormalizedPoint]);

    useEffect(() => {
        return () => {
            if (renderTaskRef.current) {
                // @ts-expect-error: cancel is a dynamic property from pdfjs
                renderTaskRef.current.cancel();
                renderTaskRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!pdfDoc) return;
        const onResize = () => setRenderTrigger(t => t + 1);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [pdfDoc]);

    const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!enableCoordinatePick || !onCoordinatePick) return;

        const rect = event.currentTarget.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const nx = clampRatio((event.clientX - rect.left) / rect.width);
        const ny = clampRatio((event.clientY - rect.top) / rect.height);
        onCoordinatePick({ x: nx, y: ny, minZoom: Math.max(zoom, 180) });
    }, [enableCoordinatePick, onCoordinatePick, clampRatio, zoom]);

    useEffect(() => {
        const handleResize = () => {
            if (zoom <= 100) return;
            const nextPan = panRatioRef.current;
            applyPanByRatio(clampRatio(nextPan.x), clampRatio(nextPan.y));
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [zoom, applyPanByRatio, clampRatio]);

    useEffect(() => {
        if (zoom <= 100) {
            applyPanByRatio(0, 0);
            return;
        }

        requestAnimationFrame(() => {
            const nextPan = panRatioRef.current;
            applyPanByRatio(nextPan.x, nextPan.y);
        });
    }, [zoom, applyPanByRatio]);

    const handleViewportScroll = useCallback(() => {
        if (zoom <= 100) return;
        const currentPan = getCurrentPanRatio();
        panRatioRef.current = currentPan;
    }, [zoom, getCurrentPanRatio]);

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

    // Portrait + zoomed -> switch to landscape display for better viewing
    const displayAsLandscape = orientation === 'landscape' || (orientation === 'portrait' && zoom > 100);

    // Use provided aspectRatio or fallback based on detected PDF ratio or orientation
    const detectedRatio = renderedPageSize.width > 0 ? renderedPageSize.width / renderedPageSize.height : null;
    const effectiveRatio = aspectRatio
        ? aspectRatio
        : (detectedRatio || (displayAsLandscape ? 1.777 : 0.707));

    // containerStyle ensures the viewer maintains its aspect ratio while fitting within its parent
    const containerStyle: React.CSSProperties = {
        aspectRatio: `${effectiveRatio}`,
        height: !displayAsLandscape ? '100%' : 'auto',
        width: displayAsLandscape ? '100%' : 'auto',
        maxWidth: '100%',
        maxHeight: '100%',
    };

    const zoomScale = zoom / 100;
    const scaledCanvasWidth = renderedPageSize.width > 0 ? renderedPageSize.width * zoomScale : 0;
    const scaledCanvasHeight = renderedPageSize.height > 0 ? renderedPageSize.height * zoomScale : 0;

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
                                    disabled={zoom <= 100}
                                    className="p-1 hover:bg-white/10 rounded-md transition-colors text-zinc-400 disabled:opacity-20"
                                >
                                    <Minus size={14} />
                                </button>
                                <button
                                    onClick={resetZoom}
                                    className="text-[10px] font-mono font-bold text-zinc-300 w-12 text-center hover:bg-white/5 rounded py-0.5 transition-colors"
                                    title="Reset to Fit"
                                >
                                    {zoom > 100 ? `${zoom}%` : 'FIT'}
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
                            ref={viewportRef}
                            onScroll={handleViewportScroll}
                            className="flex-1 relative select-none overflow-auto flex items-center justify-center bg-[#050505]"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
                        >
                            <div
                                style={{
                                    position: 'relative',
                                    width: scaledCanvasWidth > 0 ? `${scaledCanvasWidth}px` : '100%',
                                    height: scaledCanvasHeight > 0 ? `${scaledCanvasHeight}px` : '100%',
                                }}
                                className="transition-all duration-200 ease-out shrink-0 m-auto"
                            >
                                <canvas
                                    ref={canvasRef}
                                    onClick={handleCanvasClick}
                                    className={enableCoordinatePick ? 'cursor-crosshair' : 'cursor-default'}
                                    title={enableCoordinatePick ? 'Click to capture normalized coordinates' : 'Presentation Preview'}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        transformOrigin: 'top left',
                                        transform: `scale(${zoomScale})`,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Loading overlay */}
                        <AnimatePresence mode="wait">
                            {(isLoading || isRenderingPdf) && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-[#050505] flex items-center justify-center z-40"
                                >
                                    <div className="text-center">
                                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                                        <p className="mt-3 text-xs text-zinc-400 uppercase tracking-widest">
                                            {isRenderingPdf ? 'Rendering...' : 'Loading...'}
                                        </p>
                                    </div>
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
