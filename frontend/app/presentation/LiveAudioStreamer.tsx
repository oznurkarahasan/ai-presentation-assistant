"use client";
import { useEffect, useRef, useCallback } from "react";

interface Props {
    presentationId: number;
    currentSlide: number;
    isActive: boolean;
    onSlideChange: (slideNumber: number) => void;
    onTranscript?: (text: string) => void;
}

const LiveAudioStreamer = ({ currentSlide, isActive, onSlideChange, onTranscript }: Props) => {
    const socketRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const currentSlideRef = useRef(currentSlide);

    const stopStreaming = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    const initMediaRecorder = useCallback(async (socket: WebSocket) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";

            const createRecorder = () => {
                const recorder = new MediaRecorder(stream, {
                    mimeType,
                    audioBitsPerSecond: 128000 // Consistent bitrate
                });

                recorder.ondataavailable = (event) => {
                    if (event.data.size > 1000 && socket.readyState === WebSocket.OPEN) {
                        // Send raw audio data without metadata for now
                        socket.send(event.data);
                    }
                };

                recorder.onstop = () => {
                    if (isActive && socket.readyState === WebSocket.OPEN) {
                        // Minimal gap for continuity
                        setTimeout(() => {
                            if (isActive) createRecorder();
                        }, 100);
                    }
                };

                mediaRecorderRef.current = recorder;
                recorder.start();

                // Balanced chunk size for good context and responsiveness
                setTimeout(() => {
                    if (recorder.state === "recording") {
                        recorder.stop();
                    }
                }, 2000); // 2 seconds - balanced approach
            };

            createRecorder();

        } catch (err) {
            console.error("Microphone error:", err);
        }
    }, [isActive]);

    const startStreaming = useCallback(async () => {
        try {
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const host = process.env.NEXT_PUBLIC_API_URL
                ? process.env.NEXT_PUBLIC_API_URL.replace("http://", "").replace("https://", "")
                : "localhost:8000";

            const params = new URLSearchParams(window.location.search);
            const token = params.get("guest_token") || localStorage.getItem("access_token") || "";

            const wsUrl = `${protocol}//${host}/api/v1/live/navigate?token=${token}`;

            console.log("Connecting to:", wsUrl.split('?')[0] + "?token=***");
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
                console.log("WebSocket Connected");
                initMediaRecorder(socket);
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("Received WebSocket message:", data);

                    if (data.action === "next_slide") {
                        console.log("Executing NEXT slide command ->", currentSlideRef.current + 1);
                        onSlideChange(currentSlideRef.current + 1);
                    }
                    else if (data.action === "prev_slide") {
                        console.log("Executing PREV slide command ->", currentSlideRef.current - 1);
                        onSlideChange(currentSlideRef.current - 1);
                    }

                    if (data.text && onTranscript) {
                        // Add timestamp information to transcript
                        const timestampedText = data.timestamp
                            ? `[${new Date(data.timestamp).toLocaleTimeString()}] ${data.text}`
                            : data.text;
                        onTranscript(timestampedText);
                    }
                } catch (e) {
                    console.error("JSON Parse Error:", e);
                }
            };

            socket.onerror = (error) => console.error("WebSocket Error:", error);

            socket.onclose = (event) => {
                console.log("WebSocket Closed", event.code, event.reason);
                if (isActive) stopStreaming();
            };

        } catch (error) {
            console.error("Initialization error:", error);
        }
    }, [isActive, initMediaRecorder, onSlideChange, onTranscript, stopStreaming]);

    useEffect(() => {
        currentSlideRef.current = currentSlide;
    }, [currentSlide]);

    useEffect(() => {
        if (isActive) {
            startStreaming();
        } else {
            stopStreaming();
        }

        return () => {
            stopStreaming();
        };
    }, [isActive, startStreaming, stopStreaming]);

    return null;
};

export default LiveAudioStreamer;