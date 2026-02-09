"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Monitor, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import client from "../api/client";
import { usePresentation } from "./PresentationContext";
import PresentationHeader from "./PresentationHeader";
import PresentationControls from "./PresentationControls";
import TranscriptPanel from "./TranscriptPanel";
import PresentationHero from "./PresentationHero";
import PDFViewer from "./PDFViewer";

const LiveAudioStreamer = dynamic(() => import("./LiveAudioStreamer"), {
    ssr: false,
});

export default function PresentationContent() {
    const searchParams = useSearchParams();
    const presentationId = searchParams.get("id");

    const {
        currentSlide, isAudioActive, isStarted,
        handleSlideChange, addTranscript, setPresentationTitle,
        setSlideCount, setElapsedTime
    } = usePresentation();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fileData, setFileData] = useState<{ url: string; isPdf: boolean } | null>(null);


    // Fetch presentation data
    useEffect(() => {
        const fetchPresentation = async () => {
            if (!presentationId) {
                setError("No presentation ID provided");
                setLoading(false);
                return;
            }

            try {
                const guestToken = searchParams.get("guest_token");
                const config = guestToken
                    ? { headers: { 'Authorization': `Bearer ${guestToken}` } }
                    : {};

                const response = await client.get(`/api/v1/presentations/${presentationId}`, config);
                const presentation = response.data;

                setPresentationTitle(presentation.title);
                setSlideCount(presentation.slide_count);

                const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const pdfUrl = `${baseUrl}/${presentation.file_path}`;
                const isPdf = presentation.file_type === "application/pdf" ||
                    presentation.file_path.toLowerCase().endsWith(".pdf") ||
                    presentation.title.toLowerCase().endsWith(".pdf");

                setFileData({ url: pdfUrl, isPdf });
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch presentation:", err);
                setError("Could not load presentation. You might not have permission or the file was deleted.");
                setLoading(false);
            }
        };

        fetchPresentation();
    }, [presentationId, searchParams, setPresentationTitle, setSlideCount]);

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isStarted) {
            interval = setInterval(() => {
                setElapsedTime((prev) => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isStarted, setElapsedTime]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isStarted) return;
            if (e.key === "ArrowRight" || e.key === " ") {
                handleSlideChange(currentSlide + 1);
            } else if (e.key === "ArrowLeft") {
                handleSlideChange(currentSlide - 1);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isStarted, currentSlide, handleSlideChange]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-black relative text-zinc-100 overflow-hidden">
                <div className="bg-grid" />
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-[2rem] flex items-center justify-center border border-primary/20 shadow-[0_0_50px_rgba(234,88,12,0.2)] mb-8 animate-pulse">
                        <Monitor className="text-primary" size={32} />
                    </div>
                    <h2 className="text-xl font-black italic uppercase tracking-widest text-white mb-2">Syncing Deck</h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Wait for stage readiness</p>
                </div>
            </div>
        );
    }

    if (error || !fileData) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-black relative text-zinc-100 overflow-hidden">
                <div className="bg-grid" />
                <div className="relative z-10 text-center max-w-md px-6">
                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                        <AlertCircle className="text-red-500" size={32} />
                    </div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-4">Stage Error</h2>
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest leading-relaxed mb-8">{error || "The requested presentation could not be retrieved."}</p>
                    <button
                        onClick={() => window.history.back()}
                        className="bg-white text-black hover:bg-primary hover:text-white px-8 py-3 rounded-xl text-xs font-black transition-all active:scale-95 uppercase tracking-widest"
                    >
                        Return to Deck
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-black relative text-zinc-100 font-sans overflow-hidden">
            <style dangerouslySetInnerHTML={{
                __html: `
                body { overflow: hidden !important; }
                ::-webkit-scrollbar { display: none !important; }
                * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
                iframe { border: none !important; }
            `}} />

            <div className="bg-grid" />

            <LiveAudioStreamer
                presentationId={Number(presentationId)}
                currentSlide={currentSlide}
                isActive={isAudioActive}
                onSlideChange={handleSlideChange}
                onTranscript={addTranscript}
            />

            <PresentationHeader />

            <main className={`flex-1 flex flex-col md:flex-row items-center justify-center relative z-10 overflow-hidden transition-all duration-500 ${!window.document.fullscreenElement ? 'pt-20 pb-28 px-6' : ''}`}>
                <PDFViewer pdfUrl={fileData.url} isPdf={fileData.isPdf} />
                <TranscriptPanel />
                <PresentationHero />
            </main>

            <PresentationControls />

            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none translate-x-[-1/2] translate-y-[1/2]" />
        </div>
    );
}
