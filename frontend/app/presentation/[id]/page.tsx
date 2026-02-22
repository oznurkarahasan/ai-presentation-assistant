'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft,
    Mic,
    MicOff,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Minimize2,
    FileText,
    Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import client from "../../api/client";

export default function RealTimePresentationPage() {
    const params = useParams();
    const router = useRouter();
    const presentationId = params.id as string;

    const [presentationTitle, setPresentationTitle] = useState("Loading...");
    const [presentationFile, setPresentationFile] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [liveFeedback, setLiveFeedback] = useState("");
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isPageLoading, setIsPageLoading] = useState(false);
    const [sttError, setSttError] = useState<string | null>(null);
    const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

    const socketRef = useRef<WebSocket | null>(null);
    const recognitionRef = useRef<any>(null);
    const currentPageRef = useRef(currentPage);
    const totalPagesRef = useRef(totalPages);

    // Sync refs with state to avoid closure staleness in STT/WebSocket handlers
    useEffect(() => {
        currentPageRef.current = currentPage;
    }, [currentPage]);

    useEffect(() => {
        totalPagesRef.current = totalPages;
    }, [totalPages]);

    // Fetch presentation details
    useEffect(() => {
        const fetchPresentation = async () => {
            try {
                const response = await client.get(`/api/v1/presentations/${presentationId}`);
                const data = response.data;
                console.log("[API] Presentation metadata received:", data);
                setPresentationTitle(data.title);
                setPresentationFile(data.file_path);
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

    // WebSocket Initialization
    useEffect(() => {
        let socket: WebSocket | null = null;
        let reconnectTimeout: NodeJS.Timeout;

        const connect = () => {
            const socketId = Math.random().toString(36).substring(7);
            const host = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
            const baseWsUrl = process.env.NEXT_PUBLIC_WS_URL || `ws://${host}:8000`;
            const wsUrl = `${baseWsUrl}/api/v1/orchestration/ws/presentation/${presentationId}`;

            console.log(`[WebSocket] [${socketId}] Connecting to: ${wsUrl} (Current Host: ${host})`);
            setWsStatus("connecting");

            socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log(`[WebSocket] [${socketId}] Connected successfully`);
                setWsStatus("connected");
            };

            socket.onmessage = (event) => {
                if (socketRef.current !== socket) return;
                try {
                    const data = JSON.parse(event.data);
                    console.log(`[WebSocket] [${socketId}] Message:`, data.type);
                    if (data.type === "COMMAND") {
                        handleCommandRef.current(data.payload);
                    }
                } catch (err) {
                    console.error(`[WebSocket] [${socketId}] Parse error:`, err);
                }
            };

            socket.onerror = (error) => {
                // Ignore errors if we've already unmounted or if the socket is closing
                if (socketRef.current !== socket || socket.readyState === WebSocket.CLOSING || socket.readyState === WebSocket.CLOSED) {
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
    }, [presentationId]);

    const handleCommand = (payload: any) => {
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
    };

    const handleCommandRef = useRef(handleCommand);
    useEffect(() => {
        handleCommandRef.current = handleCommand;
    });

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

    const goToPage = (page: number) => {
        const total = totalPagesRef.current;
        console.log(`[Navigation] Request: Jump to ${page} | Total: ${total}`);
        if (page >= 1 && page <= total) {
            setIsPageLoading(true);
            setCurrentPage(page);
        } else {
            console.warn(`[Navigation] Blocked: Page ${page} out of bounds (1-${total}).`);
        }
    };

    useEffect(() => {
        if (isPageLoading) {
            const timer = setTimeout(() => setIsPageLoading(false), 800);
            return () => clearTimeout(timer);
        }
    }, [currentPage, isPageLoading]);

    // Speech Recognition Logic
    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            setSttError(null);
            startSpeechRecognition();
        }
    };

    const startSpeechRecognition = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                    // Send final to backend
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

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);

            if (event.error === 'network') {
                setSttError("Network error: Browsers like Chrome require an internet connection to reach Google's speech services. Please check if they are blocked.");
            } else if (event.error === 'not-allowed') {
                setSttError("Permission denied: Please ensure microphone access is allowed in your site settings.");
            } else if (event.error === 'no-speech') {
                setSttError("Silence detected: No audio was picked up. Check your microphone sensitivity.");
            } else {
                setSttError(`Error: ${event.error}`);
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
            <aside className="w-80 border-r border-white/5 bg-zinc-900/50 backdrop-blur-xl flex flex-col relative z-20">
                <header className="p-6 border-b border-white/5">
                    <div className="flex items-center gap-3 mb-6">
                        <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400">
                            <ArrowLeft size={18} />
                        </Link>
                        <h1 className="text-sm font-bold tracking-tight uppercase italic truncate">{presentationTitle}</h1>
                    </div>

                    <button
                        onClick={toggleListening}
                        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all shadow-lg active:scale-95 ${isListening ? 'bg-red-500 shadow-red-500/20' : 'bg-primary shadow-primary/20'
                            }`}
                    >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                        {isListening ? 'Stop Presentation' : 'Start Presentation'}
                    </button>

                    <AnimatePresence>
                        {sttError && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
                            >
                                <p className="mb-2 font-medium">Error: {sttError}</p>
                                <button
                                    onClick={() => {
                                        setSttError(null);
                                        startSpeechRecognition();
                                    }}
                                    className="text-white hover:underline font-bold"
                                >
                                    Retry Connection
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </header>

                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">Live Transcript</h3>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 min-h-[150px] text-sm leading-relaxed relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/30" />
                            <p className="text-zinc-400 opacity-60 italic">{transcript}</p>
                            <p className="text-primary font-medium mt-2 animate-pulse">{liveFeedback}</p>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">Voice Commands</h3>
                        <div className="space-y-2">
                            <CommandTip label="Next Slide" example="'Next slide', 'Moving on'" />
                            <CommandTip label="Previous Slide" example="'Go back', 'Last slide'" />
                            <CommandTip label="Jump to Page" example="'Go to slide five'" />
                        </div>
                    </div>
                </div>

                <footer className="p-6 border-t border-white/5 text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-center">
                    PreCue.ai Real-time Engine
                </footer>
            </aside>

            {/* Main Slide Viewer */}
            <main className="flex-1 relative flex flex-col bg-[#050505] z-10">
                <div className="flex-1 p-8 flex items-center justify-center relative">
                    <div className="w-full h-full max-w-5xl aspect-[16/9] bg-zinc-900 rounded-3xl overflow-hidden border border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative group">
                        {presentationFile ? (
                            <iframe
                                key={currentPage}
                                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/${presentationFile}#page=${currentPage}&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                                className="w-full h-full border-none"
                                title="Live Preview"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <FileText size={48} className="text-zinc-800 animate-pulse" />
                            </div>
                        )}

                        {/* Page loading overlay */}
                        <AnimatePresence>
                            {isPageLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4 z-40"
                                >
                                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Syncing Slide {currentPage}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Navigation Overlays */}
                    <div className="absolute inset-y-0 left-0 w-32 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <button onClick={handlePrevPage} className="p-6 bg-white/5 hover:bg-white/10 rounded-full transition-all text-white/20 hover:text-white">
                            <ChevronLeft size={48} />
                        </button>
                    </div>
                    <div className="absolute inset-y-0 right-0 w-32 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <button onClick={handleNextPage} className="p-6 bg-white/5 hover:bg-white/10 rounded-full transition-all text-white/20 hover:text-white">
                            <ChevronRight size={48} />
                        </button>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="h-20 border-t border-white/5 px-12 flex items-center justify-between bg-black/40 backdrop-blur-md">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Slide</span>
                            <span className="text-lg font-black tracking-tighter"><span className="text-primary">{currentPage}</span> / {totalPages}</span>
                        </div>
                        <div className="h-8 w-[1px] bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Pages</span>
                            <span className="text-xs font-bold uppercase">{currentPage} / {totalPages}</span>
                        </div>
                        <div className="h-8 w-[1px] bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Engine</span>
                            <span className="text-xs font-bold uppercase flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-green-500' : wsStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                                {wsStatus}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-zinc-400 hover:text-white">
                            {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

function CommandTip({ label, example }: { label: string, example: string }) {
    return (
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-[10px] font-extrabold text-primary uppercase tracking-widest mb-1">{label}</p>
            <p className="text-xs text-zinc-400 italic">Try: {example}</p>
        </div>
    );
}
