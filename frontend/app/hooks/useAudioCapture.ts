"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type AudioCaptureStatus =
  | "idle" | "requesting" | "recording" | "paused" | "stopped" | "error";

export interface AudioCaptureOptions {
  chunkDuration?: number;
  onAudioChunk?: (blob: Blob) => void;
  onVolumeChange?: (level: number) => void;
  onStatusChange?: (status: AudioCaptureStatus) => void;
  onError?: (error: string) => void;
  minChunkSize?: number;
  enableVolumeMonitor?: boolean;
}

export interface AudioCaptureReturn {
  status: AudioCaptureStatus;
  error: string | null;
  volumeLevel: number;
  start: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isRecording: boolean;
  isPaused: boolean;
  mimeType: string;
}

function getSupportedMimeType(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg", "audio/mp4"];
  for (const t of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export function useAudioCapture(options: AudioCaptureOptions = {}): AudioCaptureReturn {
  const {
    chunkDuration = 4000,
    onAudioChunk,
    onVolumeChange,
    onStatusChange,
    onError,
    enableVolumeMonitor = true,
  } = options;

  const [status, setStatus] = useState<AudioCaptureStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [mimeType, setMimeType] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  const mimeRef = useRef("");

  // Use ref for callback to avoid stale closure
  const onChunkRef = useRef(onAudioChunk);
  useEffect(() => { onChunkRef.current = onAudioChunk; }, [onAudioChunk]);

  const updateStatus = useCallback((s: AudioCaptureStatus) => {
    setStatus(s);
    onStatusChange?.(s);
  }, [onStatusChange]);

  // ── Volume monitor ──
  const stopVolumeMonitor = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;
    setVolumeLevel(0);
  }, []);

  const startVolumeMonitor = useCallback((stream: MediaStream) => {
    if (!enableVolumeMonitor) return;
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      ctx.createMediaStreamSource(stream).connect(analyser);
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        setVolumeLevel(Math.round((avg / 255) * 100));
        onVolumeChange?.(Math.round((avg / 255) * 100));
        animationFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* ignore */ }
  }, [enableVolumeMonitor, onVolumeChange]);

  /**
   * Core function: Record for `duration` ms, return a complete WebM blob.
   * Each call creates a fresh MediaRecorder, so each blob is a standalone file.
   */
  const recordChunk = useCallback((stream: MediaStream, mime: string, duration: number): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (isPausedRef.current) { resolve(null); return; }

      try {
        const opts: MediaRecorderOptions = {};
        if (mime) opts.mimeType = mime;
        const rec = new MediaRecorder(stream, opts);
        const parts: Blob[] = [];

        rec.ondataavailable = (e) => {
          if (e.data.size > 0) parts.push(e.data);
        };

        rec.onstop = () => {
          if (parts.length > 0) {
            resolve(new Blob(parts, { type: mime || "audio/webm" }));
          } else {
            resolve(null);
          }
        };

        rec.onerror = () => resolve(null);

        rec.start(); // No timeslice — collect everything until stop

        setTimeout(() => {
          if (rec.state === "recording") rec.stop();
        }, duration);
      } catch {
        resolve(null);
      }
    });
  }, []);

  // ── Recording loop ──
  const runLoop = useCallback(async (stream: MediaStream, mime: string) => {
    while (stream.active && streamRef.current === stream) {
      if (isPausedRef.current) {
        await new Promise(r => setTimeout(r, 200));
        continue;
      }

      const blob = await recordChunk(stream, mime, chunkDuration);

      if (blob && blob.size > 2000) {
        console.log(`[AudioCapture] Sending chunk: ${blob.size} bytes`);
        onChunkRef.current?.(blob);
      } else if (blob) {
        console.log(`[AudioCapture] Skipping small chunk: ${blob.size} bytes`);
      }
    }
  }, [chunkDuration, recordChunk]);

  // ── Start ──
  const start = useCallback(async () => {
    setError(null);
    updateStatus("requesting");
    isPausedRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const mime = getSupportedMimeType();
      setMimeType(mime);
      mimeRef.current = mime;
      startVolumeMonitor(stream);
      updateStatus("recording");

      // Start the async recording loop (runs in background)
      runLoop(stream, mime);

    } catch (err) {
      let msg = "Failed to access microphone";
      if (err instanceof DOMException) {
        switch (err.name) {
          case "NotAllowedError": msg = "Microphone permission denied."; break;
          case "NotFoundError": msg = "No microphone found."; break;
          case "NotReadableError": msg = "Microphone in use by another app."; break;
          default: msg = `Microphone error: ${err.message}`;
        }
      }
      setError(msg);
      updateStatus("error");
      onError?.(msg);
    }
  }, [onError, runLoop, startVolumeMonitor, updateStatus]);

  // ── Stop ──
  const stop = useCallback(() => {
    // Kill the stream — this will break the while loop in runLoop
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    isPausedRef.current = false;
    stopVolumeMonitor();
    updateStatus("stopped");
  }, [stopVolumeMonitor, updateStatus]);

  // ── Pause / Resume ──
  const pause = useCallback(() => {
    isPausedRef.current = true;
    updateStatus("paused");
  }, [updateStatus]);

  const resume = useCallback(() => {
    isPausedRef.current = false;
    updateStatus("recording");
  }, [updateStatus]);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      stopVolumeMonitor();
    };
  }, [stopVolumeMonitor]);

  return {
    status, error, volumeLevel, start, stop, pause, resume,
    isRecording: status === "recording",
    isPaused: status === "paused",
    mimeType,
  };
}