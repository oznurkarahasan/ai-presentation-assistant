'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Send,
    ArrowLeft,
    MessageSquare,
    FileText,
    Sparkles,
    Maximize2,
    User,
    ChevronRight,
    X,
    Presentation,
    Sun,
    Moon,
    Minimize2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import client from "../api/client";
import { useCallback } from "react";

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function AnalyzePage() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hi! How can I help you with this presentation today? I can analyze the content, extract key takeaways, or provide suggestions for your rehearsing session.",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [presentationTitle, setPresentationTitle] = useState("Loading Presentation...");
    const [presentationFile, setPresentationFile] = useState<string | null>(null);
    const [fileType, setFileType] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const presentationId = searchParams.get('id');

    const [showChat, setShowChat] = useState(true);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [chatTheme, setChatTheme] = useState<'dark' | 'light'>('dark');
    const [isPageLoading, setIsPageLoading] = useState(false);


    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token || token === 'undefined' || token === 'null' || token === '') {
            router.push("/upload");
            return;
        }

        setIsCheckingAuth(false);

        // Fetch presentation details if ID is present
        if (presentationId) {
            const fetchPresentation = async () => {
                try {
                    const response = await client.get(`/api/v1/presentations/${presentationId}`);
                    setPresentationTitle(response.data.title);
                    setPresentationFile(response.data.file_path);
                    setFileType(response.data.file_type);
                    if (response.data.slide_count) {
                        setTotalPages(response.data.slide_count);
                    }
                } catch (error) {
                    console.error("Failed to fetch presentation:", error);
                    setPresentationTitle("Error loading presentation");
                }
            };
            fetchPresentation();
        }
    }, [router, presentationId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !presentationId) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsTyping(true);

        try {
            const response = await client.post(`/api/v1/chat/${presentationId}`, {
                question: input
            });

            const assistantMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: response.data.answer,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (err: unknown) {
            console.error("Chat failed:", err);
            const errorMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: "I'm sorry, I encountered an error while generating a response. Please try again.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    const handlePrevPage = useCallback(() => {
        if (currentPage > 1 && !isPageLoading) {
            setIsPageLoading(true);
            setTimeout(() => {
                setCurrentPage(currentPage - 1);
            }, 200); // Overlay fades in first
        }
    }, [currentPage, isPageLoading]);

    const handleNextPage = useCallback(() => {
        if (currentPage < totalPages && !isPageLoading) {
            setIsPageLoading(true);
            setTimeout(() => {
                setCurrentPage(currentPage + 1);
            }, 200); // Overlay fades in first
        }
    }, [currentPage, totalPages, isPageLoading]);

    useEffect(() => {
        if (isPageLoading) {
            const timer = setTimeout(() => setIsPageLoading(false), 1200); // Sufficient time for PDF rendering
            return () => clearTimeout(timer);
        }
    }, [currentPage, isPageLoading]); // Added isPageLoading to dependencies

    // Keyboard navigation optimization
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
    }, [handlePrevPage, handleNextPage]); // Fixed missing dependencies

    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };

    const toggleTheme = () => {
        setChatTheme(chatTheme === 'dark' ? 'light' : 'dark');
    };



    if (isCheckingAuth) {
        return (
            <div className="flex h-screen items-center justify-center bg-black relative">
                <div className="bg-grid" />
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin relative z-10" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-black text-zinc-100 overflow-hidden relative font-sans">
            <div className="bg-grid" />

            {/* Main Application Container */}
            <div className={`flex flex-1 relative z-10 overflow-hidden flex-col md:flex-row ${isFullScreen ? 'p-0' : ''}`}>

                {/* Left Panel: Presentation Content */}
                <div className={`flex-1 flex flex-col bg-zinc-900/20 backdrop-blur-sm border-r border-white/5 transition-all duration-500 
                    ${!showChat ? 'md:mr-0' : ''} 
                    ${isFullScreen ? 'fixed inset-0 z-50 bg-[#050505]' : 'relative'}`}>

                    <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/40">
                        <div className="flex items-center gap-4">
                            {!isFullScreen && (
                                <>
                                    <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400 hover:text-white">
                                        <ArrowLeft size={20} />
                                    </Link>
                                    <div className="h-4 w-[1px] bg-white/10" />
                                </>
                            )}
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                                    <FileText size={16} className="text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold tracking-tight uppercase italic truncate max-w-[200px] md:max-w-xs">{presentationTitle}</h2>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none mt-0.5">Presentation Analysis Mode</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">


                            <button
                                onClick={toggleFullScreen}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400 hover:text-white hidden md:flex"
                            >
                                {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                            </button>

                            <button
                                onClick={() => setShowChat(!showChat)}
                                className={`p-2 rounded-lg transition-all md:hidden ${showChat ? 'bg-primary/20 text-primary' : 'text-zinc-400'}`}
                            >
                                <MessageSquare size={18} />
                            </button>
                        </div>
                    </header>

                    {/* PDF / Slides View Area */}
                    <div className="flex-1 overflow-hidden relative p-4 md:p-8 bg-[#050505]">
                        <div className="w-full h-full rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-zinc-900/50 flex items-center justify-center relative group">
                            {presentationFile ? (
                                fileType === 'pdf' ? (
                                    <div className="w-full h-full relative">
                                        <iframe
                                            key={currentPage}
                                            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/${presentationFile}#page=${currentPage}&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                                            className="w-full h-full border-none rounded-xl"
                                            title="Presentation Preview"
                                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                        />

                                        {/* Solid Smooth Loading Overlay */}
                                        <AnimatePresence mode="wait">
                                            {isPageLoading && (
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
                                    </div>
                                ) : (
                                    <div className="relative z-10 w-full max-w-3xl aspect-[16/9] bg-white rounded-sm shadow-[0_0_100px_rgba(255,255,255,0.05)] overflow-hidden">
                                        <div className="p-12 h-full flex flex-col text-black font-sans">
                                            <div className="flex justify-between items-start mb-12">
                                                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">P</div>
                                                <div className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">PowerPoint Preview</div>
                                            </div>
                                            <h3 className="text-5xl font-black italic uppercase tracking-tighter leading-none mb-6">{presentationTitle}</h3>
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

                            {/* Optimized Manual controls footer */}
                            {fileType === 'pdf' && (
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/40 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] scale-90 md:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 hover:border-primary/30">
                                    <button
                                        onClick={handlePrevPage}
                                        disabled={currentPage <= 1}
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
                                        disabled={currentPage >= totalPages}
                                        className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-primary hover:text-white transition-all text-zinc-400 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-zinc-400 active:scale-90"
                                        title="Next Slide (→)"
                                    >
                                        <ChevronRight size={22} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: AI Chat Section */}
                <AnimatePresence>
                    {showChat && (
                        <motion.aside
                            initial={{ x: 400, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 400, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className={`w-full md:w-[450px] flex flex-col backdrop-blur-2xl border-l border-white/5 relative shadow-2xl h-full md:h-auto z-40
                                ${chatTheme === 'dark' ? 'bg-zinc-900/40' : 'bg-white/95 text-zinc-900 ring-1 ring-black/5'}`}
                        >
                            <header className={`h-16 border-b border-white/5 flex items-center justify-between px-6 
                                ${chatTheme === 'dark' ? 'bg-white/[0.02]' : 'bg-zinc-50 border-zinc-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 border rounded-xl flex items-center justify-center overflow-hidden
                                        ${chatTheme === 'dark' ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200'}`}>
                                        <Image src="/favicon.ico" alt="PreCue.ai Logo" width={24} height={24} className="object-contain" />
                                    </div>
                                    <div>
                                        <h2 className={`text-sm font-black italic uppercase tracking-wider ${chatTheme === 'light' ? 'text-zinc-900' : ''}`}>PreCue<span className="text-primary">.ai</span></h2>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Master the Preparation, Control the Cue</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={toggleTheme}
                                        className={`p-2 hover:bg-white/5 rounded-lg transition-colors ${chatTheme === 'dark' ? 'text-zinc-500' : 'text-zinc-400 hover:bg-zinc-100'}`}
                                    >
                                        {chatTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                                    </button>
                                    <button
                                        onClick={() => setShowChat(false)}
                                        className={`p-2 hover:bg-white/5 rounded-lg transition-colors hidden md:flex ${chatTheme === 'dark' ? 'text-zinc-500' : 'text-zinc-400 hover:bg-zinc-100'}`}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </header>

                            {/* Chat History */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                                <AnimatePresence initial={false}>
                                    {messages.map((message) => (
                                        <motion.div
                                            key={message.id}
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border 
                                                ${message.role === 'user' ? 'bg-zinc-800 border-white/10' : 'bg-primary/10 border-primary/20'}`}>
                                                {message.role === 'user' ? (
                                                    <User size={16} />
                                                ) : (
                                                    <Image src="/favicon.ico" alt="AI" width={20} height={20} className="object-contain" />
                                                )}
                                            </div>
                                            <div className={`max-w-[85%] space-y-1.5 ${message.role === 'user' ? 'text-right' : ''}`}>
                                                <div className={`p-4 rounded-2xl text-[13px] leading-relaxed font-medium shadow-sm 
                                                    ${message.role === 'user'
                                                        ? 'bg-primary text-white rounded-tr-none'
                                                        : chatTheme === 'dark'
                                                            ? 'bg-white/5 text-zinc-300 border border-white/5 rounded-tl-none'
                                                            : 'bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-tl-none'}`}>
                                                    {message.content}
                                                </div>
                                                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest px-1">
                                                    {message.role === 'assistant' ? 'AI Assistant' : 'You'} • {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                {isTyping && (
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                                            <Sparkles size={16} className="text-primary" />
                                        </div>
                                        <div className={`bg-white/5 border border-white/5 p-4 rounded-2xl rounded-tl-none flex gap-1
                                            ${chatTheme === 'light' ? 'bg-zinc-100 border-zinc-200' : ''}`}>
                                            <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" />
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Chat Input */}
                            <div className={`p-6 border-t border-white/5 backdrop-blur-md
                                ${chatTheme === 'dark' ? 'bg-black/40 border-white/5' : 'bg-white border-zinc-200'}`}>
                                <form onSubmit={handleSendMessage} className="relative group">
                                    <div className="absolute inset-0 bg-primary/10 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Ask PreCue.ai anything about your deck..."
                                        className={`w-full border rounded-2xl py-4 pl-6 pr-14 text-sm transition-all relative z-10 
                                            ${chatTheme === 'dark'
                                                ? 'bg-white/5 border-white/10 text-zinc-100 focus:border-primary/50 focus:bg-white/[0.08] placeholder:text-zinc-600'
                                                : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-primary/50 focus:bg-white placeholder:text-zinc-400'}`}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim()}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 bg-primary hover:bg-orange-500 disabled:opacity-50 disabled:hover:bg-primary rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95 z-20"
                                    >
                                        <Send size={18} className="text-white" />
                                    </button>
                                </form>
                                <p className="text-[9px] text-zinc-600 text-center mt-4 font-bold uppercase tracking-[0.2em]">
                                    PreCue.ai can make errors. Verify important information.
                                </p>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Chat Trigger Icon (Visible when chat is closed) */}
                {!showChat && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowChat(true)}
                        className="fixed bottom-8 right-8 w-14 h-14 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden z-50 group"
                    >
                        <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Image src="/favicon.ico" alt="Reopen PreCue.ai" width={32} height={32} className="object-contain relative z-10" />
                    </motion.button>
                )}
            </div>
        </div>
    );
}
