"""
Unit tests for STT (Speech-to-Text) Service.

Tests cover:
1. Audio validation (format, size)
2. Transcription with mocked Whisper API
3. Session state management (sliding window)
4. Error handling and retry logic
5. Edge cases (empty audio, silence, large chunks)

All tests use mocked OpenAI client - no real API calls.
"""

import os
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from dataclasses import dataclass

# Set environment variables before imports
os.environ["DATABASE_URL"] = "postgresql+asyncpg://user:pass@localhost/dbname"
os.environ["OPENAI_API_KEY"] = "sk-dummy-key-for-testing"
os.environ["TESTING"] = "True"
os.environ["ENABLE_LOGGING"] = "False"

from app.services.stt_service import (
    validate_audio_data,
    transcribe_audio,
    transcribe_with_session,
    create_session,
    STTSessionState,
    SupportedLanguage,
    TranscriptionResult,
    STTError,
    MIN_AUDIO_SIZE_BYTES,
    MAX_AUDIO_SIZE_BYTES,
)


# ──────────────────────────────────────────────
# Helpers & Fixtures
# ──────────────────────────────────────────────

def make_audio_bytes(size: int = 5000) -> bytes:
    """Create dummy audio bytes of given size."""
    return b"\x00\x01\x02\x03" * (size // 4)


@dataclass
class MockTranscriptionResponse:
    """Mock OpenAI Whisper API response."""
    text: str


def create_mock_client(response_text: str = "Bu bir test cümlesidir"):
    """Create a mocked AsyncOpenAI client."""
    mock_client = MagicMock()
    mock_client.audio = MagicMock()
    mock_client.audio.transcriptions = MagicMock()
    mock_client.audio.transcriptions.create = AsyncMock(
        return_value=MockTranscriptionResponse(text=response_text)
    )
    return mock_client


# ──────────────────────────────────────────────
# 1. Audio Validation Tests
# ──────────────────────────────────────────────

class TestAudioValidation:
    """Tests for validate_audio_data function."""

    def test_valid_webm_audio(self):
        """Should accept valid WebM audio."""
        audio = make_audio_bytes(5000)
        ext = validate_audio_data(audio, "audio/webm")
        assert ext == "webm"

    def test_valid_webm_opus_audio(self):
        """Should accept WebM with Opus codec."""
        audio = make_audio_bytes(5000)
        ext = validate_audio_data(audio, "audio/webm;codecs=opus")
        assert ext == "webm"

    def test_valid_ogg_audio(self):
        """Should accept OGG audio."""
        audio = make_audio_bytes(5000)
        ext = validate_audio_data(audio, "audio/ogg")
        assert ext == "ogg"

    def test_valid_wav_audio(self):
        """Should accept WAV audio."""
        audio = make_audio_bytes(5000)
        ext = validate_audio_data(audio, "audio/wav")
        assert ext == "wav"

    def test_valid_mp3_audio(self):
        """Should accept MP3 audio."""
        audio = make_audio_bytes(5000)
        ext = validate_audio_data(audio, "audio/mpeg")
        assert ext == "mp3"

    def test_valid_flac_audio(self):
        """Should accept FLAC audio."""
        audio = make_audio_bytes(5000)
        ext = validate_audio_data(audio, "audio/flac")
        assert ext == "flac"

    def test_reject_too_small_audio(self):
        """Should reject audio smaller than minimum size."""
        tiny_audio = b"\x00" * 100  # Way too small
        with pytest.raises(STTError) as exc_info:
            validate_audio_data(tiny_audio, "audio/webm")
        assert "too small" in exc_info.value.message.lower()

    def test_reject_too_large_audio(self):
        """Should reject audio larger than maximum size."""
        huge_audio = b"\x00" * (MAX_AUDIO_SIZE_BYTES + 1)
        with pytest.raises(STTError) as exc_info:
            validate_audio_data(huge_audio, "audio/webm")
        assert "too large" in exc_info.value.message.lower()

    def test_reject_unsupported_format(self):
        """Should reject unsupported audio formats."""
        audio = make_audio_bytes(5000)
        with pytest.raises(STTError) as exc_info:
            validate_audio_data(audio, "audio/aac")
        assert "unsupported" in exc_info.value.message.lower()

    def test_reject_non_audio_type(self):
        """Should reject non-audio MIME types."""
        audio = make_audio_bytes(5000)
        with pytest.raises(STTError) as exc_info:
            validate_audio_data(audio, "text/plain")
        assert "unsupported" in exc_info.value.message.lower()

    def test_exact_minimum_size(self):
        """Should accept audio at exact minimum size."""
        audio = make_audio_bytes(MIN_AUDIO_SIZE_BYTES)
        ext = validate_audio_data(audio, "audio/webm")
        assert ext == "webm"

    def test_content_type_case_insensitive(self):
        """Should handle case-insensitive content types."""
        audio = make_audio_bytes(5000)
        ext = validate_audio_data(audio, "Audio/WebM")
        assert ext == "webm"


# ──────────────────────────────────────────────
# 2. Transcription Tests (Mocked API)
# ──────────────────────────────────────────────

class TestTranscription:
    """Tests for transcribe_audio function with mocked Whisper API."""

    @pytest.mark.asyncio
    async def test_successful_transcription(self):
        """Should return transcription result on success."""
        mock_client = create_mock_client("Merhaba dünya")

        with patch(
            "app.services.stt_service.get_client",
            return_value=mock_client
        ):
            result = await transcribe_audio(
                audio_data=make_audio_bytes(5000),
                content_type="audio/webm",
                language=SupportedLanguage.TURKISH,
            )

        assert isinstance(result, TranscriptionResult)
        assert result.text == "Merhaba dünya"
        assert result.language == "tr"
        assert result.duration_ms >= 0
        assert result.chunk_index == 0
        assert not result.is_partial

    @pytest.mark.asyncio
    async def test_transcription_with_prompt(self):
        """Should pass prompt to Whisper API for context."""
        mock_client = create_mock_client("sonraki konu hakkında")

        with patch(
            "app.services.stt_service.get_client",
            return_value=mock_client
        ):
            result = await transcribe_audio(
                audio_data=make_audio_bytes(5000),
                content_type="audio/webm",
                language=SupportedLanguage.TURKISH,
                prompt="önceki konuyu ele aldık",
                chunk_index=3,
            )

        assert result.text == "sonraki konu hakkında"
        assert result.chunk_index == 3

        # Verify prompt was passed to the API call
        call_kwargs = mock_client.audio.transcriptions.create.call_args
        assert "prompt" in call_kwargs.kwargs

    @pytest.mark.asyncio
    async def test_transcription_auto_language(self):
        """Should not set language param when AUTO is selected."""
        mock_client = create_mock_client("Hello world")

        with patch(
            "app.services.stt_service.get_client",
            return_value=mock_client
        ):
            result = await transcribe_audio(
                audio_data=make_audio_bytes(5000),
                content_type="audio/webm",
                language=SupportedLanguage.AUTO,
            )

        assert result.text == "Hello world"
        assert result.language == "auto"

        # Verify language was NOT passed to API
        call_kwargs = mock_client.audio.transcriptions.create.call_args
        assert "language" not in call_kwargs.kwargs

    @pytest.mark.asyncio
    async def test_transcription_english(self):
        """Should set English language parameter."""
        mock_client = create_mock_client("This is a test")

        with patch(
            "app.services.stt_service.get_client",
            return_value=mock_client
        ):
            result = await transcribe_audio(
                audio_data=make_audio_bytes(5000),
                content_type="audio/webm",
                language=SupportedLanguage.ENGLISH,
            )

        assert result.language == "en"
        call_kwargs = mock_client.audio.transcriptions.create.call_args
        assert call_kwargs.kwargs.get("language") == "en"

    @pytest.mark.asyncio
    async def test_empty_transcription(self):
        """Should handle empty transcription result."""
        mock_client = create_mock_client("")

        with patch(
            "app.services.stt_service.get_client",
            return_value=mock_client
        ):
            result = await transcribe_audio(
                audio_data=make_audio_bytes(5000),
                content_type="audio/webm",
            )

        assert result.text == ""
        assert result.is_empty

    @pytest.mark.asyncio
    async def test_whitespace_only_transcription(self):
        """Should detect whitespace-only as empty."""
        mock_client = create_mock_client("   .  ")

        with patch(
            "app.services.stt_service.get_client",
            return_value=mock_client
        ):
            result = await transcribe_audio(
                audio_data=make_audio_bytes(5000),
                content_type="audio/webm",
            )

        assert result.text == "."
        assert result.is_empty  # "." alone is considered empty

    @pytest.mark.asyncio
    async def test_retry_on_server_error(self):
        """Should retry on server errors (5xx equivalent)."""
        mock_client = MagicMock()
        mock_client.audio = MagicMock()
        mock_client.audio.transcriptions = MagicMock()

        # Fail twice, then succeed
        mock_client.audio.transcriptions.create = AsyncMock(
            side_effect=[
                Exception("Server error 500"),
                Exception("Server error 502"),
                MockTranscriptionResponse(text="başarılı sonuç"),
            ]
        )

        with patch(
            "app.services.stt_service.get_client",
            return_value=mock_client
        ):
            result = await transcribe_audio(
                audio_data=make_audio_bytes(5000),
                content_type="audio/webm",
            )

        assert result.text == "başarılı sonuç"
        assert mock_client.audio.transcriptions.create.call_count == 3

    @pytest.mark.asyncio
    async def test_no_retry_on_client_error(self):
        """Should not retry on client errors (400/invalid)."""
        mock_client = MagicMock()
        mock_client.audio = MagicMock()
        mock_client.audio.transcriptions = MagicMock()
        mock_client.audio.transcriptions.create = AsyncMock(
            side_effect=Exception("400 Bad Request: invalid audio")
        )

        with patch(
            "app.services.stt_service.get_client",
            return_value=mock_client
        ):
            with pytest.raises(STTError) as exc_info:
                await transcribe_audio(
                    audio_data=make_audio_bytes(5000),
                    content_type="audio/webm",
                )

        assert "failed" in exc_info.value.message.lower()
        # Should have tried only once (no retry for 400 errors)
        assert mock_client.audio.transcriptions.create.call_count == 1

    @pytest.mark.asyncio
    async def test_fail_after_all_retries(self):
        """Should raise STTError after exhausting all retries."""
        mock_client = MagicMock()
        mock_client.audio = MagicMock()
        mock_client.audio.transcriptions = MagicMock()
        mock_client.audio.transcriptions.create = AsyncMock(
            side_effect=Exception("Persistent server error")
        )

        with patch(
            "app.services.stt_service.get_client",
            return_value=mock_client
        ):
            with pytest.raises(STTError):
                await transcribe_audio(
                    audio_data=make_audio_bytes(5000),
                    content_type="audio/webm",
                )

        # 1 initial + 2 retries = 3 total attempts
        assert mock_client.audio.transcriptions.create.call_count == 3


# ──────────────────────────────────────────────
# 3. Session State Tests
# ──────────────────────────────────────────────

class TestSTTSessionState:
    """Tests for session state management and sliding window."""

    def test_create_session(self):
        """Should create a new session with correct defaults."""
        session = create_session("test-123", SupportedLanguage.TURKISH)

        assert session.session_id == "test-123"
        assert session.language == SupportedLanguage.TURKISH
        assert session.chunk_counter == 0
        assert session.total_transcribed_text == ""
        assert len(session.transcript_window) == 0

    def test_add_transcript(self):
        """Should add transcript to window and increment counter."""
        session = create_session("test-1")
        session.add_transcript("ilk cümle")

        assert session.chunk_counter == 1
        assert session.last_transcript == "ilk cümle"
        assert "ilk cümle" in session.total_transcribed_text
        assert len(session.transcript_window) == 1

    def test_sliding_window_limit(self):
        """Should keep only last N transcripts in window."""
        session = create_session("test-2")
        session.window_size = 3

        session.add_transcript("birinci")
        session.add_transcript("ikinci")
        session.add_transcript("üçüncü")
        session.add_transcript("dördüncü")

        assert len(session.transcript_window) == 3
        assert "birinci" not in session.transcript_window
        assert session.transcript_window == [
            "ikinci", "üçüncü", "dördüncü"
        ]

    def test_get_recent_context(self):
        """Should return concatenated recent transcripts."""
        session = create_session("test-3")
        session.add_transcript("yapay zeka konusunda")
        session.add_transcript("derin öğrenme modelleri")

        context = session.get_recent_context()
        assert "yapay zeka konusunda" in context
        assert "derin öğrenme modelleri" in context

    def test_empty_transcript_not_added_to_window(self):
        """Should not add empty transcripts to the window."""
        session = create_session("test-4")
        session.add_transcript("")
        session.add_transcript("   ")

        assert len(session.transcript_window) == 0
        assert session.chunk_counter == 2  # Counter still increments

    def test_reset_session(self):
        """Should reset all session state."""
        session = create_session("test-5")
        session.add_transcript("test data")
        session.detected_language = "tr"

        session.reset()

        assert session.chunk_counter == 0
        assert session.total_transcribed_text == ""
        assert len(session.transcript_window) == 0
        assert session.detected_language is None

    def test_total_text_accumulation(self):
        """Should accumulate all transcripts in total text."""
        session = create_session("test-6")
        session.window_size = 2  # Small window

        session.add_transcript("birinci")
        session.add_transcript("ikinci")
        session.add_transcript("üçüncü")

        # Window only has last 2
        assert len(session.transcript_window) == 2

        # But total text has everything
        assert "birinci" in session.total_transcribed_text
        assert "ikinci" in session.total_transcribed_text
        assert "üçüncü" in session.total_transcribed_text


# ──────────────────────────────────────────────
# 4. Session-Aware Transcription Tests
# ──────────────────────────────────────────────

class TestTranscribeWithSession:
    """Tests for transcribe_with_session (main live mode method)."""

    @pytest.mark.asyncio
    async def test_session_transcription(self):
        """Should transcribe and update session state."""
        mock_client = create_mock_client("slayt içeriği hakkında")
        session = create_session("live-1", SupportedLanguage.TURKISH)

        with patch(
            "app.services.stt_service.get_client",
            return_value=mock_client
        ):
            result = await transcribe_with_session(
                audio_data=make_audio_bytes(5000),
                session=session,
                content_type="audio/webm",
            )

        assert result.text == "slayt içeriği hakkında"
        assert session.chunk_counter == 1
        assert session.last_transcript == "slayt içeriği hakkında"
        assert len(session.transcript_window) == 1

    @pytest.mark.asyncio
    async def test_session_context_passed_to_whisper(self):
        """Should pass recent context as prompt to Whisper."""
        session = create_session("live-2", SupportedLanguage.TURKISH)

        # Pre-populate session with context
        session.add_transcript("yapay zeka nedir")
        session.add_transcript("makine öğrenmesi modelleri")

        mock_client = create_mock_client("derin öğrenme ağları")

        with patch(
            "app.services.stt_service.get_client",
            return_value=mock_client
        ):
            result = await transcribe_with_session(
                audio_data=make_audio_bytes(5000),
                session=session,
            )

        assert result.text == "derin öğrenme ağları"

        # Verify the context was passed as prompt
        call_kwargs = mock_client.audio.transcriptions.create.call_args
        assert "prompt" in call_kwargs.kwargs
        prompt_text = call_kwargs.kwargs["prompt"]
        assert "yapay zeka nedir" in prompt_text
        assert "makine öğrenmesi modelleri" in prompt_text

    @pytest.mark.asyncio
    async def test_session_multiple_chunks(self):
        """Should handle multiple sequential chunks correctly."""
        session = create_session("live-3", SupportedLanguage.AUTO)

        transcripts = [
            "giriş bölümü",
            "ana konu açıklaması",
            "sonuç ve öneriler",
        ]

        for i, text in enumerate(transcripts):
            mock_client = create_mock_client(text)
            with patch(
                "app.services.stt_service.get_client",
                return_value=mock_client
            ):
                result = await transcribe_with_session(
                    audio_data=make_audio_bytes(5000),
                    session=session,
                )
                assert result.text == text

        assert session.chunk_counter == 3
        assert len(session.transcript_window) == 3

        # Total text should contain all transcripts
        for t in transcripts:
            assert t in session.total_transcribed_text

    @pytest.mark.asyncio
    async def test_language_detection_on_first_chunk(self):
        """Should set detected language on first non-empty result."""
        session = create_session("live-4", SupportedLanguage.AUTO)
        assert session.detected_language is None

        mock_client = create_mock_client("Hello world")

        with patch(
            "app.services.stt_service.get_client",
            return_value=mock_client
        ):
            await transcribe_with_session(
                audio_data=make_audio_bytes(5000),
                session=session,
            )

        assert session.detected_language == "auto"


# ──────────────────────────────────────────────
# 5. TranscriptionResult Tests
# ──────────────────────────────────────────────

class TestTranscriptionResult:
    """Tests for TranscriptionResult dataclass."""

    def test_is_empty_with_empty_string(self):
        """Should detect empty transcription."""
        result = TranscriptionResult(
            text="", language="tr", duration_ms=100
        )
        assert result.is_empty

    def test_is_empty_with_period_only(self):
        """Should detect period-only as empty."""
        result = TranscriptionResult(
            text=".", language="tr", duration_ms=100
        )
        assert result.is_empty

    def test_is_empty_with_whitespace(self):
        """Should detect whitespace-only as empty."""
        result = TranscriptionResult(
            text="   ", language="tr", duration_ms=100
        )
        assert result.is_empty

    def test_not_empty_with_text(self):
        """Should detect real text as non-empty."""
        result = TranscriptionResult(
            text="Merhaba", language="tr", duration_ms=100
        )
        assert not result.is_empty

    def test_to_dict(self):
        """Should serialize to dictionary correctly."""
        result = TranscriptionResult(
            text="test",
            language="tr",
            duration_ms=150.5,
            chunk_index=2,
            is_partial=True,
            confidence=0.95,
        )
        d = result.to_dict()

        assert d["text"] == "test"
        assert d["language"] == "tr"
        assert d["duration_ms"] == 150.5
        assert d["chunk_index"] == 2
        assert d["is_partial"] is True
        assert d["confidence"] == 0.95