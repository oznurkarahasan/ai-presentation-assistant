'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mic, MicOff, Play, Pause, Square, ChevronLeft, ChevronRight,
  Wifi, WifiOff, Volume2, Settings, ArrowLeft,
  Maximize2, Minimize2, Monitor, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import client from "../api/client";
import { useAudioCapture } from "../hooks/useAudioCapture";
import { usePresentationWebSocket } from "../hooks/usePresentationWebSocket";
import type { TranscriptMessage, SlideChangeMessage } from "../hooks/usePresentationWebSocket";
import { useVoiceCommands } from "../hooks/useVoiceCommands";
import type { VoiceCommand } from "../hooks/useVoiceCommands";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface TranscriptEntry {
  id: number;
  text: string;
  timestamp: Date;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function PresentationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presentationId = searchParams.get("id");
  const guestToken = searchParams.get("guest_token");

  // ── State ──
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const [presentationTitle, setPresentationTitle] = useState("Loading...");
  const [presentationFile, setPresentationFile] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [totalSlides, setTotalSlides] = useState(1);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [liveText, setLiveText] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState<string>("auto");
  const [mode, setMode] = useState<"live" | "rehearsal">("rehearsal");
  const [matchInfo, setMatchInfo] = useState<string>("");

  const transcriptCounter = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Auth Check ──
  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      const storedToken = localStorage.getItem("access_token");

      if (!presentationId) {
        router.push("/upload");
        return;
      }

      if (!storedToken || storedToken === "undefined" || storedToken === "null") {
        if (!guestToken) {
          router.push("/login");
          return;
        }
      }

      // Keep state update in an async callback to avoid sync setState in effect body.
      if (!cancelled) {
        setIsCheckingAuth(false);
      }
    };

    void checkAuth();
    return () => {
      cancelled = true;
    };
  }, [router, presentationId, guestToken]);

  // ── Fetch Presentation Data ──
  useEffect(() => {
    if (!presentationId || isCheckingAuth) return;

    const fetchPresentation = async () => {
      try {
        const response = await client.get(`/api/v1/presentations/${presentationId}`);
        setPresentationTitle(response.data.title);
        setPresentationFile(response.data.file_path);
        setFileType(response.data.file_type);
        if (response.data.slide_count) {
          setTotalSlides(response.data.slide_count);
        }
      } catch (error) {
        console.error("Failed to fetch presentation:", error);
        setPresentationTitle("Error loading presentation");
      }
    };
    fetchPresentation();
  }, [presentationId, isCheckingAuth]);

  // ── WebSocket Hook ──
  const handleTranscript = useCallback((data: TranscriptMessage) => {
    if (data.is_empty) return;

    setLiveText(data.text);

    transcriptCounter.current += 1;
    setTranscripts(prev => {
      const updated = [...prev, {
        id: transcriptCounter.current,
        text: data.text,
        timestamp: new Date(),
      }];
      // Keep last 50 transcripts
      return updated.slice(-50);
    });

    // Clear live text after 3 seconds
    setTimeout(() => setLiveText(""), 3000);
  }, []);

  const handleSlideChange = useCallback((data: SlideChangeMessage) => {
    setCurrentSlide(data.slide);
    setMatchInfo(`${data.match_type} (${Math.round(data.confidence * 100)}%)`);
    setTimeout(() => setMatchInfo(""), 3000);
  }, []);

  const ws = usePresentationWebSocket({
    presentationId: Number(presentationId) || 0,
    token,
    guestToken,
    mode,
    language,
    onTranscript: handleTranscript,
    onSlideChange: handleSlideChange,
    onError: (data) => console.error("WS Error:", data.message),
  });

  // ── Audio Capture Hook ──
const lastVolumeRef = useRef(0);

  const audio = useAudioCapture({
    chunkDuration: 4000,
    onAudioChunk: (blob) => {
      // Skip silent chunks — prevents Whisper hallucinations
      if (lastVolumeRef.current < 3) {
        console.log("[AudioCapture] Skipping silent chunk");
        return;
      }
      ws.sendAudio(blob);
    },
    onVolumeChange: (level) => {
      lastVolumeRef.current = level;
    },
  });
  // ── Voice Commands Hook (fast channel) ──
  const handleVoiceCommand = useCallback((command: VoiceCommand) => {
    switch (command) {
      case "next":
        if (currentSlide < totalSlides) {
          setCurrentSlide(prev => prev + 1);
          ws.sendControl("set_slide", { slide: currentSlide + 1 });
        }
        break;
      case "previous":
        if (currentSlide > 1) {
          setCurrentSlide(prev => prev - 1);
          ws.sendControl("set_slide", { slide: currentSlide - 1 });
        }
        break;
      case "first":
        setCurrentSlide(1);
        ws.sendControl("set_slide", { slide: 1 });
        break;
      case "last":
        setCurrentSlide(totalSlides);
        ws.sendControl("set_slide", { slide: totalSlides });
        break;
    }
  }, [currentSlide, totalSlides, ws]);

  const voiceCommands = useVoiceCommands({
    language: language === "tr" ? "tr-TR" : language === "en" ? "en-US" : "tr-TR",
    onCommand: handleVoiceCommand,
    enabled: isSessionActive,
  });

  // ── Session Controls ──
  const startSession = useCallback(() => {
    ws.connect();
    audio.start();
    if (voiceCommands.isSupported) {
      voiceCommands.start();
    }
    setIsSessionActive(true);
    setTranscripts([]);
    setLiveText("");
  }, [ws, audio, voiceCommands]);

  const stopSession = useCallback(() => {
    audio.stop();
    voiceCommands.stop();
    ws.disconnect();
    setIsSessionActive(false);
    setLiveText("");
  }, [audio, voiceCommands, ws]);

  const togglePause = useCallback(() => {
    if (audio.isPaused) {
      audio.resume();
      ws.sendControl("resume");
    } else {
      audio.pause();
      ws.sendControl("pause");
    }
  }, [audio, ws]);

  // ── Manual Slide Navigation ──
  const goToSlide = useCallback((slide: number) => {
    if (slide >= 1 && slide <= totalSlides) {
      setCurrentSlide(slide);
      if (ws.isConnected) {
        ws.sendControl("set_slide", { slide });
      }
    }
  }, [totalSlides, ws]);

  // ── Fullscreen ──
  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Keyboard Shortcuts ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goToSlide(currentSlide + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToSlide(currentSlide - 1);
      } else if (e.key === "f" || e.key === "F") {
        toggleFullScreen();
      } else if (e.key === "Escape" && isSessionActive) {
        stopSession();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentSlide, goToSlide, toggleFullScreen, isSessionActive, stopSession]);

  // ── Loading ──
  if (isCheckingAuth) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // ── Render ──
  return (
    <div ref={containerRef} className="flex flex-col h-screen bg-[#050505] text-zinc-100 overflow-hidden">
      <div className="bg-grid" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/analyze?id=" + presentationId)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-sm font-semibold truncate max-w-[300px]">{presentationTitle}</h1>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>Slide {currentSlide}/{totalSlides}</span>
              <span>·</span>
              <span className="capitalize">{mode}</span>
              {isSessionActive && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    {ws.isConnected ? (
                      <><Wifi size={10} className="text-green-500" /> Connected</>
                    ) : (
                      <><WifiOff size={10} className="text-red-500" /> Disconnected</>
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400"
          >
            <Settings size={18} />
          </button>
          {/* Fullscreen */}
          <button
            onClick={toggleFullScreen}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400"
          >
            {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative z-10 border-b border-white/5 bg-black/90 overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-wrap gap-6">
              {/* Language */}
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={isSessionActive}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                >
                  <option value="auto">Auto Detect</option>
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                </select>
              </div>
              {/* Mode */}
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "live" | "rehearsal")}
                  disabled={isSessionActive}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                >
                  <option value="rehearsal">Rehearsal</option>
                  <option value="live">Live</option>
                </select>
              </div>
              {/* Voice Commands Status */}
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Voice Commands</label>
                <span className={`text-sm ${voiceCommands.isSupported ? "text-green-400" : "text-red-400"}`}>
                  {voiceCommands.isSupported ? "Supported" : "Not Supported (use Chrome)"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Slide Viewer */}
        <div className="flex-1 overflow-hidden relative p-4 md:p-6">
          <div className="w-full h-full rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-zinc-900/50 flex items-center justify-center relative">
            {presentationFile ? (
              fileType === "pdf" ? (
                <iframe
                  key={currentSlide}
                  src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/${presentationFile}#page=${currentSlide}&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                  className="w-full h-full border-none"
                  title="Presentation"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-zinc-500">
                  <Monitor size={48} />
                  <p className="text-sm">Slide {currentSlide} of {totalSlides}</p>
                  <p className="text-xs">PPTX preview coming soon</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center gap-3 text-zinc-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                <p className="text-sm">Loading presentation...</p>
              </div>
            )}

            {/* Slide Navigation Arrows */}
            <button
              onClick={() => goToSlide(currentSlide - 1)}
              disabled={currentSlide <= 1}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => goToSlide(currentSlide + 1)}
              disabled={currentSlide >= totalSlides}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={20} />
            </button>

            {/* Match Info Badge */}
            <AnimatePresence>
              {matchInfo && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-3 right-3 bg-primary/90 text-white text-xs px-3 py-1 rounded-full"
                >
                  {matchInfo}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Live Subtitle Bar */}
        <AnimatePresence>
          {isSessionActive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="px-4 md:px-6 pb-2"
            >
              <div className="bg-black/80 border border-white/5 rounded-xl px-4 py-3 min-h-[48px] flex items-center gap-3">
                {/* Volume indicator */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Volume2 size={14} className={audio.isRecording ? "text-primary" : "text-zinc-600"} />
                  <div className="flex gap-0.5 items-end h-4">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full transition-all duration-100"
                        style={{
                          height: `${Math.max(4, Math.min(16, (audio.volumeLevel / 100) * 16 * (1 + i * 0.3)))}px`,
                          backgroundColor: audio.volumeLevel > i * 20 ? "#ea580c" : "#3f3f46",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Live transcript text */}
                <div className="flex-1 overflow-hidden">
                  {liveText ? (
                    <motion.p
                      key={liveText}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-zinc-300 truncate"
                    >
                      {liveText}
                    </motion.p>
                  ) : (
                    <p className="text-sm text-zinc-600 italic">
                      {audio.isRecording ? "Listening..." : "Microphone paused"}
                    </p>
                  )}
                </div>

                {/* Backend status */}
                <div className="flex-shrink-0">
                  {ws.backendStatus === "processing" && (
                    <div className="flex items-center gap-1.5 text-xs text-primary">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      Processing
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Control Bar */}
        <div className="px-4 md:px-6 pb-4 pt-2">
          <div className="bg-zinc-900/80 border border-white/5 rounded-2xl px-4 py-3 flex items-center justify-between gap-4">
            {/* Left: Slide indicator */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-1.5 bg-zinc-800 rounded-lg px-3 py-1.5">
                <span className="text-sm font-mono font-bold text-primary">{currentSlide}</span>
                <span className="text-zinc-600 text-sm">/</span>
                <span className="text-sm font-mono text-zinc-400">{totalSlides}</span>
              </div>

              {/* Slide progress bar */}
              <div className="hidden sm:block w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(currentSlide / totalSlides) * 100}%` }}
                />
              </div>
            </div>

            {/* Center: Session controls */}
            <div className="flex items-center gap-2">
              {!isSessionActive ? (
                <button
                  onClick={startSession}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-xl transition-all active:scale-95 font-medium text-sm"
                >
                  <Play size={16} />
                  Start Session
                </button>
              ) : (
                <>
                  <button
                    onClick={togglePause}
                    className={`p-2.5 rounded-xl transition-all active:scale-95 ${
                      audio.isPaused
                        ? "bg-primary/20 text-primary hover:bg-primary/30"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                    title={audio.isPaused ? "Resume" : "Pause"}
                  >
                    {audio.isPaused ? <Play size={18} /> : <Pause size={18} />}
                  </button>

                  <button
                    onClick={stopSession}
                    className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all active:scale-95"
                    title="Stop Session"
                  >
                    <Square size={18} />
                  </button>
                </>
              )}
            </div>

            {/* Right: Mic status + info */}
            <div className="flex items-center gap-3">
              {isSessionActive && (
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${
                    audio.isRecording ? "bg-red-500 animate-pulse" : 
                    audio.isPaused ? "bg-yellow-500" : "bg-zinc-600"
                  }`} />
                  <span className="text-xs text-zinc-500">
                    {audio.isRecording ? "REC" : audio.isPaused ? "PAUSED" : "OFF"}
                  </span>
                </div>
              )}

              {/* Mic icon with status */}
              <div className={`p-2 rounded-lg ${
                audio.isRecording ? "bg-primary/10 text-primary" : "text-zinc-600"
              }`}>
                {audio.isRecording ? <Mic size={18} /> : <MicOff size={18} />}
              </div>
            </div>
          </div>

          {/* Error display */}
          <AnimatePresence>
            {(audio.error || ws.error) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 flex items-center gap-2"
              >
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{audio.error || ws.error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
