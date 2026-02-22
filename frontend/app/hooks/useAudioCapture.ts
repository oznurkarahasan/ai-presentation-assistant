"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Audio capture hook for live presentation mode.
 *
 * Features:
 * - MediaRecorder API with WebM/Opus format
 * - Configurable chunk duration (default 4s)
 * - Volume level monitoring (for UI visualization)
 * - Silence detection (VAD) to skip empty chunks
 * - Browser permission handling
 * - Start/stop/pause/resume controls
 *
 * Usage:
 *   const audio = useAudioCapture({
 *     chunkDuration: 4000,
 *     onAudioChunk: (blob) => sendToWebSocket(blob),
 *   });
 *   audio.start();
 */

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type AudioCaptureStatus =
  | "idle"         // Not started
  | "requesting"   // Requesting mic permission
  | "recording"    // Actively recording
  | "paused"       // Paused
  | "stopped"      // Stopped
  | "error";       // Error occurred

export interface AudioCaptureOptions {
  /** Chunk duration in ms (default: 4000) */
  chunkDuration?: number;

  /** Called when an audio chunk is ready to send */
  onAudioChunk?: (blob: Blob) => void;

  /** Called when volume level changes (0-100, for UI visualization) */
  onVolumeChange?: (level: number) => void;

  /** Called when status changes */
  onStatusChange?: (status: AudioCaptureStatus) => void;

  /** Called on error */
  onError?: (error: string) => void;

  /** Minimum chunk size in bytes to consider non-silent (default: 1000) */
  minChunkSize?: number;

  /** Enable volume monitoring (slightly more CPU, default: true) */
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
  /** The MIME type being used for recording */
  mimeType: string;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Detect the best supported MIME type for MediaRecorder */
function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];

  for (const type of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  // Fallback — let the browser decide
  return "";
}

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

export function useAudioCapture(options: AudioCaptureOptions = {}): AudioCaptureReturn {
  const {
    chunkDuration = 4000,
    onAudioChunk,
    onVolumeChange,
    onStatusChange,
    onError,
    minChunkSize = 1000,
    enableVolumeMonitor = true,
  } = options;

  const [status, setStatus] = useState<AudioCaptureStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [mimeType, setMimeType] = useState("");

  // Refs for cleanup
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Status change callback
  const updateStatus = useCallback(
    (newStatus: AudioCaptureStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange]
  );

  // ── Volume monitoring ──
  const startVolumeMonitor = useCallback(
    (stream: MediaStream) => {
      if (!enableVolumeMonitor) return;

      try {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const monitor = () => {
          if (!analyserRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate average volume (0-255 → 0-100)
          const sum = dataArray.reduce((a, b) => a + b, 0);
          const avg = sum / dataArray.length;
          const level = Math.round((avg / 255) * 100);

          setVolumeLevel(level);
          onVolumeChange?.(level);

          animationFrameRef.current = requestAnimationFrame(monitor);
        };

        monitor();
      } catch (err) {
        console.warn("Volume monitor failed:", err);
      }
    },
    [enableVolumeMonitor, onVolumeChange]
  );

  const stopVolumeMonitor = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setVolumeLevel(0);
  }, []);

  // ── Start recording ──
  const start = useCallback(async () => {
    setError(null);
    updateStatus("requesting");

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      // Determine MIME type
      const mime = getSupportedMimeType();
      setMimeType(mime);

      // Create MediaRecorder
      const recorderOptions: MediaRecorderOptions = {};
      if (mime) {
        recorderOptions.mimeType = mime;
      }

      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;

      // Handle audio chunks
      recorder.ondataavailable = (event) => {
        if (event.data.size > minChunkSize) {
          onAudioChunk?.(event.data);
        }
      };

      recorder.onerror = () => {
        setError("Recording error occurred");
        updateStatus("error");
        onError?.("Recording error occurred");
      };

      recorder.onstop = () => {
        // Don't update status here — it's handled by stop()
      };

      // Start recording with chunk intervals
      recorder.start(chunkDuration);

      // Start volume monitoring
      startVolumeMonitor(stream);

      updateStatus("recording");

    } catch (err) {
      let message = "Failed to access microphone";

      if (err instanceof DOMException) {
        switch (err.name) {
          case "NotAllowedError":
            message = "Microphone permission denied. Please allow microphone access in your browser settings.";
            break;
          case "NotFoundError":
            message = "No microphone found. Please connect a microphone and try again.";
            break;
          case "NotReadableError":
            message = "Microphone is in use by another application.";
            break;
          default:
            message = `Microphone error: ${err.message}`;
        }
      }

      setError(message);
      updateStatus("error");
      onError?.(message);
    }
  }, [chunkDuration, minChunkSize, onAudioChunk, onError, startVolumeMonitor, updateStatus]);

  // ── Stop recording ──
  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    stopVolumeMonitor();
    updateStatus("stopped");
  }, [stopVolumeMonitor, updateStatus]);

  // ── Pause recording ──
  const pause = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      updateStatus("paused");
    }
  }, [updateStatus]);

  // ── Resume recording ──
  const resume = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      updateStatus("recording");
    }
  }, [updateStatus]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      stopVolumeMonitor();
    };
  }, [stopVolumeMonitor]);

  return {
    status,
    error,
    volumeLevel,
    start,
    stop,
    pause,
    resume,
    isRecording: status === "recording",
    isPaused: status === "paused",
    mimeType,
  };
}