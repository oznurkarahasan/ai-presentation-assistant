"""
Standalone STT Service Test Runner
===================================
No external dependencies required - tests core logic using only stdlib.
This validates the service design before deploying to the real project.

Run: python3 test_standalone.py
"""

import asyncio
import io
import sys
import time
import traceback
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch


# ═══════════════════════════════════════════════
# MINIMAL STUBS (replace real imports for testing)
# ═══════════════════════════════════════════════

class AppBaseException(Exception):
    def __init__(self, message: str, details: str = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


class STTError(AppBaseException):
    pass


class MockSettings:
    OPENAI_API_KEY = "sk-test-key"


class MockLogger:
    def info(self, msg): pass
    def debug(self, msg): pass
    def warning(self, msg): pass
    def error(self, msg, **kw): pass


# Inject stubs into module-level namespace
settings = MockSettings()
logger = MockLogger()


# ═══════════════════════════════════════════════
# COPY OF STT SERVICE CORE LOGIC (for standalone test)
# ═══════════════════════════════════════════════

class SupportedLanguage(str, Enum):
    TURKISH = "tr"
    ENGLISH = "en"
    AUTO = "auto"


@dataclass
class TranscriptionResult:
    text: str
    language: str
    duration_ms: float
    chunk_index: int = 0
    is_partial: bool = False
    confidence: float = 1.0

    @property
    def is_empty(self) -> bool:
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
    session_id: str = ""
    language: SupportedLanguage = SupportedLanguage.AUTO
    detected_language: Optional[str] = None
    chunk_counter: int = 0
    total_transcribed_text: str = ""
    last_transcript: str = ""
    last_activity_time: float = field(default_factory=time.time)
    transcript_window: list = field(default_factory=list)
    window_size: int = 3

    def add_transcript(self, text: str) -> None:
        self.chunk_counter += 1
        self.last_transcript = text
        self.last_activity_time = time.time()
        if text.strip():
            self.total_transcribed_text += " " + text.strip()
            self.transcript_window.append(text.strip())
            if len(self.transcript_window) > self.window_size:
                self.transcript_window.pop(0)

    def get_recent_context(self) -> str:
        return " ".join(self.transcript_window)

    def reset(self) -> None:
        self.chunk_counter = 0
        self.total_transcribed_text = ""
        self.last_transcript = ""
        self.transcript_window = []
        self.detected_language = None


SUPPORTED_AUDIO_FORMATS = {
    "audio/webm": "webm",
    "audio/webm;codecs=opus": "webm",
    "audio/ogg": "ogg",
    "audio/ogg;codecs=opus": "ogg",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/flac": "flac",
}

MIN_AUDIO_SIZE_BYTES = 1000
MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024


def validate_audio_data(audio_data: bytes, content_type: str = "audio/webm") -> str:
    if len(audio_data) < MIN_AUDIO_SIZE_BYTES:
        raise STTError(
            message="Audio chunk too small",
            details=f"Received {len(audio_data)} bytes, minimum is {MIN_AUDIO_SIZE_BYTES}"
        )
    if len(audio_data) > MAX_AUDIO_SIZE_BYTES:
        raise STTError(
            message="Audio chunk too large",
            details=f"Received {len(audio_data)} bytes, maximum is {MAX_AUDIO_SIZE_BYTES}"
        )
    base_type = content_type.split(";")[0].strip().lower()
    full_type = content_type.strip().lower()
    extension = SUPPORTED_AUDIO_FORMATS.get(full_type, SUPPORTED_AUDIO_FORMATS.get(base_type))
    if extension is None:
        raise STTError(
            message="Unsupported audio format",
            details=f"Content type '{content_type}' is not supported."
        )
    return extension


_mock_client = None


def get_client():
    # global _mock_client removed (unused)
    return _mock_client


async def transcribe_audio(
    audio_data: bytes,
    content_type: str = "audio/webm",
    language: SupportedLanguage = SupportedLanguage.AUTO,
    prompt: str = "",
    chunk_index: int = 0,
) -> TranscriptionResult:
    extension = validate_audio_data(audio_data, content_type)
    client = get_client()
    start_time = time.time()

    api_params = {
        "model": "whisper-1",
        "response_format": "json",
        "temperature": 0.0,
    }
    if language != SupportedLanguage.AUTO:
        api_params["language"] = language.value
    if prompt:
        api_params["prompt"] = prompt[-500:]

    audio_file = io.BytesIO(audio_data)
    audio_file.name = f"chunk_{chunk_index}.{extension}"

    max_retries = 2
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            audio_file.seek(0)
            response = await client.audio.transcriptions.create(
                file=audio_file, **api_params
            )
            duration_ms = (time.time() - start_time) * 1000
            return TranscriptionResult(
                text=response.text.strip(),
                language=language.value if language != SupportedLanguage.AUTO else "auto",
                duration_ms=round(duration_ms, 1),
                chunk_index=chunk_index,
                is_partial=False,
            )
        except Exception as e:
            last_error = e
            error_msg = str(e)
            if "400" in error_msg or "invalid" in error_msg.lower():
                break
            if attempt < max_retries:
                await asyncio.sleep(0.01)  # Shortened for tests

    raise STTError(
        message="Speech-to-text transcription failed",
        details=str(last_error)
    )


async def transcribe_with_session(
    audio_data: bytes,
    session: STTSessionState,
    content_type: str = "audio/webm",
) -> TranscriptionResult:
    context_prompt = session.get_recent_context()
    result = await transcribe_audio(
        audio_data=audio_data,
        content_type=content_type,
        language=session.language,
        prompt=context_prompt,
        chunk_index=session.chunk_counter,
    )
    session.add_transcript(result.text)
    if session.detected_language is None and not result.is_empty:
        session.detected_language = result.language
    return result


def create_session(session_id: str, language=SupportedLanguage.AUTO) -> STTSessionState:
    return STTSessionState(session_id=session_id, language=language)


# ═══════════════════════════════════════════════
# TEST HELPERS
# ═══════════════════════════════════════════════

def make_audio_bytes(size: int = 5000) -> bytes:
    return b"\x00\x01\x02\x03" * (size // 4)


@dataclass
class MockTranscriptionResponse:
    text: str


def set_mock_client(response_text="Bu bir test cümlesidir"):
    global _mock_client
    _mock_client = MagicMock()
    _mock_client.audio = MagicMock()
    _mock_client.audio.transcriptions = MagicMock()
    _mock_client.audio.transcriptions.create = AsyncMock(
        return_value=MockTranscriptionResponse(text=response_text)
    )
    return _mock_client


def set_mock_client_error(side_effects):
    global _mock_client
    _mock_client = MagicMock()
    _mock_client.audio = MagicMock()
    _mock_client.audio.transcriptions = MagicMock()
    _mock_client.audio.transcriptions.create = AsyncMock(side_effect=side_effects)
    return _mock_client


# ═══════════════════════════════════════════════
# TEST FRAMEWORK
# ═══════════════════════════════════════════════

passed = 0
failed = 0
errors = []


def test(name):
    """Decorator for test functions."""
    def decorator(func):
        func._test_name = name
        return func
    return decorator


async def run_test(func):
    global passed, failed
    name = getattr(func, '_test_name', func.__name__)
    try:
        if asyncio.iscoroutinefunction(func):
            await func()
        else:
            func()
        passed += 1
        print(f"  ✅ {name}")
    except Exception as e:
        failed += 1
        errors.append((name, e))
        print(f"  ❌ {name}")
        print(f"     → {type(e).__name__}: {e}")


# ═══════════════════════════════════════════════
# TESTS
# ═══════════════════════════════════════════════

# ─── 1. Audio Validation ───

@test("Valid WebM audio accepted")
def test_valid_webm():
    ext = validate_audio_data(make_audio_bytes(5000), "audio/webm")
    assert ext == "webm", f"Expected 'webm', got '{ext}'"

@test("Valid WebM+Opus audio accepted")
def test_valid_webm_opus():
    ext = validate_audio_data(make_audio_bytes(5000), "audio/webm;codecs=opus")
    assert ext == "webm"

@test("Valid OGG audio accepted")
def test_valid_ogg():
    ext = validate_audio_data(make_audio_bytes(5000), "audio/ogg")
    assert ext == "ogg"

@test("Valid WAV audio accepted")
def test_valid_wav():
    ext = validate_audio_data(make_audio_bytes(5000), "audio/wav")
    assert ext == "wav"

@test("Valid MP3 audio accepted")
def test_valid_mp3():
    ext = validate_audio_data(make_audio_bytes(5000), "audio/mpeg")
    assert ext == "mp3"

@test("Valid FLAC audio accepted")
def test_valid_flac():
    ext = validate_audio_data(make_audio_bytes(5000), "audio/flac")
    assert ext == "flac"

@test("Reject audio too small")
def test_reject_small():
    try:
        validate_audio_data(b"\x00" * 100, "audio/webm")
        assert False, "Should have raised STTError"
    except STTError as e:
        assert "too small" in e.message.lower()

@test("Reject audio too large")
def test_reject_large():
    try:
        validate_audio_data(b"\x00" * (MAX_AUDIO_SIZE_BYTES + 1), "audio/webm")
        assert False, "Should have raised STTError"
    except STTError as e:
        assert "too large" in e.message.lower()

@test("Reject unsupported format")
def test_reject_unsupported():
    try:
        validate_audio_data(make_audio_bytes(5000), "audio/aac")
        assert False, "Should have raised STTError"
    except STTError as e:
        assert "unsupported" in e.message.lower()

@test("Reject non-audio MIME type")
def test_reject_non_audio():
    try:
        validate_audio_data(make_audio_bytes(5000), "text/plain")
        assert False, "Should have raised STTError"
    except STTError as e:
        assert "unsupported" in e.message.lower()

@test("Accept exact minimum size")
def test_exact_min():
    ext = validate_audio_data(make_audio_bytes(MIN_AUDIO_SIZE_BYTES), "audio/webm")
    assert ext == "webm"

@test("Case-insensitive content type")
def test_case_insensitive():
    ext = validate_audio_data(make_audio_bytes(5000), "Audio/WebM")
    assert ext == "webm"


# ─── 2. Transcription (Mocked API) ───

@test("Successful transcription returns correct result")
async def test_transcribe_success():
    set_mock_client("Merhaba dünya")
    result = await transcribe_audio(
        audio_data=make_audio_bytes(5000),
        content_type="audio/webm",
        language=SupportedLanguage.TURKISH,
    )
    assert result.text == "Merhaba dünya"
    assert result.language == "tr"
    assert result.duration_ms >= 0
    assert not result.is_partial

@test("Transcription with prompt passes context")
async def test_transcribe_with_prompt():
    mock = set_mock_client("sonraki konu")
    result = await transcribe_audio(
        audio_data=make_audio_bytes(5000),
        language=SupportedLanguage.TURKISH,
        prompt="önceki konu ele alındı",
        chunk_index=3,
    )
    assert result.text == "sonraki konu"
    assert result.chunk_index == 3
    call_kw = mock.audio.transcriptions.create.call_args.kwargs
    assert "prompt" in call_kw

@test("AUTO language does not set language param")
async def test_auto_language():
    mock = set_mock_client("Hello world")
    result = await transcribe_audio(
        audio_data=make_audio_bytes(5000),
        language=SupportedLanguage.AUTO,
    )
    assert result.language == "auto"
    call_kw = mock.audio.transcriptions.create.call_args.kwargs
    assert "language" not in call_kw

@test("English language sets correct param")
async def test_english_language():
    mock = set_mock_client("This is a test")
    result = await transcribe_audio(
        audio_data=make_audio_bytes(5000),
        language=SupportedLanguage.ENGLISH,
    )
    assert result.language == "en"
    call_kw = mock.audio.transcriptions.create.call_args.kwargs
    assert call_kw.get("language") == "en"

@test("Empty transcription detected")
async def test_empty_transcription():
    set_mock_client("")
    result = await transcribe_audio(audio_data=make_audio_bytes(5000))
    assert result.is_empty

@test("Whitespace-only transcription detected as empty")
async def test_whitespace_transcription():
    set_mock_client("   .  ")
    result = await transcribe_audio(audio_data=make_audio_bytes(5000))
    assert result.is_empty

@test("Retry on server error, succeed on 3rd attempt")
async def test_retry_success():
    mock = set_mock_client_error([
        Exception("Server error 500"),
        Exception("Server error 502"),
        MockTranscriptionResponse(text="başarılı"),
    ])
    result = await transcribe_audio(audio_data=make_audio_bytes(5000))
    assert result.text == "başarılı"
    assert mock.audio.transcriptions.create.call_count == 3

@test("No retry on client error (400)")
async def test_no_retry_400():
    mock = set_mock_client_error(Exception("400 Bad Request: invalid audio"))
    try:
        await transcribe_audio(audio_data=make_audio_bytes(5000))
        assert False, "Should have raised STTError"
    except STTError:
        assert mock.audio.transcriptions.create.call_count == 1

@test("Fail after all retries exhausted")
async def test_fail_all_retries():
    mock = set_mock_client_error(Exception("Persistent server error"))
    try:
        await transcribe_audio(audio_data=make_audio_bytes(5000))
        assert False, "Should have raised STTError"
    except STTError:
        assert mock.audio.transcriptions.create.call_count == 3


# ─── 3. Session State ───

@test("Create session with correct defaults")
def test_create_session():
    session = create_session("test-123", SupportedLanguage.TURKISH)
    assert session.session_id == "test-123"
    assert session.language == SupportedLanguage.TURKISH
    assert session.chunk_counter == 0
    assert len(session.transcript_window) == 0

@test("Add transcript updates state correctly")
def test_add_transcript():
    session = create_session("s1")
    session.add_transcript("ilk cümle")
    assert session.chunk_counter == 1
    assert session.last_transcript == "ilk cümle"
    assert "ilk cümle" in session.total_transcribed_text
    assert len(session.transcript_window) == 1

@test("Sliding window keeps only last N transcripts")
def test_sliding_window():
    session = create_session("s2")
    session.window_size = 3
    for text in ["birinci", "ikinci", "üçüncü", "dördüncü"]:
        session.add_transcript(text)
    assert len(session.transcript_window) == 3
    assert "birinci" not in session.transcript_window
    assert session.transcript_window == ["ikinci", "üçüncü", "dördüncü"]

@test("Recent context concatenates window")
def test_recent_context():
    session = create_session("s3")
    session.add_transcript("yapay zeka")
    session.add_transcript("derin öğrenme")
    ctx = session.get_recent_context()
    assert "yapay zeka" in ctx
    assert "derin öğrenme" in ctx

@test("Empty transcripts not added to window")
def test_empty_not_in_window():
    session = create_session("s4")
    session.add_transcript("")
    session.add_transcript("   ")
    assert len(session.transcript_window) == 0
    assert session.chunk_counter == 2

@test("Reset clears all session state")
def test_reset():
    session = create_session("s5")
    session.add_transcript("data")
    session.detected_language = "tr"
    session.reset()
    assert session.chunk_counter == 0
    assert session.total_transcribed_text == ""
    assert len(session.transcript_window) == 0
    assert session.detected_language is None

@test("Total text accumulates beyond window size")
def test_total_accumulation():
    session = create_session("s6")
    session.window_size = 2
    for t in ["birinci", "ikinci", "üçüncü"]:
        session.add_transcript(t)
    assert len(session.transcript_window) == 2
    for t in ["birinci", "ikinci", "üçüncü"]:
        assert t in session.total_transcribed_text


# ─── 4. Session-Aware Transcription ───

@test("Session transcription updates session state")
async def test_session_transcribe():
    set_mock_client("slayt içeriği hakkında")
    session = create_session("live-1", SupportedLanguage.TURKISH)
    result = await transcribe_with_session(
        audio_data=make_audio_bytes(5000), session=session
    )
    assert result.text == "slayt içeriği hakkında"
    assert session.chunk_counter == 1
    assert len(session.transcript_window) == 1

@test("Session context passed as prompt to Whisper")
async def test_session_context_as_prompt():
    session = create_session("live-2", SupportedLanguage.TURKISH)
    session.add_transcript("yapay zeka nedir")
    session.add_transcript("makine öğrenmesi")

    mock = set_mock_client("derin öğrenme ağları")
    result = await transcribe_with_session(
        audio_data=make_audio_bytes(5000), session=session
    )
    assert result.text == "derin öğrenme ağları"
    call_kw = mock.audio.transcriptions.create.call_args.kwargs
    assert "prompt" in call_kw
    assert "yapay zeka nedir" in call_kw["prompt"]

@test("Multiple sequential chunks handled correctly")
async def test_multi_chunk_session():
    session = create_session("live-3")
    texts = ["giriş", "ana konu", "sonuç"]
    for t in texts:
        set_mock_client(t)
        result = await transcribe_with_session(
            audio_data=make_audio_bytes(5000), session=session
        )
        assert result.text == t
    assert session.chunk_counter == 3
    for t in texts:
        assert t in session.total_transcribed_text

@test("Language detected on first non-empty chunk")
async def test_language_detection():
    session = create_session("live-4", SupportedLanguage.AUTO)
    assert session.detected_language is None
    set_mock_client("Hello world")
    await transcribe_with_session(
        audio_data=make_audio_bytes(5000), session=session
    )
    assert session.detected_language == "auto"


# ─── 5. TranscriptionResult ───

@test("is_empty: empty string")
def test_result_empty():
    r = TranscriptionResult(text="", language="tr", duration_ms=100)
    assert r.is_empty

@test("is_empty: period only")
def test_result_period():
    r = TranscriptionResult(text=".", language="tr", duration_ms=100)
    assert r.is_empty

@test("is_empty: whitespace only")
def test_result_whitespace():
    r = TranscriptionResult(text="   ", language="tr", duration_ms=100)
    assert r.is_empty

@test("not empty: real text")
def test_result_not_empty():
    r = TranscriptionResult(text="Merhaba", language="tr", duration_ms=100)
    assert not r.is_empty

@test("to_dict serializes correctly")
def test_result_to_dict():
    r = TranscriptionResult(
        text="test", language="tr", duration_ms=150.5,
        chunk_index=2, is_partial=True, confidence=0.95
    )
    d = r.to_dict()
    assert d["text"] == "test"
    assert d["language"] == "tr"
    assert d["duration_ms"] == 150.5
    assert d["chunk_index"] == 2
    assert d["is_partial"] is True
    assert d["confidence"] == 0.95


# ═══════════════════════════════════════════════
# RUN ALL TESTS
# ═══════════════════════════════════════════════

async def main():
    print("\n" + "=" * 60)
    print("🧪 STT SERVICE - UNIT TEST SUITE")
    print("=" * 60)

    # Collect all test functions
    all_tests = [
        # 1. Audio Validation
        ("1. AUDIO VALIDATION", [
            test_valid_webm, test_valid_webm_opus, test_valid_ogg,
            test_valid_wav, test_valid_mp3, test_valid_flac,
            test_reject_small, test_reject_large, test_reject_unsupported,
            test_reject_non_audio, test_exact_min, test_case_insensitive,
        ]),
        # 2. Transcription
        ("2. TRANSCRIPTION (Mocked Whisper API)", [
            test_transcribe_success, test_transcribe_with_prompt,
            test_auto_language, test_english_language,
            test_empty_transcription, test_whitespace_transcription,
            test_retry_success, test_no_retry_400, test_fail_all_retries,
        ]),
        # 3. Session State
        ("3. SESSION STATE (Sliding Window)", [
            test_create_session, test_add_transcript, test_sliding_window,
            test_recent_context, test_empty_not_in_window, test_reset,
            test_total_accumulation,
        ]),
        # 4. Session-Aware Transcription
        ("4. SESSION-AWARE TRANSCRIPTION", [
            test_session_transcribe, test_session_context_as_prompt,
            test_multi_chunk_session, test_language_detection,
        ]),
        # 5. TranscriptionResult
        ("5. TRANSCRIPTION RESULT", [
            test_result_empty, test_result_period, test_result_whitespace,
            test_result_not_empty, test_result_to_dict,
        ]),
    ]

    for section_name, tests in all_tests:
        print(f"\n── {section_name} ──")
        for t in tests:
            await run_test(t)

    # Summary
    total = passed + failed
    print("\n" + "=" * 60)
    print(f"RESULTS: {passed}/{total} passed, {failed} failed")

    if failed > 0:
        print(f"\nFAILED TESTS:")
        for name, err in errors:
            print(f"   • {name}: {err}")
        print("\n" + "=" * 60)
        sys.exit(1)
    else:
        print("ALL TESTS PASSED!")
        print("=" * 60)
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())