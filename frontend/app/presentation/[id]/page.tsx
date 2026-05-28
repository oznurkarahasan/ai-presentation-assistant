'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Mic,
    MicOff,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Minimize2,
    PanelLeftOpen,
    PanelLeftClose,
    Square
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import client from "../../api/client";
import PresentationViewer, { PresentationViewerRef } from "../../components/PresentationViewer";
import LanguageSwitcher from "../../components/LanguageSwitcher";


type CommandIntent = "NEXT_SLIDE" | "PREVIOUS_SLIDE" | "JUMP_TO_SLIDE";

interface CommandPayload {
    intent: CommandIntent;
    slide_number?: number;
}

interface WsCommandMessage {
    type: "COMMAND";
    payload: CommandPayload;
}

interface SpeechRecognitionAlternativeLike {
    transcript: string;
}

interface SpeechRecognitionResultLike {
    0: SpeechRecognitionAlternativeLike;
    isFinal: boolean;
}

interface SpeechRecognitionEventLike {
    resultIndex: number;
    results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
    error: string;
}

interface SpeechRecognitionLike {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: (() => void) | null;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
}

interface SpeechRecognitionCtorLike {
    new(): SpeechRecognitionLike;
}

declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionCtorLike;
        webkitSpeechRecognition?: SpeechRecognitionCtorLike;
    }
}

function isWsCommandMessage(value: unknown): value is WsCommandMessage {
    if (typeof value !== "object" || value === null) return false;
    const maybe = value as Partial<WsCommandMessage>;
    if (maybe.type !== "COMMAND") return false;
    if (typeof maybe.payload !== "object" || maybe.payload === null) return false;
    const payload = maybe.payload as Partial<CommandPayload>;
    const validIntent = payload.intent === "NEXT_SLIDE" || payload.intent === "PREVIOUS_SLIDE" || payload.intent === "JUMP_TO_SLIDE";
    const validSlide = payload.slide_number === undefined || typeof payload.slide_number === "number";
    return validIntent && validSlide;
}

export default function RealTimePresentationPage() {
    const params = useParams();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('presentation');
    const presentationId = params.id as string;

    const [presentationTitle, setPresentationTitle] = useState("Loading...");
    const [presentationFile, setPresentationFile] = useState<string | null>(null);
    const [fileType, setFileType] = useState<string | null>(null);
    const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
    const [currentPage, setCurrentPage] = useState(1);


    const [totalPages, setTotalPages] = useState(1);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [liveFeedback, setLiveFeedback] = useState("");
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isPageLoading, setIsPageLoading] = useState(false);
    const [sttError, setSttError] = useState<string | null>(null);
    const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
    const sttLanguage = locale === "tr" ? "tr-TR" : "en-US";
    const [aspectRatio, setAspectRatio] = useState<number | null>(null);
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const [isSessionActive, setIsSessionActive] = useState(false);

    const socketRef = useRef<WebSocket | null>(null);
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const viewerRef = useRef<PresentationViewerRef>(null);
    const viewerContainerRef = useRef<HTMLDivElement>(null);
    const currentPageRef = useRef(currentPage);
    const totalPagesRef = useRef(totalPages);
    const isListeningRef = useRef(isListening);

    // Sync refs with state to avoid closure staleness in STT/WebSocket handlers
    useEffect(() => {
        currentPageRef.current = currentPage;
    }, [currentPage]);

    useEffect(() => {
        totalPagesRef.current = totalPages;
    }, [totalPages]);

    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);

    const sendSessionEvent = useCallback((eventName: "START" | "END") => {
        if (socketRef.current?.readyState !== WebSocket.OPEN) return;
        socketRef.current.send(JSON.stringify({
            type: "SESSION_EVENT",
            event: eventName,
            session_type: "live",
            current_page: currentPageRef.current,
            total_pages: totalPagesRef.current,
        }));
    }, []);

    // Fetch presentation details
    useEffect(() => {
        const fetchPresentation = async () => {
            try {
                const response = await client.get(`/api/v1/presentations/${presentationId}`);
                const data = response.data;
                console.log("[API] Presentation metadata received:", data);
                setPresentationTitle(data.title);
                // Use PDF preview for PPTX files when available
                setPresentationFile(data.pdf_preview_path || data.file_path);
                setFileType(data.pdf_preview_path ? 'pdf' : data.file_type);
                if (data.aspect_ratio) {
                    setAspectRatio(data.aspect_ratio);
                }
                if (data.orientation) {
                    setOrientation(data.orientation);
                }
                // Handle both naming conventions for robustness

                const count = data.total_pages || data.slide_count || 1;
                console.log(`[API] Total pages set to: ${count}`);
                setTotalPages(count);

            } catch (error) {
                console.error("Failed to fetch presentation:", error);
            }
        };
        if (presentationId) fetchPresentation();
    }, [presentationId]);

    const handlePrevPage = useCallback(() => {
        setCurrentPage(prev => {
            if (prev > 1) {
                setIsPageLoading(true);
                return prev - 1;
            }
            console.warn("[Navigation] Blocked: Already on first page.");
            return prev;
        });
    }, []);

    const handleNextPage = useCallback(() => {
        const total = totalPagesRef.current;
        setCurrentPage(prev => {
            if (prev < total) {
                setIsPageLoading(true);
                return prev + 1;
            }
            console.warn(`[Navigation] Blocked: Already on last page (${total}).`);
            return prev;
        });
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") {
                handlePrevPage();
            } else if (e.key === "ArrowRight") {
                handleNextPage();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handlePrevPage, handleNextPage]);

    const goToPage = useCallback((page: number) => {
        const total = totalPagesRef.current;
        console.log(`[Navigation] Request: Jump to ${page} | Total: ${total}`);
        if (page >= 1 && page <= total) {
            setIsPageLoading(true);
            setCurrentPage(page);
        } else {
            console.warn(`[Navigation] Blocked: Page ${page} out of bounds (1-${total}).`);
        }
    }, []);

    const handleCommand = useCallback((payload: CommandPayload) => {
        const { intent, slide_number } = payload;
        const currentTotal = totalPagesRef.current;
        console.log(`[WebSocket] Received COMMAND: ${intent} | Slide: ${slide_number} | Total: ${currentTotal}`);

        if (intent === "NEXT_SLIDE") {
            if (slide_number) {
                goToPage(slide_number);
            } else {
                handleNextPage();
            }
        } else if (intent === "PREVIOUS_SLIDE") {
            if (slide_number) {
                goToPage(slide_number);
            } else {
                handlePrevPage();
            }
        } else if (intent === "JUMP_TO_SLIDE" && slide_number) {
            goToPage(slide_number);
        }
    }, [goToPage, handleNextPage, handlePrevPage]);

    // WebSocket Initialization
    useEffect(() => {
        let socket: WebSocket | null = null;
        let reconnectTimeout: NodeJS.Timeout;

        const connect = () => {
            const socketId = Math.random().toString(36).substring(7);
            const host = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
            const baseWsUrl = process.env.NEXT_PUBLIC_WS_URL || `ws://${host}:8000`;
            const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
            const wsUrl = token
                ? `${baseWsUrl}/api/v1/orchestration/ws/presentation/${presentationId}?token=${encodeURIComponent(token)}`
                : `${baseWsUrl}/api/v1/orchestration/ws/presentation/${presentationId}`;

            console.log(`[WebSocket] [${socketId}] Connecting to presentation ${presentationId} (Host: ${host})`);
            setWsStatus("connecting");

            socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log(`[WebSocket] [${socketId}] Connected successfully`);
                setWsStatus("connected");
                if (isListeningRef.current) {
                    sendSessionEvent("START");
                }
            };

            socket.onmessage = (event) => {
                if (socketRef.current !== socket) return;
                try {
                    const data: unknown = JSON.parse(event.data);
                    if (isWsCommandMessage(data)) {
                        console.log(`[WebSocket] [${socketId}] Message:`, data.type);
                        handleCommand(data.payload);
                    }
                } catch (err) {
                    console.error(`[WebSocket] [${socketId}] Parse error:`, err);
                }
            };

            socket.onerror = (error) => {
                const activeSocket = socket;
                // Ignore errors if we've already unmounted or if the socket is closing
                if (!activeSocket || socketRef.current !== activeSocket || activeSocket.readyState === WebSocket.CLOSING || activeSocket.readyState === WebSocket.CLOSED) {
                    return;
                }
                console.error(`[WebSocket] [${socketId}] Error observed:`, error);
                setWsStatus("disconnected");
            };

            socket.onclose = (event) => {
                console.warn(`[WebSocket] [${socketId}] Closed. Code: ${event.code}`);
                if (socketRef.current === socket) {
                    setWsStatus("disconnected");
                }
                if (event.code === 4001) {
                    window.location.href = '/login';
                    return;
                }
                // Only reconnect if this was the intended active socket
                if (socketRef.current === socket) {
                    reconnectTimeout = setTimeout(connect, 3000);
                }
            };
        };

        connect();

        return () => {
            if (socket) socket.close();
            clearTimeout(reconnectTimeout);
        };
    }, [presentationId, handleCommand, sendSessionEvent]);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement && viewerContainerRef.current) {
            viewerContainerRef.current.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                setIsFullScreen(false);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch((err) => {
                    console.error(`Error attempting to exit full-screen mode: ${err.message}`);
                });
            }
        }
    };

    // Listen for Escape or manual exit from fullscreen to sync state
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        if (isPageLoading) {
            const timer = setTimeout(() => setIsPageLoading(false), 800);
            return () => clearTimeout(timer);
        }
    }, [currentPage, isPageLoading]);

    // Speech Recognition Logic
    const startListening = () => {
        setSttError(null);
        if (!isSessionActive) {
            sendSessionEvent("START");
            setIsSessionActive(true);
        }
        startSpeechRecognition();
    };

    const pauseListening = () => {
        recognitionRef.current?.stop();
        setIsListening(false);
    };

    const stopPresentationFully = () => {
        recognitionRef.current?.stop();
        setIsListening(false);
        setLiveFeedback("");
        if (isSessionActive) {
            sendSessionEvent("END");
            setIsSessionActive(false);
        }
    };

    const startSpeechRecognition = () => {
        const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionCtor) {
            alert(t('speechNotSupported'));
            return;
        }

        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = sttLanguage;

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: SpeechRecognitionEventLike) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcriptText = event.results[i][0].transcript.toLowerCase().trim();
                
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                    
                    // Local Command Detection (if-else structure as requested)
                    if (transcriptText.includes("yakınlaştır") || 
                        transcriptText.includes("zoom yap") || 
                        transcriptText.includes("büyüt") || 
                        transcriptText.includes("yüzde 10") || 
                        transcriptText.includes("zoom in") ||
                        transcriptText.includes("yüze on") || // common STT misstep for %10
                        (transcriptText.includes("daha") && (transcriptText.includes("yakın") || transcriptText.includes("büyük")))
                    ) {
                        console.log("[LocalCommand] Triggered ZOOM_IN");
                        viewerRef.current?.zoomIn();
                    } 
                    else if (transcriptText.includes("uzaklaştır") || 
                             transcriptText.includes("küçült") || 
                             transcriptText.includes("zoom out") || 
                             transcriptText.includes("shrink")
                    ) {
                        console.log("[LocalCommand] Triggered ZOOM_OUT");
                        viewerRef.current?.zoomOut();
                    }
                    else if (transcriptText.includes("sıfırla") || 
                             transcriptText.includes("reset") || 
                             transcriptText.includes("normal boyuta") || 
                             transcriptText.includes("başlangıç boyutu")
                    ) {
                        console.log("[LocalCommand] Triggered ZOOM_RESET");
                        viewerRef.current?.resetZoom();
                    }

                    // Send final to backend for navigation/content analysis
                    if (socketRef.current?.readyState === WebSocket.OPEN) {
                        socketRef.current.send(JSON.stringify({
                            transcript: event.results[i][0].transcript,
                            is_final: true,
                            current_page: currentPageRef.current,
                            total_pages: totalPages
                        }));
                    }
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setLiveFeedback(interimTranscript);

            // Send interim transcripts for live analysis if needed
            if (interimTranscript && socketRef.current?.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                    transcript: interimTranscript,
                    is_final: false,
                    current_page: currentPageRef.current,
                    total_pages: totalPages
                }));
            }
            if (finalTranscript) setTranscript(prev => (prev + " " + finalTranscript).slice(-200));
        };

        recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);

            if (event.error === 'network') {
                setSttError(t('networkError'));
            } else if (event.error === 'not-allowed') {
                setSttError(t('permissionDenied'));
            } else if (event.error === 'no-speech') {
                setSttError(t('noSpeech'));
            } else {
                setSttError(`${t('errorPrefix')} ${event.error}`);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    return (
        <div className="flex h-screen bg-black text-white overflow-hidden font-sans relative">
            <div className="bg-grid" />

            {/* Sidebar / Controls */}
            <AnimatePresence>
                {!isFullScreen && isSidebarVisible && (
                    <motion.aside
                        initial={{ x: -24, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -24, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-80 border-r border-white/5 bg-zinc-900/50 backdrop-blur-xl flex flex-col relative z-20"
                    >
                <header className="p-6 border-b border-white/5">
                    <div className="flex items-center gap-3 mb-6">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <h1 className="text-sm font-bold tracking-tight uppercase italic truncate">{presentationTitle}</h1>
                        <button
                            onClick={() => setIsSidebarVisible(false)}
                            className="ml-auto p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400"
                            title={t('hideSidebar')}
                            aria-label={t('hideSidebar')}
                        >
                            <PanelLeftClose size={18} />
                        </button>
                    </div>

                    {/* Language Toggle */}
                    <div className="mt-3 flex justify-end">
                        <LanguageSwitcher />
                    </div>

                    <AnimatePresence>
                        {sttError && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
                            >
                                <p className="mb-2 font-medium">{t('errorPrefix')} {sttError}</p>
                                <button
                                    onClick={() => {
                                        setSttError(null);
                                        startSpeechRecognition();
                                    }}
                                    className="text-white hover:underline font-bold"
                                >
                                    {t('retryConnection')}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </header>

                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">{t('liveTranscript')}</h3>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 min-h-[150px] text-sm leading-relaxed relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/30" />
                            <p className="text-zinc-400 opacity-60 italic">{transcript}</p>
                            <p className="text-primary font-medium mt-2 animate-pulse">{liveFeedback}</p>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">{t('voiceCommands')}</h3>
                        <div className="space-y-2">
                            <CommandTip label={t('nextSlide')} example={t('nextSlideExample')} try={t('try')} />
                            <CommandTip label={t('prevSlide')} example={t('prevSlideExample')} try={t('try')} />
                            <CommandTip label={t('jumpToPage')} example={t('jumpToPageExample')} try={t('try')} />
                            <CommandTip label={t('zoom')} example={t('zoomExample')} try={t('try')} />
                        </div>
                    </div>
                </div>

                <footer className="p-6 border-t border-white/5 text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-center">
                    {t('engine')}
                </footer>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Slide Viewer */}
            <main className="flex-1 relative flex flex-col bg-[#050505] z-10">
                <div className="flex-1 p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
                    <div
                        ref={viewerContainerRef}
                        className={`w-full h-full max-w-[95vw] relative shadow-[0_0_100px_rgba(0,0,0,0.8)] flex justify-center bg-[#050505] ${isFullScreen ? 'items-center' : 'items-start pt-14 md:pt-16'}`}
                    >

                        {!isFullScreen && (
                            <div className="absolute top-4 left-4 right-4 z-[60] flex items-start justify-between pointer-events-none">
                                <div className="pointer-events-auto">
                                    {!isSidebarVisible && (
                                        <button
                                            onClick={() => setIsSidebarVisible(true)}
                                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-200 backdrop-blur hover:bg-black/80"
                                        >
                                            <PanelLeftOpen size={14} />
                                            {t('menu')}
                                        </button>
                                    )}
                                </div>

                                <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 p-1.5 backdrop-blur-md shadow-xl">
                                    <button
                                        onClick={startListening}
                                        disabled={isListening}
                                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${isListening
                                            ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                                            : 'bg-red-600 hover:bg-red-500 text-white'
                                            }`}
                                    >
                                        <Mic size={13} />
                                        {t('start')}
                                    </button>

                                    <button
                                        onClick={pauseListening}
                                        disabled={!isListening}
                                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${!isListening
                                            ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                                            : 'bg-amber-600 hover:bg-amber-500 text-white'
                                            }`}
                                    >
                                        <MicOff size={13} />
                                        {t('pause')}
                                    </button>

                                    <button
                                        onClick={stopPresentationFully}
                                        disabled={!isListening && !isSessionActive}
                                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${!isListening && !isSessionActive
                                            ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                                            : 'bg-zinc-900 hover:bg-zinc-800 text-white border border-red-500/40'
                                            }`}
                                    >
                                        <Square size={13} />
                                        {t('end')}
                                    </button>
                                </div>
                            </div>
                        )}


                        <PresentationViewer
                            ref={viewerRef}
                            fileUrl={presentationFile}
                            fileType={fileType}
                            title={presentationTitle}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            isLoading={isPageLoading}
                            onPageChange={(page) => {
                                setIsPageLoading(true);
                                setTimeout(() => {
                                    setCurrentPage(page);
                                }, 200);
                            }}
                            isFullScreen={isFullScreen}
                            initialOrientation={orientation}
                            aspectRatio={aspectRatio}
                        />



                        {/* Navigation Overlays (Side buttons) */}
                        <div className="absolute inset-y-0 left-0 w-32 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10">
                            <button
                                onClick={handlePrevPage}
                                className="p-6 bg-white/5 hover:bg-white/10 rounded-full transition-all text-white/20 hover:text-white"
                                disabled={currentPage <= 1 || isPageLoading}
                            >
                                <ChevronLeft size={48} />
                            </button>
                        </div>
                        <div className="absolute inset-y-0 right-0 w-32 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10">
                            <button
                                onClick={handleNextPage}
                                className="p-6 bg-white/5 hover:bg-white/10 rounded-full transition-all text-white/20 hover:text-white"
                                disabled={currentPage >= totalPages || isPageLoading}
                            >
                                <ChevronRight size={48} />
                            </button>
                        </div>
                    </div>
                </div>


                {/* Status Bar */}
                {!isFullScreen && (
                    <div className="h-20 border-t border-white/5 px-12 flex items-center justify-between bg-black/40 backdrop-blur-md">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">{t('slide')}</span>
                            <span className="text-lg font-black tracking-tighter"><span className="text-primary">{currentPage}</span> / {totalPages}</span>
                        </div>
                        <div className="h-8 w-[1px] bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">{t('pages')}</span>
                            <span className="text-xs font-bold uppercase">{currentPage} / {totalPages}</span>
                        </div>
                        <div className="h-8 w-[1px] bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">{t('engineStatus')}</span>
                            <span className="text-xs font-bold uppercase flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-green-500' : wsStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                                {wsStatus}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={toggleFullScreen} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-zinc-400 hover:text-white">
                            {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                        </button>
                    </div>
                    </div>
                )}
            </main>
        </div>
    );
}

function CommandTip({ label, example, try: tryLabel }: { label: string, example: string, try: string }) {
    return (
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-[10px] font-extrabold text-primary uppercase tracking-widest mb-1">{label}</p>
            <p className="text-xs text-zinc-400 italic">{tryLabel} {example}</p>
        </div>
    );
}
