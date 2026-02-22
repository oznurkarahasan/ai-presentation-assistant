"""
Speech-to-Text Service using OpenAI Whisper API.

This service handles real-time audio transcription with:
- Sliding window support for reduced latency
- Voice Activity Detection (VAD) signal handling
- Language detection and fixed language modes
- Retry logic with exponential backoff
- Audio format validation

Architecture Note:
    This service is designed as a swappable abstraction layer.
    In Phase 7, the OpenAI Whisper API can be replaced with a local
    whisper.cpp inference engine by implementing the same interface.
"""

import io
import time
import asyncio
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from openai import AsyncOpenAI
from app.core.config import settings
from app.core.logger import logger
from app.core.exceptions import AppBaseException
from app.core.exceptions import STTError


# Custom Exception

class STTError(AppBaseException):
    """Raised when Speech-to-Text processing fails"""
    pass

# Data Models

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
    duration_ms: float  # Processing time in milliseconds
    chunk_index: int = 0
    is_partial: bool = False  # True for sliding window intermediate results
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

    # Sliding window: keep last N transcripts for context
    transcript_window: list[str] = field(default_factory=list)
    window_size: int = 3  # Keep last 3 transcripts for overlap context

    def add_transcript(self, text: str) -> None:
        """Add a transcript to the sliding window."""
        self.chunk_counter += 1
        self.last_transcript = text
        self.last_activity_time = time.time()

        if text.strip():
            self.total_transcribed_text += " " + text.strip()
            self.transcript_window.append(text.strip())

            # Keep only last N transcripts
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


# Supported Audio Formats

# Whisper API supported formats
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

# Minimum audio size to avoid sending silence/noise (in bytes)
MIN_AUDIO_SIZE_BYTES = 1000  # ~1KB - very short silence chunks are smaller

# Maximum audio size (25MB - Whisper API limit)
MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024


# STT Service

# Lazy initialization of OpenAI client (same pattern as embedding_service)
_client: Optional[AsyncOpenAI] = None


def get_client() -> AsyncOpenAI:
    """
    Get or create the OpenAI client instance with lazy initialization.
    Follows the same pattern as embedding_service.py for consistency.
    """
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


def validate_audio_data(
    audio_data: bytes,
    content_type: str = "audio/webm"
) -> str:
    """
    Validate audio data before sending to Whisper API.

    Args:
        audio_data: Raw audio bytes from the client.
        content_type: MIME type of the audio.

    Returns:
        File extension string for the audio format.

    Raises:
        STTError: If audio data is invalid.
    """
    # Check size
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

    # Normalize content type (remove parameters like codecs)
    base_type = content_type.split(";")[0].strip().lower()
    full_type = content_type.strip().lower()

    # Try full type first (e.g., "audio/webm;codecs=opus"), then base type
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


async def transcribe_audio(
    audio_data: bytes,
    content_type: str = "audio/webm",
    language: SupportedLanguage = SupportedLanguage.AUTO,
    prompt: str = "",
    chunk_index: int = 0,
) -> TranscriptionResult:
    """
    Transcribe an audio chunk using OpenAI Whisper API.

    Args:
        audio_data: Raw audio bytes (WebM/Opus from browser MediaRecorder).
        content_type: MIME type of the audio data.
        language: Target language or AUTO for detection.
        prompt: Previous transcript text for context continuity
                (Whisper uses this to improve accuracy across chunks).
        chunk_index: Sequential chunk number for tracking.

    Returns:
        TranscriptionResult with transcribed text and metadata.

    Raises:
        STTError: If transcription fails after retries.
    """
    # Validate audio
    extension = validate_audio_data(audio_data, content_type)

    client = get_client()
    start_time = time.time()

    # Build API parameters
    api_params = {
        "model": "whisper-1",
        "response_format": "json",
        "temperature": 0.0,  # Deterministic output for consistency
    }

    # Set language if not auto-detect
    if language != SupportedLanguage.AUTO:
        api_params["language"] = language.value

    # Use previous transcript as prompt for better continuity
    # Whisper uses this to condition the model on recent context
    if prompt:
        # Whisper prompt limit is ~224 tokens, keep it concise
        api_params["prompt"] = prompt[-500:]  # Last ~500 chars

    # Prepare file-like object for the API
    audio_file = io.BytesIO(audio_data)
    audio_file.name = f"chunk_{chunk_index}.{extension}"

    # Retry logic with exponential backoff
    max_retries = 2
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            audio_file.seek(0)  # Reset position for retry

            response = await client.audio.transcriptions.create(
                file=audio_file,
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

            # Log performance metrics
            logger.debug(
                f"STT chunk #{chunk_index}: "
                f"'{result.text[:80]}...' "
                f"({result.duration_ms}ms, "
                f"{len(audio_data)} bytes, "
                f"attempt {attempt + 1})"
            )

            return result

        except Exception as e:
            last_error = e
            error_msg = str(e)

            # Don't retry on client errors (4xx)
            if "400" in error_msg or "invalid" in error_msg.lower():
                logger.error(
                    f"STT client error (no retry): {error_msg}"
                )
                break

            if attempt < max_retries:
                wait_time = (2 ** attempt) * 0.5  # 0.5s, 1s
                logger.warning(
                    f"STT attempt {attempt + 1} failed, "
                    f"retrying in {wait_time}s: {error_msg}"
                )
                await asyncio.sleep(wait_time)
            else:
                logger.error(
                    f"STT failed after {max_retries + 1} attempts: "
                    f"{error_msg}"
                )

    raise STTError(
        message="Speech-to-text transcription failed",
        details=str(last_error)
    )


async def transcribe_with_session(
    audio_data: bytes,
    session: STTSessionState,
    content_type: str = "audio/webm",
) -> TranscriptionResult:
    """
    Transcribe audio within a session context (sliding window).

    This is the primary method for live presentation mode.
    It uses the session's recent transcript history as prompt
    context for Whisper, improving accuracy across chunks.

    Args:
        audio_data: Raw audio bytes from the client.
        session: Active STT session with sliding window state.
        content_type: MIME type of the audio data.

    Returns:
        TranscriptionResult with session-aware transcription.
    """
    # Use recent context as prompt for better continuity
    context_prompt = session.get_recent_context()

    result = await transcribe_audio(
        audio_data=audio_data,
        content_type=content_type,
        language=session.language,
        prompt=context_prompt,
        chunk_index=session.chunk_counter,
    )

    # Update session state
    session.add_transcript(result.text)

    # Update detected language on first successful transcription
    if session.detected_language is None and not result.is_empty:
        session.detected_language = result.language
        logger.info(
            f"STT session {session.session_id}: "
            f"detected language = {result.language}"
        )

    return result


def create_session(
    session_id: str,
    language: SupportedLanguage = SupportedLanguage.AUTO,
) -> STTSessionState:
    """
    Create a new STT session for a presentation.

    Args:
        session_id: Unique identifier (usually presentation_id + timestamp).
        language: Preferred language or AUTO for detection.

    Returns:
        New STTSessionState ready for transcription.
    """
    session = STTSessionState(
        session_id=session_id,
        language=language,
    )
    logger.info(
        f"STT session created: {session_id}, "
        f"language={language.value}"
    )
    return session