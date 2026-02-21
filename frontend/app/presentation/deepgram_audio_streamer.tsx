"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
    onTranscript: (data: { text: string; is_final: boolean; confidence: number }) => void;
    enabled: boolean;
};

const WS_URL =
    process.env.NEXT_PUBLIC_WS_STT_URL || "ws://localhost:8000/api/v1/ws/stt";

function floatTo16BitPCM(float32: Float32Array) {
    const buffer = new ArrayBuffer(float32.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
}

function downsampleTo16k(input: Float32Array, inputSampleRate: number) {
    if (inputSampleRate === 16000) return input;

    const ratio = inputSampleRate / 16000;
    const newLen = Math.round(input.length / ratio);
    const result = new Float32Array(newLen);

    let offsetResult = 0;
    let offsetInput = 0;
    while (offsetResult < result.length) {
        const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
        let sum = 0;
        let count = 0;
        for (let i = offsetInput; i < nextOffsetInput && i < input.length; i++) {
            sum += input[i];
            count++;
        }
        result[offsetResult] = count > 0 ? sum / count : 0;
        offsetResult++;
        offsetInput = nextOffsetInput;
    }
    return result;
}

export default function DeepgramAudioStreamer({ onTranscript, enabled }: Props) {
    const wsRef = useRef<WebSocket | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef(0);

    const [status, setStatus] = useState<"idle" | "connecting" | "streaming" | "error">("idle");
    const [error, setError] = useState("");
    const [chunksSent, setChunksSent] = useState(0);

    useEffect(() => {
        if (!enabled) {
            stop();
            return;
        }
        start().catch((e) => {
            setStatus("error");
            setError(e?.message || "Failed to start audio streaming");
        });

        return () => {
            stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    async function start() {
        setStatus("connecting");
        setError("");
        setChunksSent(0);
        chunksRef.current = 0;

        // Ask microphone permission first so the browser prompt appears immediately.
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
            video: false,
        });
        streamRef.current = stream;

        const ws = new WebSocket(WS_URL);
        ws.binaryType = "arraybuffer";

        ws.onmessage = (evt) => {
            try {
                const msg = JSON.parse(evt.data);
                if (msg.type === "transcript") {
                    onTranscript({
                        text: msg.text,
                        is_final: !!msg.is_final,
                        confidence: Number(msg.confidence || 0),
                    });
                } else if (msg.type === "stt_error") {
                    setStatus("error");
                    setError(msg.message || "STT error");
                }
            } catch {
                // Ignore malformed server messages
            }
        };

        ws.onerror = () => {
            setStatus("error");
            setError("WebSocket error");
        };

        await new Promise<void>((resolve, reject) => {
            const timeout = window.setTimeout(() => {
                reject(new Error("WebSocket connection timed out"));
            }, 7000);

            ws.onopen = () => {
                window.clearTimeout(timeout);
                resolve();
            };
            ws.onclose = () => {
                window.clearTimeout(timeout);
                reject(new Error("WebSocket closed"));
            };
        });

        wsRef.current = ws;

        const AudioContextCtor =
            window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) {
            throw new Error("AudioContext is not supported in this browser");
        }

        const audioCtx = new AudioContextCtor();
        audioCtxRef.current = audioCtx;
        if (audioCtx.state === "suspended") {
            await audioCtx.resume();
        }

        const source = audioCtx.createMediaStreamSource(stream);
        sourceRef.current = source;

        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
            const wsNow = wsRef.current;
            if (!wsNow || wsNow.readyState !== WebSocket.OPEN) return;

            const input = e.inputBuffer.getChannelData(0);
            const down = downsampleTo16k(input, audioCtx.sampleRate);
            if (down.length === 0) return;
            const pcm16 = floatTo16BitPCM(down);
            wsNow.send(pcm16);
            chunksRef.current += 1;
            if (chunksRef.current === 1 || chunksRef.current % 10 === 0) {
                setChunksSent(chunksRef.current);
            }
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);

        setStatus("streaming");
    }

    function stop() {
        try {
            wsRef.current?.send("__STOP__");
        } catch {
            // noop
        }

        try {
            wsRef.current?.close();
        } catch {
            // noop
        }
        wsRef.current = null;

        try {
            processorRef.current?.disconnect();
        } catch {
            // noop
        }
        processorRef.current = null;

        try {
            sourceRef.current?.disconnect();
        } catch {
            // noop
        }
        sourceRef.current = null;

        try {
            void audioCtxRef.current?.close();
        } catch {
            // noop
        }
        audioCtxRef.current = null;

        try {
            streamRef.current?.getTracks().forEach((t) => t.stop());
        } catch {
            // noop
        }
        streamRef.current = null;

        setStatus("idle");
        setError("");
        setChunksSent(0);
        chunksRef.current = 0;
    }

    return (
        <div className="fixed top-20 right-6 z-50 text-xs opacity-70 bg-black/40 border border-white/10 rounded-lg px-3 py-2">
            STT: {status} | chunks: {chunksSent}
            {error ? <span className="ml-2 text-red-400">{error}</span> : null}
        </div>
    );
}
