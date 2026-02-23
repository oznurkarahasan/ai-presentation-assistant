"""
Speech-to-Text Service using OpenAI Whisper API.

This service handles real-time audio transcription with:
- Sliding window support for reduced latency
- Voice Activity Detection (VAD) signal handling
- Language detection and fixed language modes
- Retry logic with exponential backoff
- Audio format validation
- Whisper hallucination filtering

Architecture Note:
    This service is designed as a swappable abstraction layer.
    In Phase 7, the OpenAI Whisper API can be replaced with a local
    whisper.cpp inference engine by implementing the same interface.
"""

import time
import asyncio
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from openai import AsyncOpenAI
from app.core.config import settings
from app.core.logger import logger
from app.core.exceptions import STTError


# ──────────────────────────────────────────────
# Data Models
# ──────────────────────────────────────────────

class SupportedLanguage(str, Enum):
    """Languages supported for STT processing."""
    TURKISH = "tr"
    ENGLISH = "en"
    AUTO = "auto"


@dataclass
class TranscriptionResult:
    """Result of a single transcription request."""
    text: str
    language: str
    duration_ms: float
    chunk_index: int = 0
    is_partial: bool = False
    confidence: float = 1.0

    @property
    def is_empty(self) -> bool:
        """Check if transcription contains meaningful text."""
        cleaned = self.text.strip().strip(".")
        return len(cleaned) == 0

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "language": self.language,
            "duration_ms": self.duration_ms,
            "chunk_index": self.chunk_index,
            "is_partial": self.is_partial,
            "confidence": self.confidence,
        }


@dataclass
class STTSessionState:
    """
    Maintains state for a single presentation STT session.
    Tracks sliding window context and chunk history.
    """
    session_id: str = ""
    language: SupportedLanguage = SupportedLanguage.AUTO
    detected_language: Optional[str] = None
    chunk_counter: int = 0
    total_transcribed_text: str = ""
    last_transcript: str = ""
    last_activity_time: float = field(default_factory=time.time)

    transcript_window: list[str] = field(default_factory=list)
    window_size: int = 3

    def add_transcript(self, text: str) -> None:
        """Add a transcript to the sliding window."""
        self.chunk_counter += 1
        self.last_transcript = text
        self.last_activity_time = time.time()

        if text.strip():
            self.total_transcribed_text += " " + text.strip()
            self.transcript_window.append(text.strip())

            if len(self.transcript_window) > self.window_size:
                self.transcript_window.pop(0)

    def get_recent_context(self) -> str:
        """Get concatenated recent transcripts for context."""
        return " ".join(self.transcript_window)

    def reset(self) -> None:
        """Reset session state."""
        self.chunk_counter = 0
        self.total_transcribed_text = ""
        self.last_transcript = ""
        self.transcript_window = []
        self.detected_language = None


# ──────────────────────────────────────────────
# Supported Audio Formats
# ──────────────────────────────────────────────

SUPPORTED_AUDIO_FORMATS = {
    "audio/webm": "webm",
    "audio/webm;codecs=opus": "webm",
    "audio/ogg": "ogg",
    "audio/ogg;codecs=opus": "ogg",
    "audio/mp4": "mp4",
    "video/mp4": "mp4",
    "audio/m4a": "m4a",
    "audio/x-m4a": "m4a",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/flac": "flac",
}

MIN_AUDIO_SIZE_BYTES = 1000
MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024


# ──────────────────────────────────────────────
# Whisper Hallucination Filter
# ──────────────────────────────────────────────

HALLUCINATION_PATTERNS = [
    # Turkish hallucinations
    "abone ol",
    "beğen butonuna",
    "lütfen abone",
    "abone olmayı",
    "beğenmeyi unutmayın",
    "arkadaşlar",
    "merhaba arkadaşlar",
    "herkese merhaba",
    "bu videoyu beğendiyseniz",
    "kanala abone",
    "yorumlarda belirtin",
    "bir sonraki videoda görüşmek üzere",
    "izlediğiniz için teşekkürler",
    "ürünlerimizi inceleyebilirsiniz",
    "seslendiren",
    "altyazı",
    "çeviri",
    # English hallucinations
    "like and subscribe",
    "thank you for watching",
    "don't forget to subscribe",
    "subscribe to my channel",
    "please subscribe",
    "subtitles by",
    "translated by",
    "transcribed by",
    # Common garbage patterns
    "m.k.",
    "a.r.",
    "i'r cyfrifiadau",
    "cyfrifiadau",
    "amara.org",
    "www.mooji.org",
    "www.",
    ".org",
    ".com",
]


def is_hallucination(text: str) -> bool:
    """
    Detect common Whisper hallucination patterns.
    Returns True if the text is likely a hallucination.
    """
    if not text or not text.strip():
        return True

    lower = text.lower().strip()

    # Too short to be meaningful
    if len(lower) < 3:
        return True

    # Check against known patterns
    for pattern in HALLUCINATION_PATTERNS:
        if pattern in lower:
            return True

    # Detect repetition: same phrase repeating ("abc abc abc")
    words = lower.split()
    if len(words) >= 4:
        half = len(words) // 2
        first_half = " ".join(words[:half])
        second_half = " ".join(words[half:half * 2])
        if first_half == second_half:
            return True

    # Single word repeated many times: "bu bu bu bu"
    if len(words) >= 3:
        unique_words = set(words)
        if len(unique_words) <= 2:
            return True

    return False


# ──────────────────────────────────────────────
# OpenAI Client
# ──────────────────────────────────────────────

_client: Optional[AsyncOpenAI] = None


def get_client() -> AsyncOpenAI:
    """Get or create the OpenAI client instance."""
    global _client
    if _client is None:
        try:
            _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("OpenAI client initialized for STT service")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client for STT: {str(e)}")
            raise STTError(
                message="Failed to initialize STT client",
                details=str(e)
            )
    return _client


# ──────────────────────────────────────────────
# Audio Validation
# ──────────────────────────────────────────────

def validate_audio_data(
    audio_data: bytes,
    content_type: str = "audio/webm"
) -> str:
    """
    Validate audio data before sending to Whisper API.
    Returns file extension string.
    """
    if len(audio_data) < MIN_AUDIO_SIZE_BYTES:
        raise STTError(
            message="Audio chunk too small",
            details=f"Received {len(audio_data)} bytes, "
                    f"minimum is {MIN_AUDIO_SIZE_BYTES} bytes"
        )

    if len(audio_data) > MAX_AUDIO_SIZE_BYTES:
        raise STTError(
            message="Audio chunk too large",
            details=f"Received {len(audio_data)} bytes, "
                    f"maximum is {MAX_AUDIO_SIZE_BYTES} bytes"
        )

    base_type = content_type.split(";")[0].strip().lower()
    full_type = content_type.strip().lower()

    extension = SUPPORTED_AUDIO_FORMATS.get(
        full_type,
        SUPPORTED_AUDIO_FORMATS.get(base_type)
    )

    if extension is None:
        raise STTError(
            message="Unsupported audio format",
            details=f"Content type '{content_type}' is not supported. "
                    f"Supported: {list(SUPPORTED_AUDIO_FORMATS.keys())}"
        )

    return extension


# ──────────────────────────────────────────────
# Transcription
# ──────────────────────────────────────────────

async def transcribe_audio(
    audio_data: bytes,
    content_type: str = "audio/webm",
    language: SupportedLanguage = SupportedLanguage.AUTO,
    prompt: str = "",
    chunk_index: int = 0,
) -> TranscriptionResult:
    """
    Transcribe an audio chunk using OpenAI Whisper API.
    Includes hallucination filtering.
    """
    # Validate audio
    extension = validate_audio_data(audio_data, content_type)

    client = get_client()
    start_time = time.time()

    # Build API parameters
    api_params = {
        "model": "whisper-1",
        "response_format": "json",
        "temperature": 0.0,
    }

    if language != SupportedLanguage.AUTO:
        api_params["language"] = language.value

    if prompt:
        api_params["prompt"] = prompt[-500:]

    # Retry logic
    max_retries = 2
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            response = await client.audio.transcriptions.create(
                file=(f"chunk_{chunk_index}.{extension}", audio_data),
                **api_params
            )

            duration_ms = (time.time() - start_time) * 1000

            result = TranscriptionResult(
                text=response.text.strip(),
                language=language.value if language != SupportedLanguage.AUTO
                else "auto",
                duration_ms=round(duration_ms, 1),
                chunk_index=chunk_index,
                is_partial=False,
            )

            # ── Hallucination filter ──
            if not result.is_empty and is_hallucination(result.text):
                logger.info(
                    f"STT chunk #{chunk_index}: filtered hallucination: "
                    f"'{result.text[:80]}'"
                )
                return TranscriptionResult(
                    text="",
                    language=result.language,
                    duration_ms=result.duration_ms,
                    chunk_index=chunk_index,
                    is_partial=False,
                )

            # Log successful transcription
            logger.info(
                f"STT chunk #{chunk_index}: "
                f"'{result.text[:80]}' "
                f"({result.duration_ms}ms, "
                f"{len(audio_data)} bytes)"
            )

            return result

        except Exception as e:
            last_error = e
            error_msg = str(e)

            if "400" in error_msg or "invalid" in error_msg.lower():
                logger.error(f"STT client error (no retry): {error_msg}")
                break

            if attempt < max_retries:
                wait_time = (2 ** attempt) * 0.5
                logger.warning(
                    f"STT attempt {attempt + 1} failed, "
                    f"retrying in {wait_time}s: {error_msg}"
                )
                await asyncio.sleep(wait_time)
            else:
                logger.error(
                    f"STT failed after {max_retries + 1} attempts: {error_msg}"
                )

    raise STTError(
        message="Speech-to-text transcription failed",
        details=str(last_error)
    )


# ──────────────────────────────────────────────
# Session-aware Transcription
# ──────────────────────────────────────────────

async def transcribe_with_session(
    audio_data: bytes,
    session: STTSessionState,
    content_type: str = "audio/webm",
) -> TranscriptionResult:
    """
    Transcribe audio within a session context (sliding window).
    Uses recent transcript history as prompt for better accuracy.
    """
    context_prompt = session.get_recent_context()

    result = await transcribe_audio(
        audio_data=audio_data,
        content_type=content_type,
        language=session.language,
        prompt=context_prompt,
        chunk_index=session.chunk_counter,
    )

    # Only add real transcripts to session (not hallucinations)
    if not result.is_empty:
        session.add_transcript(result.text)
    else:
        session.chunk_counter += 1

    if session.detected_language is None and not result.is_empty:
        session.detected_language = result.language
        logger.info(
            f"STT session {session.session_id}: "
            f"detected language = {result.language}"
        )

    return result


# ──────────────────────────────────────────────
# Session Management
# ──────────────────────────────────────────────

def create_session(
    session_id: str,
    language: SupportedLanguage = SupportedLanguage.AUTO,
) -> STTSessionState:
    """Create a new STT session for a presentation."""
    session = STTSessionState(
        session_id=session_id,
        language=language,
    )
    logger.info(
        f"STT session created: {session_id}, "
        f"language={language.value}"
    )
    return session
