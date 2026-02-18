import json
from typing import AsyncIterator, Optional

import websockets

from app.core.config import settings
from app.core.logger import logger

DEEPGRAM_BASE = "wss://api.deepgram.com/v1/listen"


def build_deepgram_url() -> str:
    # Nova-2 + TR + interim + punctuation + endpointing
    # (Can be managed from config if needed)
    params = {
        "model": settings.DEEPGRAM_MODEL or "nova-2",
        "language": settings.DEEPGRAM_LANGUAGE or "tr",
        "punctuate": "true",
        "smart_format": "true",
        "interim_results": "true",
        "endpointing": "300",
        # audio format: raw linear16
        "encoding": "linear16",
        "sample_rate": "16000",
        "channels": "1",
    }

    qs = "&".join([f"{k}={v}" for k, v in params.items()])
    return f"{DEEPGRAM_BASE}?{qs}"


class DeepgramStream:
    def __init__(self):
        if not settings.DEEPGRAM_API_KEY:
            raise RuntimeError("DEEPGRAM_API_KEY is missing")
        self.url = build_deepgram_url()
        self.headers = {"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"}
        self.ws: Optional[object] = None

    async def __aenter__(self):
        self.ws = await websockets.connect(self.url, additional_headers=self.headers)
        logger.info("Connected to Deepgram WebSocket")
        return self

    async def __aexit__(self, exc_type, exc, tb):
        try:
            if self.ws:
                await self.ws.close()
        except Exception as close_err:
            logger.warning(f"Deepgram websocket close failed: {close_err}")
        self.ws = None
        logger.info("Disconnected from Deepgram WebSocket")

    async def send_audio(self, chunk: bytes):
        if not self.ws:
            return
        await self.ws.send(chunk)

    async def finish(self):
        # For graceful finalization we can send CloseStream.
        if not self.ws:
            return
        try:
            await self.ws.send(json.dumps({"type": "CloseStream"}))
        except Exception as finish_err:
            logger.warning(f"Deepgram CloseStream send failed: {finish_err}")

    async def transcripts(self) -> AsyncIterator[dict]:
        """
        Yield JSON events coming from Deepgram.
        """
        if not self.ws:
            return
        while True:
            msg = await self.ws.recv()
            if isinstance(msg, bytes):
                # Deepgram generally sends text JSON; ignore bytes
                continue
            payload = None
            try:
                payload = json.loads(msg)
            except Exception as parse_err:
                logger.debug(f"Skipping non-JSON Deepgram message: {parse_err}")
            if payload is not None:
                yield payload


def extract_transcript(payload: dict) -> tuple[str, bool, float]:
    """
    Return (text, is_final, confidence).
    """
    is_final = bool(payload.get("is_final", False))
    channel = payload.get("channel") or {}
    alts = channel.get("alternatives") or []
    if not alts:
        return ("", is_final, 0.0)
    alt0 = alts[0] or {}
    text = alt0.get("transcript") or ""
    conf = float(alt0.get("confidence") or 0.0)
    return (text, is_final, conf)
