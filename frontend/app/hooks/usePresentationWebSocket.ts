"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type WSConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting" | "error";

export interface TranscriptMessage { text: string; chunk_index: number; duration_ms: number; is_empty: boolean; }
export interface SlideChangeMessage { slide: number; match_type: string; confidence: number; matched_keywords?: string[]; }
export interface SessionInfoMessage { session_id: string; presentation_id: number; total_slides: number; current_slide: number; mode: string; language: string; }
export interface StatusMessage { status: string; }
export interface ErrorMessage { message: string; }

export interface PresentationWSOptions {
  presentationId: number;
  token?: string | null;
  guestToken?: string | null;
  mode?: "live" | "rehearsal";
  language?: string;
  onTranscript?: (data: TranscriptMessage) => void;
  onSlideChange?: (data: SlideChangeMessage) => void;
  onSessionInfo?: (data: SessionInfoMessage) => void;
  onStatus?: (data: StatusMessage) => void;
  onError?: (data: ErrorMessage) => void;
  onConnectionChange?: (status: WSConnectionStatus) => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export interface PresentationWSReturn {
  connectionStatus: WSConnectionStatus;
  backendStatus: string;
  error: string | null;
  sessionInfo: SessionInfoMessage | null;
  connect: () => void;
  disconnect: () => void;
  sendAudio: (blob: Blob) => void;
  sendControl: (action: string, extra?: Record<string, unknown>) => void;
  isConnected: boolean;
}

export function usePresentationWebSocket(options: PresentationWSOptions): PresentationWSReturn {
  const {
    presentationId, token, guestToken, mode = "live", language = "auto",
    onTranscript, onSlideChange, onSessionInfo, onStatus, onError, onConnectionChange,
    autoReconnect = true, maxReconnectAttempts = 5, heartbeatInterval = 30000,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<WSConnectionStatus>("disconnected");
  const [backendStatus, setBackendStatus] = useState<string>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfoMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intentionalCloseRef = useRef(false);

  const callbacksRef = useRef({ onTranscript, onSlideChange, onSessionInfo, onStatus, onError, onConnectionChange });
  useEffect(() => {
    callbacksRef.current = { onTranscript, onSlideChange, onSessionInfo, onStatus, onError, onConnectionChange };
  }, [onTranscript, onSlideChange, onSessionInfo, onStatus, onError, onConnectionChange]);

  const updateConnectionStatus = useCallback((newStatus: WSConnectionStatus) => {
    setConnectionStatus(newStatus);
    callbacksRef.current.onConnectionChange?.(newStatus);
  }, []);

  const buildUrl = useCallback(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const wsBase = baseUrl.replace(/^http/, "ws");
    const params = new URLSearchParams();
    if (token) params.set("token", token);
    if (guestToken) params.set("guest_token", guestToken);
    params.set("mode", mode);
    params.set("language", language);
    return `${wsBase}/ws/presentation/${presentationId}?${params.toString()}`;
  }, [presentationId, token, guestToken, mode, language]);

  // Heartbeat — stopHeartbeat declared BEFORE startHeartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatTimerRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval, stopHeartbeat]);

  // Message handler
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "transcript":
          callbacksRef.current.onTranscript?.({ text: data.text, chunk_index: data.chunk_index, duration_ms: data.duration_ms, is_empty: data.is_empty });
          break;
        case "slide_change":
          callbacksRef.current.onSlideChange?.({ slide: data.slide, match_type: data.match_type, confidence: data.confidence, matched_keywords: data.matched_keywords });
          break;
        case "session_info": {
          const info: SessionInfoMessage = { session_id: data.session_id, presentation_id: data.presentation_id, total_slides: data.total_slides, current_slide: data.current_slide, mode: data.mode, language: data.language };
          setSessionInfo(info);
          callbacksRef.current.onSessionInfo?.(info);
          break;
        }
        case "status":
          setBackendStatus(data.status);
          callbacksRef.current.onStatus?.(data);
          break;
        case "error":
          setError(data.message);
          callbacksRef.current.onError?.(data);
          break;
        case "pong":
          break;
        default:
          console.warn("Unknown WS message type:", data.type);
      }
    } catch {
      console.error("Failed to parse WS message:", event.data);
    }
  }, []);

  // Connect ref to break circular dependency with scheduleReconnect
  const connectRef = useRef<() => void>(() => {});

  const scheduleReconnect = useCallback(() => {
    if (!autoReconnect || intentionalCloseRef.current) return;
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setError(`Failed to reconnect after ${maxReconnectAttempts} attempts`);
      updateConnectionStatus("error");
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 16000);
    reconnectAttemptsRef.current += 1;
    updateConnectionStatus("reconnecting");
    reconnectTimerRef.current = setTimeout(() => { connectRef.current(); }, delay);
  }, [autoReconnect, maxReconnectAttempts, updateConnectionStatus]);

  const connect = useCallback(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    intentionalCloseRef.current = false;
    setError(null);
    updateConnectionStatus("connecting");

    const url = buildUrl();
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      updateConnectionStatus("connected");
      startHeartbeat();
    };
    ws.onmessage = handleMessage;
    ws.onclose = (event) => {
      stopHeartbeat();
      if (intentionalCloseRef.current) { updateConnectionStatus("disconnected"); }
      else if (event.code === 4001) { setError("Authentication failed"); updateConnectionStatus("error"); }
      else if (event.code === 4004) { setError("Presentation not found"); updateConnectionStatus("error"); }
      else { scheduleReconnect(); }
    };
    ws.onerror = () => {};
  }, [buildUrl, handleMessage, startHeartbeat, stopHeartbeat, scheduleReconnect, updateConnectionStatus]);

  // Keep connectRef in sync so scheduleReconnect always calls latest version
  useEffect(() => { connectRef.current = connect; }, [connect]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    stopHeartbeat();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "control", action: "end_session" }));
      wsRef.current.close(1000, "User disconnected");
    }
    wsRef.current = null;
    updateConnectionStatus("disconnected");
    setSessionInfo(null);
    setBackendStatus("idle");
  }, [stopHeartbeat, updateConnectionStatus]);

  const sendAudio = useCallback((blob: Blob) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      blob.arrayBuffer().then((buffer) => { wsRef.current?.send(buffer); });
    }
  }, []);

  const sendControl = useCallback((action: string, extra: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "control", action, ...extra }));
    }
  }, []);

  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); }
      stopHeartbeat();
      if (wsRef.current) { wsRef.current.close(1000, "Component unmounted"); wsRef.current = null; }
    };
  }, [stopHeartbeat]);

  return {
    connectionStatus, backendStatus, error, sessionInfo,
    connect, disconnect, sendAudio, sendControl,
    isConnected: connectionStatus === "connected",
  };
}