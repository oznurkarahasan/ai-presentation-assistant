'use client';

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Upload,
    FileText,
    X,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    Presentation,
    Zap,
    Play,
    Eye,
    Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import client from "../api/client";

export default function UploadPage() {
    const router = useRouter();
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [isPdf, setIsPdf] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);

    useEffect(() => {
        if (file) {
            const pdfType = "application/pdf";
            const pptxType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            const pptType = "application/vnd.ms-powerpoint";

            if (file.type === pdfType) {
                const url = URL.createObjectURL(file);
                setFilePreview(url);
                setIsPdf(true);
                return () => URL.revokeObjectURL(url);
            } else if (file.type === pptxType || file.type === pptType) {
                setFilePreview("pptx-placeholder");
                setIsPdf(false);
            } else {
                setFilePreview(null);
                setIsPdf(false);
            }
        }
    }, [file]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFileSelection(e.target.files[0]);
        }
    };

    const handleFileSelection = (selectedFile: File) => {
        const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint'];
        const maxSize = 50 * 1024 * 1024; // 50MB

        setError(null);

        if (!validTypes.includes(selectedFile.type)) {
            setError("Invalid file format. Please upload a PDF or PowerPoint file.");
            return;
        }

        if (selectedFile.size > maxSize) {
            setError("File is too large. Maximum limit is 50MB.");
            return;
        }

        setFile(selectedFile);
        setUploadStatus('idle');
    };

    const handleUpload = async () => {
        if (!file) return;

        // Check for real internet connection
        if (!navigator.onLine) {
            setError("No internet connection. Please check your connectivity.");
            setUploadStatus('error');
            return;
        }

        setUploading(true);
        setUploadStatus('uploading');
        setUploadProgress(0);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Check if user is authenticated
            const response = await client.post('/api/v1/presentations/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent: any) => {
                    const progress = progressEvent.total
                        ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        : 0;
                    setUploadProgress(progress);
                },
            });

            if (response.data.status === 'success') {
                setUploadStatus('success');
                // Store presentation info - works for both guest and authenticated
                const presentationId = response.data.id || response.data.presentation_id;
                const presentationTitle = response.data.title || response.data.presentation_title || file.name;

                localStorage.setItem('last_presentation_id', presentationId);
                localStorage.setItem('last_presentation_title', presentationTitle);

                // If guest token is provided, store it
                if (response.data.guest_token) {
                    localStorage.setItem('guest_presentation_token', response.data.guest_token);
                }
            }
        } catch (err: unknown) {
            console.error("Upload failed:", err);
            setUploadStatus('error');
            const error = err as { response?: { status?: number; data?: { detail?: string } } };

            // Handle 401 specifically for guest users
            if (error.response?.status === 401) {
                setError("This feature requires authentication. Please sign in to upload presentations.");
            } else {
                const detail = error.response?.data?.detail || "Failed to upload and process the presentation.";
                setError(detail);
            }
        } finally {
            setUploading(false);
        }
    };

    const removeFile = () => {
        setFile(null);
        setUploadProgress(0);
        setUploadStatus('idle');
        setFilePreview(null);
        setError(null);
    };

    const handleAnalyzeClick = (e: React.MouseEvent) => {
        const token = localStorage.getItem("access_token");

        // Check if user is authenticated
        if (!token || token === 'undefined' || token === 'null' || token === '') {
            e.preventDefault();
            setShowAuthModal(true);
            return;
        }

        // Authenticated user - redirect to analyze page
        const presentationId = localStorage.getItem("last_presentation_id");
        if (presentationId) {
            router.push(`/analyze?id=${presentationId}`);
        } else {
            router.push("/analyze");
        }
    };

    const handleRealTimeClick = () => {
        // Real-time mode available for both guest and authenticated users
        const presentationId = localStorage.getItem("last_presentation_id");
        const guestToken = localStorage.getItem("guest_presentation_token");

        if (presentationId) {
            const params = new URLSearchParams();
            params.set('id', presentationId);
            if (guestToken) {
                params.set('guest_token', guestToken);
            }
            router.push(`/presentation?${params.toString()}`);
        } else {
            router.push("/presentation");
        }
    };

    return (
        <div className="flex flex-col h-screen bg-black relative text-zinc-100 overflow-hidden">
            <div className="bg-grid" />

            <main className="flex-1 flex items-center justify-center p-4 md:p-8 relative z-10 w-full overflow-hidden">
                <div className="max-w-6xl w-full mx-auto h-full flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                        {uploadStatus !== 'success' ? (
                            <motion.div
                                key="upload-step"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-8"
                            >
                                <header className="flex items-center gap-6">
                                    <button
                                        onClick={() => router.back()}
                                        className="w-12 h-12 flex items-center justify-center hover:bg-white/5 rounded-full transition-all border border-transparent hover:border-white/10"
                                    >
                                        <ArrowLeft size={24} />
                                    </button>
                                    <div>
                                        <h1 className="text-4xl md:text-5xl font-black tracking-tight italic uppercase">New Presentation</h1>
                                        <p className="text-sm text-zinc-500 mt-1 uppercase tracking-[0.3em] font-bold">Initiate your narrative and sync for stage</p>
                                    </div>
                                </header>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-6">
                                        <div
                                            className={`relative border-2 border-dashed rounded-[2.5rem] p-12 transition-all duration-700 flex flex-col items-center justify-center gap-8 group overflow-hidden min-h-[400px]
                                                ${dragActive ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10'}
                                                ${file ? 'border-primary/50' : ''}`}
                                            onDragEnter={handleDrag}
                                            onDragLeave={handleDrag}
                                            onDragOver={handleDrag}
                                            onDrop={handleDrop}
                                        >
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2" />

                                            {!file ? (
                                                <>
                                                    <div className="w-24 h-24 bg-zinc-900 rounded-[2rem] flex items-center justify-center border border-white/5 shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 relative">
                                                        <div className="absolute inset-0 bg-primary/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <Upload className="text-primary relative z-10" size={32} />
                                                    </div>
                                                    <div className="text-center relative z-10">
                                                        <p className="text-2xl font-black text-zinc-100 italic uppercase mb-2 tracking-tighter">Target Slide Deck</p>
                                                        <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest mb-6">PDF or PPTX preferred for precision</p>
                                                        <label className="cursor-pointer bg-white text-black hover:bg-primary hover:text-white px-10 py-4 rounded-2xl text-sm font-black transition-all active:scale-95 shadow-2xl shadow-white/5 relative z-10 uppercase tracking-tight">
                                                            Select File
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                onChange={handleChange}
                                                                accept=".pdf,.pptx,.ppt"
                                                            />
                                                        </label>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="w-full flex flex-col items-center gap-6 relative z-10">
                                                    <div className="relative">
                                                        <div className="w-28 h-28 bg-primary/10 rounded-[2rem] flex items-center justify-center border border-primary/20 shadow-[0_0_50px_rgba(234,88,12,0.1)]">
                                                            <FileText className="text-primary" size={48} />
                                                        </div>
                                                        <button
                                                            onClick={removeFile}
                                                            className="absolute -top-3 -right-3 w-8 h-8 bg-zinc-800 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-all border border-white/10 shadow-2xl"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-2xl font-black text-white italic tracking-tighter">{file.name}</p>
                                                        <div className="flex items-center justify-center gap-3 mt-2">
                                                            <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-zinc-500 font-bold uppercase tracking-widest text-[9px]">
                                                                {file.name.split('.').pop()}
                                                            </span>
                                                            <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">
                                                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {!uploading && (
                                                        <button
                                                            onClick={handleUpload}
                                                            className="bg-primary hover:bg-orange-500 text-white px-12 py-5 rounded-[1.25rem] font-black transition-all active:scale-95 shadow-2xl shadow-primary/30 text-lg uppercase tracking-tighter"
                                                        >
                                                            Process to Stage
                                                        </button>
                                                    )}

                                                    {uploadStatus === 'uploading' && (
                                                        <div className="w-full max-w-xs space-y-4">
                                                            <div className="flex justify-between items-center px-1">
                                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary animate-pulse">Contextual Analysis...</span>
                                                                <span className="text-xl font-black italic">{uploadProgress}%</span>
                                                            </div>
                                                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                                                                <motion.div
                                                                    className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(234,88,12,0.5)]"
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${uploadProgress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {uploadStatus === 'error' && (
                                                        <div className="flex flex-col items-center gap-4">
                                                            <div className="flex items-center gap-2 text-red-500 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20">
                                                                <AlertCircle size={16} />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                                                            </div>
                                                            <button
                                                                onClick={handleUpload}
                                                                className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-colors underline underline-offset-4"
                                                            >
                                                                Retry
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {error && uploadStatus === 'idle' && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-center gap-3 text-red-400 bg-red-500/5 px-6 py-4 rounded-2xl border border-red-500/10"
                                            >
                                                <AlertCircle size={18} />
                                                <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
                                            </motion.div>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8">
                                            <h3 className="font-black mb-6 flex items-center gap-3 text-white text-lg uppercase italic border-b border-white/5 pb-4">
                                                <AlertCircle size={18} className="text-primary" />
                                                Mastery Plan
                                            </h3>
                                            <div className="space-y-6">
                                                <GuidelineItem title="Voice Mapping" desc="AI listens for intent, not keywords." />
                                                <GuidelineItem title="Format Edge" desc="PDF results in 100% layout sync." />
                                                <GuidelineItem title="Cue Extraction" desc="Notes become digital cards." />
                                            </div>
                                        </div>

                                        <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Presentation size={80} />
                                            </div>
                                            <h3 className="font-black text-white text-lg mb-3 italic uppercase">Next Gen Control</h3>
                                            <p className="text-[11px] text-zinc-500 leading-relaxed relative z-10 font-bold uppercase tracking-wider">
                                                Your voice is the remote. Sync flawlessly with every slide.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="final-step"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full max-w-4xl mx-auto flex flex-col items-center h-full max-h-[85vh]"
                            >
                                <header className="text-center mb-6">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-black text-green-500 uppercase tracking-[0.2em] mb-3">
                                        <CheckCircle2 size={12} />
                                        Stage Ready
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black tracking-tight italic uppercase italic">Select <span className="text-primary italic">Mode</span></h2>
                                </header>

                                {/* Large Preview Box */}
                                <div className="w-full flex-1 min-h-0 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col mb-8 shadow-2xl">
                                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                        <div className="flex gap-1.5 px-1">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/30" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">{file?.name}</span>
                                        <Eye size={14} className="text-zinc-600" />
                                    </div>
                                    <div className="flex-1 bg-black relative">
                                        {filePreview ? (
                                            isPdf ? (
                                                <iframe
                                                    src={`${filePreview}#toolbar=0&navpanes=0&scrollbar=0`}
                                                    className="w-full h-full border-none opacity-90"
                                                    title="Full Preview"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center bg-gradient-to-br from-zinc-900 to-black">
                                                    <div className="w-32 h-44 bg-primary/10 border-2 border-primary/20 rounded-[2rem] flex flex-col items-center justify-center gap-6 mb-6 relative group/pptx shadow-2xl">
                                                        <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
                                                        <Presentation size={64} className="text-primary relative z-10" />
                                                        <div className="bg-primary text-white text-[9px] font-black px-3 py-1 rounded-full relative z-10 uppercase tracking-widest">PPTX</div>
                                                    </div>
                                                    <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2 text-zinc-100">Deck Ready</h3>
                                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] max-w-[240px] leading-relaxed">
                                                        Visual preview for PowerPoint is limited in-browser. All structure has been analyzed for the session.
                                                    </p>
                                                    <div className="mt-6 flex gap-1.5">
                                                        <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                                        <div className="w-1 h-1 rounded-full bg-primary animate-pulse delay-75" />
                                                        <div className="w-1 h-1 rounded-full bg-primary animate-pulse delay-150" />
                                                    </div>
                                                </div>
                                            )
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <FileText size={64} className="text-zinc-800 opacity-20" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons Container */}
                                <div className="grid grid-cols-2 gap-6 w-full max-w-2xl px-4">
                                    <button
                                        onClick={handleAnalyzeClick}
                                        className="group relative overflow-hidden bg-zinc-900/50 hover:bg-primary transition-all duration-300 p-[1px] rounded-2xl active:scale-[0.98] border border-white/5 hover:border-primary text-left"
                                    >
                                        <div className="bg-[#050505] group-hover:bg-primary transition-colors flex items-center justify-center gap-4 py-5 px-8 rounded-[0.9rem] h-full w-full">
                                            <Zap className="text-primary group-hover:text-white" size={24} />
                                            <div className="text-left">
                                                <p className="text-xl font-black uppercase italic group-hover:text-white tracking-widest italic tracking-tighter leading-none">Analyze</p>
                                                <p className="text-[8px] uppercase font-bold text-zinc-600 group-hover:text-white/70 tracking-widest mt-1">Get AI Insights</p>
                                            </div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={handleRealTimeClick}
                                        className="group relative overflow-hidden bg-zinc-900/50 hover:bg-white transition-all duration-300 p-[1px] rounded-2xl active:scale-[0.98] border border-white/5 hover:border-white"
                                    >
                                        <div className="bg-[#050505] group-hover:bg-white transition-colors flex items-center justify-center gap-4 py-5 px-8 rounded-[0.9rem] h-full">
                                            <Play className="text-white group-hover:text-black" size={24} />
                                            <div className="text-left">
                                                <p className="text-xl font-black uppercase italic group-hover:text-black tracking-widest italic tracking-tighter leading-none">Real-Time</p>
                                                <p className="text-[8px] uppercase font-bold text-zinc-600 group-hover:text-black/70 tracking-widest mt-1">Start Stage Sync</p>
                                            </div>
                                        </div>
                                    </button>
                                </div>

                                <button
                                    onClick={removeFile}
                                    className="mt-6 text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-red-400 transition-colors flex items-center gap-2 group"
                                >
                                    <X size={10} className="group-hover:rotate-90 transition-transform" /> Start Over with new deck
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none translate-x-1/2 translate-y-1/2" />

            {/* Auth Warning Modal */}
            <AnimatePresence>
                {showAuthModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-zinc-900 border border-white/10 p-8 rounded-[2.5rem] max-w-sm w-full text-center relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/20 blur-[60px] rounded-full pointer-events-none" />

                            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-primary/20 relative z-10">
                                <Lock size={32} className="text-primary" />
                            </div>

                            <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-3 relative z-10 text-white">Premium Feature</h3>
                            <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest leading-relaxed mb-8 relative z-10">
                                AI Analysis is available for registered users. Sign up to unlock advanced insights and analytics.
                            </p>

                            <div className="flex flex-col gap-3 relative z-10">
                                <Link
                                    href="/register"
                                    className="bg-primary hover:bg-orange-500 text-white py-4 rounded-2xl font-black uppercase italic tracking-widest transition-all text-center"
                                >
                                    Sign Up Free
                                </Link>
                                <Link
                                    href="/login"
                                    className="border border-white/20 hover:bg-white/5 text-white py-4 rounded-2xl font-black uppercase italic tracking-widest transition-all text-center"
                                >
                                    Login
                                </Link>
                                <button
                                    onClick={() => setShowAuthModal(false)}
                                    className="text-zinc-500 hover:text-white py-2 text-[10px] font-black uppercase tracking-[0.3em] transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function GuidelineItem({ title, desc }: { title: string, desc: string }) {
    return (
        <div className="flex gap-4 group/item">
            <div className="mt-1.5 w-1 h-1 bg-primary rounded-full flex-shrink-0 shadow-[0_0_8px_rgba(234,88,12,0.8)]" />
            <div>
                <p className="font-black text-zinc-100 text-[11px] uppercase italic tracking-tight">{title}</p>
                <p className="text-[9px] text-zinc-500 mt-1.5 leading-relaxed font-bold uppercase tracking-wider">{desc}</p>
            </div>
        </div>
    );
}
