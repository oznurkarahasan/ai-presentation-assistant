"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type VoiceCommand = "next" | "previous" | "first" | "last";

export interface VoiceCommandOptions {
  language?: string;
  onCommand?: (command: VoiceCommand) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  enabled?: boolean;
}

export interface VoiceCommandReturn {
  isSupported: boolean;
  isListening: boolean;
  start: () => void;
  stop: () => void;
  lastCommand: VoiceCommand | null;
  lastTranscript: string;
}

const COMMAND_PATTERNS: Record<VoiceCommand, string[]> = {
  next: [
    "sonraki slayt", "sonraki sayfa", "ileri",
    "sonrakine geç", "devam et", "devam",
    "bir sonraki", "ilerle", "geç",
    "next slide", "next page", "go forward",
    "move on", "continue", "next one", "advance",
  ],
  previous: [
    "önceki slayt", "önceki sayfa", "geri",
    "bir önceki", "geri dön", "geri git",
    "previous slide", "previous page", "go back",
    "go backward", "back one",
  ],
  first: [
    "ilk slayt", "başa dön", "en başa",
    "first slide", "go to start", "beginning",
  ],
  last: [
    "son slayt", "sona git", "en sona",
    "last slide", "go to end",
  ],
};

function detectCommand(text: string): VoiceCommand | null {
  const lower = text.toLowerCase().trim();
  if (lower.length > 100) return null;
  for (const [command, patterns] of Object.entries(COMMAND_PATTERNS)) {
    for (const pattern of patterns) {
      if (lower.includes(pattern)) return command as VoiceCommand;
    }
  }
  return null;
}

function getSpeechRecognitionConstructor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function useVoiceCommands(options: VoiceCommandOptions = {}): VoiceCommandReturn {
  const { language = "tr-TR", onCommand, onTranscript, enabled = true } = options;

  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [lastTranscript, setLastTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isStoppingRef = useRef(false);

  const isSupported = getSpeechRecognitionConstructor() !== null;

  const callbacksRef = useRef({ onCommand, onTranscript });
  useEffect(() => {
    callbacksRef.current = { onCommand, onTranscript };
  }, [onCommand, onTranscript]);

  const lastCommandTimeRef = useRef(0);
  const COMMAND_COOLDOWN = 2000;

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor || !enabled) return;

    if (recognitionRef.current) {
      isStoppingRef.current = true;
      recognitionRef.current.stop();
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isStoppingRef.current = false;
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;

      setLastTranscript(transcript);
      callbacksRef.current.onTranscript?.(transcript, isFinal);

      const command = detectCommand(transcript);
      if (command) {
        const now = Date.now();
        if (now - lastCommandTimeRef.current > COMMAND_COOLDOWN) {
          lastCommandTimeRef.current = now;
          setLastCommand(command);
          callbacksRef.current.onCommand?.(command);
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Voice command recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!isStoppingRef.current && enabled) {
        try { recognition.start(); } catch { /* may fail if already started */ }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      console.warn("Failed to start voice commands");
    }
  }, [enabled, language]);

  const stop = useCallback(() => {
    isStoppingRef.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      isStoppingRef.current = true;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return { isSupported, isListening, start, stop, lastCommand, lastTranscript };
}