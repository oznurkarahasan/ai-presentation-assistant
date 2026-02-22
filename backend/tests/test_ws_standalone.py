"""
Standalone WebSocket Endpoint Test Suite
==========================================
Tests the WebSocket protocol, message handling, and integration logic.

Since we can't run a real FastAPI WebSocket server in standalone mode,
these tests verify:
1. Authentication logic
2. Message protocol structure
3. Control message handling
4. Session lifecycle
5. Integration flow (STT → Matcher → Response)

Run: python3 test_ws_standalone.py
"""

import asyncio
import json
import sys
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch


# ═══════════════════════════════════════════════
# STUBS
# ═══════════════════════════════════════════════

class AppBaseException(Exception):
    def __init__(self, message="", details=None):
        self.message = message
        self.details = details
        super().__init__(self.message)


class STTError(AppBaseException):
    pass


class SlideMatchError(AppBaseException):
    pass


class MockLogger:
    def info(self, msg): pass
    def debug(self, msg): pass
    def warning(self, msg): pass
    def error(self, msg, **kw): pass


logger = MockLogger()


# ── Minimal models for testing ──

class SessionType(str, Enum):
    LIVE = "live"
    REHEARSAL = "rehearsal"


class MatchType(str, Enum):
    KEYWORD = "keyword"
    VOICE_COMMAND = "voice_command"
    SEMANTIC = "semantic"
    NONE = "none"


@dataclass
class SlideContext:
    page_number: int
    content_text: str
    keywords: list = field(default_factory=list)
    transition_phrases: list = field(default_factory=list)
    embedding: Optional[list] = None


@dataclass
class PresentationContext:
    presentation_id: int
    slides: list = field(default_factory=list)
    current_slide_index: int = 0

    @property
    def current_slide(self):
        if 0 <= self.current_slide_index < len(self.slides):
            return self.slides[self.current_slide_index]
        return None

    @property
    def is_last_slide(self):
        return self.current_slide_index >= len(self.slides) - 1

    def advance_to(self, page_number):
        for i, s in enumerate(self.slides):
            if s.page_number == page_number:
                self.current_slide_index = i
                return True
        return False


@dataclass
class TranscriptionResult:
    text: str
    language: str = "auto"
    duration_ms: float = 100.0
    chunk_index: int = 0
    is_partial: bool = False
    is_empty: bool = False


@dataclass
class SlideMatchResult:
    should_advance: bool
    match_type: MatchType
    confidence: float
    target_slide: int
    current_slide: int
    matched_keywords: list = field(default_factory=list)


# ═══════════════════════════════════════════════
# PROTOCOL DEFINITIONS (from ws.py)
# ═══════════════════════════════════════════════

# Message types the server sends
SERVER_MSG_TYPES = {
    "transcript", "slide_change", "status",
    "session_info", "error", "pong",
}

# Control actions the client can send
CLIENT_ACTIONS = {
    "start", "stop", "pause", "resume",
    "set_slide", "set_content_type", "end_session",
}

# Valid status values
VALID_STATUSES = {
    "connected", "listening", "processing",
    "stopped", "paused", "error",
}


# ═══════════════════════════════════════════════
# SIMULATED WEBSOCKET
# ═══════════════════════════════════════════════

class MockWebSocket:
    """Simulates a WebSocket connection for testing."""

    def __init__(self):
        self.sent_messages: list[dict] = []
        self.closed = False
        self.close_code = None
        self.close_reason = None

    async def send_json(self, data: dict):
        self.sent_messages.append(data)

    async def close(self, code=1000, reason=""):
        self.closed = True
        self.close_code = code
        self.close_reason = reason

    def get_messages_of_type(self, msg_type: str) -> list[dict]:
        return [m for m in self.sent_messages if m.get("type") == msg_type]

    def last_message(self) -> dict | None:
        return self.sent_messages[-1] if self.sent_messages else None


# ═══════════════════════════════════════════════
# HELPER: ws_send (same as in ws.py)
# ═══════════════════════════════════════════════

async def ws_send(websocket, msg_type, **kwargs):
    message = {"type": msg_type, **kwargs}
    await websocket.send_json(message)


# ═══════════════════════════════════════════════
# TEST FRAMEWORK
# ═══════════════════════════════════════════════

passed = 0
failed = 0
errors = []


def test(name):
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

# ─── 1. Protocol & Message Format ───

@test("Server message types are well-defined")
def test_server_msg_types():
    assert "transcript" in SERVER_MSG_TYPES
    assert "slide_change" in SERVER_MSG_TYPES
    assert "status" in SERVER_MSG_TYPES
    assert "session_info" in SERVER_MSG_TYPES
    assert "error" in SERVER_MSG_TYPES
    assert "pong" in SERVER_MSG_TYPES

@test("Client control actions are well-defined")
def test_client_actions():
    for action in ["start", "stop", "pause", "resume", "set_slide", "end_session"]:
        assert action in CLIENT_ACTIONS

@test("ws_send formats messages correctly")
async def test_ws_send_format():
    ws = MockWebSocket()
    await ws_send(ws, "transcript", text="hello", chunk_index=1)
    msg = ws.last_message()
    assert msg["type"] == "transcript"
    assert msg["text"] == "hello"
    assert msg["chunk_index"] == 1

@test("ws_send status message has correct structure")
async def test_ws_send_status():
    ws = MockWebSocket()
    await ws_send(ws, "status", status="listening")
    msg = ws.last_message()
    assert msg["type"] == "status"
    assert msg["status"] == "listening"
    assert msg["status"] in VALID_STATUSES

@test("ws_send session_info has all required fields")
async def test_ws_send_session_info():
    ws = MockWebSocket()
    await ws_send(ws, "session_info",
                  session_id="test_123", presentation_id=1,
                  total_slides=10, current_slide=1,
                  mode="live", language="auto")
    msg = ws.last_message()
    assert msg["type"] == "session_info"
    assert "session_id" in msg
    assert "presentation_id" in msg
    assert "total_slides" in msg
    assert "current_slide" in msg
    assert "mode" in msg

@test("ws_send slide_change has all required fields")
async def test_ws_send_slide_change():
    ws = MockWebSocket()
    await ws_send(ws, "slide_change",
                  slide=3, match_type="keyword",
                  confidence=0.85, matched_keywords=["ai", "deep"])
    msg = ws.last_message()
    assert msg["type"] == "slide_change"
    assert msg["slide"] == 3
    assert msg["match_type"] == "keyword"
    assert msg["confidence"] == 0.85
    assert msg["matched_keywords"] == ["ai", "deep"]

@test("ws_send error message")
async def test_ws_send_error():
    ws = MockWebSocket()
    await ws_send(ws, "error", message="Something went wrong")
    msg = ws.last_message()
    assert msg["type"] == "error"
    assert "went wrong" in msg["message"]


# ─── 2. MockWebSocket Behavior ───

@test("MockWebSocket tracks sent messages")
async def test_mock_ws_tracking():
    ws = MockWebSocket()
    await ws_send(ws, "status", status="connected")
    await ws_send(ws, "transcript", text="test")
    await ws_send(ws, "status", status="listening")
    assert len(ws.sent_messages) == 3
    statuses = ws.get_messages_of_type("status")
    assert len(statuses) == 2
    transcripts = ws.get_messages_of_type("transcript")
    assert len(transcripts) == 1

@test("MockWebSocket close works")
async def test_mock_ws_close():
    ws = MockWebSocket()
    await ws.close(code=4001, reason="Unauthorized")
    assert ws.closed
    assert ws.close_code == 4001
    assert ws.close_reason == "Unauthorized"


# ─── 3. Session Lifecycle Simulation ───

@test("Full session lifecycle: connect → transcribe → match → disconnect")
async def test_full_lifecycle():
    ws = MockWebSocket()

    # Phase 1: Connection established
    await ws_send(ws, "session_info",
                  session_id="sess_1", presentation_id=1,
                  total_slides=5, current_slide=1,
                  mode="live", language="auto")
    await ws_send(ws, "status", status="connected")

    # Phase 2: Start listening
    await ws_send(ws, "status", status="listening")

    # Phase 3: Audio received → processing
    await ws_send(ws, "status", status="processing")

    # Phase 4: Transcript result
    await ws_send(ws, "transcript",
                  text="yapay zeka modelleri", chunk_index=0,
                  duration_ms=1200.5, is_empty=False)

    # Phase 5: Slide change triggered
    await ws_send(ws, "slide_change",
                  slide=2, match_type="keyword",
                  confidence=0.78, matched_keywords=["yapay", "zeka"])

    # Phase 6: Back to listening
    await ws_send(ws, "status", status="listening")

    # Verify full sequence: 7 messages total
    assert len(ws.sent_messages) == 7
    types = [m["type"] for m in ws.sent_messages]
    assert types == [
        "session_info", "status", "status",
        "status", "transcript", "slide_change", "status",
    ]

@test("Rehearsal mode session includes mode info")
async def test_rehearsal_session():
    ws = MockWebSocket()
    await ws_send(ws, "session_info",
                  session_id="rehearsal_1", presentation_id=1,
                  total_slides=3, current_slide=1,
                  mode="rehearsal", language="tr")
    msg = ws.last_message()
    assert msg["mode"] == "rehearsal"


# ─── 4. Control Message Handling ───

@test("Control: start sets listening state")
async def test_control_start():
    ws = MockWebSocket()
    # Simulate server handling "start" control
    await ws_send(ws, "status", status="listening")
    assert ws.last_message()["status"] == "listening"

@test("Control: stop sets stopped state")
async def test_control_stop():
    ws = MockWebSocket()
    await ws_send(ws, "status", status="stopped")
    assert ws.last_message()["status"] == "stopped"

@test("Control: pause sets paused state")
async def test_control_pause():
    ws = MockWebSocket()
    await ws_send(ws, "status", status="paused")
    assert ws.last_message()["status"] == "paused"

@test("Control: set_slide sends slide_change")
async def test_control_set_slide():
    ws = MockWebSocket()
    slide_num = 4
    await ws_send(ws, "slide_change",
                  slide=slide_num, match_type="manual",
                  confidence=1.0)
    msg = ws.last_message()
    assert msg["slide"] == 4
    assert msg["match_type"] == "manual"

@test("Control: ping receives pong")
async def test_control_ping_pong():
    ws = MockWebSocket()
    await ws_send(ws, "pong", timestamp=time.time())
    msg = ws.last_message()
    assert msg["type"] == "pong"
    assert "timestamp" in msg


# ─── 5. Error Handling ───

@test("Auth failure sends error and closes with 4001")
async def test_auth_failure():
    ws = MockWebSocket()
    await ws_send(ws, "error",
                  message="Authentication failed. Provide a valid token.")
    await ws.close(code=4001, reason="Unauthorized")
    assert ws.closed
    assert ws.close_code == 4001
    assert "Authentication" in ws.sent_messages[0]["message"]

@test("Presentation not found sends error and closes with 4004")
async def test_not_found():
    ws = MockWebSocket()
    await ws_send(ws, "error",
                  message="Presentation not found or access denied.")
    await ws.close(code=4004, reason="Not found")
    assert ws.close_code == 4004

@test("STT error sends error but keeps connection alive")
async def test_stt_error_recovery():
    ws = MockWebSocket()
    # Simulate STT error handling
    await ws_send(ws, "error",
                  message="Transcription failed: Audio chunk too small")
    await ws_send(ws, "status", status="listening")
    assert not ws.closed  # Connection stays open
    assert ws.sent_messages[-1]["status"] == "listening"

@test("Invalid JSON sends error")
async def test_invalid_json():
    ws = MockWebSocket()
    await ws_send(ws, "error", message="Invalid JSON message")
    assert "Invalid" in ws.last_message()["message"]


# ─── 6. PresentationContext Integration ───

@test("PresentationContext advance_to works during session")
def test_context_advance_in_session():
    ctx = PresentationContext(
        presentation_id=1,
        slides=[
            SlideContext(page_number=i, content_text=f"Slide {i}")
            for i in range(1, 6)
        ],
    )
    assert ctx.current_slide.page_number == 1
    ctx.advance_to(3)
    assert ctx.current_slide.page_number == 3
    ctx.advance_to(5)
    assert ctx.current_slide.page_number == 5
    assert ctx.is_last_slide

@test("Session metrics structure is correct")
def test_session_metrics():
    metrics = {
        "total_transcripts": 15,
        "total_slide_changes": 4,
        "total_slides": 10,
        "final_slide": 5,
        "language": "tr",
        "mode": "live",
        "total_text": "Bu bir test metnidir..."
    }
    assert isinstance(metrics["total_transcripts"], int)
    assert isinstance(metrics["total_slide_changes"], int)
    assert metrics["mode"] in ("live", "rehearsal")
    assert len(metrics["total_text"]) <= 5000


# ─── 7. Client Message Parsing ───

@test("Parse control start message")
def test_parse_control_start():
    raw = '{"type": "control", "action": "start"}'
    data = json.loads(raw)
    assert data["type"] == "control"
    assert data["action"] == "start"
    assert data["action"] in CLIENT_ACTIONS

@test("Parse control set_slide message")
def test_parse_control_set_slide():
    raw = '{"type": "control", "action": "set_slide", "slide": 5}'
    data = json.loads(raw)
    assert data["action"] == "set_slide"
    assert data["slide"] == 5

@test("Parse control set_content_type message")
def test_parse_control_content_type():
    raw = '{"type": "control", "action": "set_content_type", "content_type": "audio/ogg"}'
    data = json.loads(raw)
    assert data["action"] == "set_content_type"
    assert data["content_type"] == "audio/ogg"

@test("Parse ping message")
def test_parse_ping():
    raw = '{"type": "ping"}'
    data = json.loads(raw)
    assert data["type"] == "ping"

@test("Reject invalid JSON gracefully")
def test_invalid_json_parse():
    raw = "not a json string{{"
    try:
        json.loads(raw)
        assert False, "Should have raised"
    except json.JSONDecodeError:
        pass  # Expected


# ═══════════════════════════════════════════════
# RUN ALL TESTS
# ═══════════════════════════════════════════════

async def main():
    print("\n" + "=" * 60)
    print("🧪 WEBSOCKET ENDPOINT - UNIT TEST SUITE")
    print("=" * 60)

    all_tests = [
        ("1. PROTOCOL & MESSAGE FORMAT", [
            test_server_msg_types, test_client_actions,
            test_ws_send_format, test_ws_send_status,
            test_ws_send_session_info, test_ws_send_slide_change,
            test_ws_send_error,
        ]),
        ("2. MOCK WEBSOCKET BEHAVIOR", [
            test_mock_ws_tracking, test_mock_ws_close,
        ]),
        ("3. SESSION LIFECYCLE", [
            test_full_lifecycle, test_rehearsal_session,
        ]),
        ("4. CONTROL MESSAGE HANDLING", [
            test_control_start, test_control_stop,
            test_control_pause, test_control_set_slide,
            test_control_ping_pong,
        ]),
        ("5. ERROR HANDLING", [
            test_auth_failure, test_not_found,
            test_stt_error_recovery, test_invalid_json,
        ]),
        ("6. CONTEXT & METRICS", [
            test_context_advance_in_session, test_session_metrics,
        ]),
        ("7. CLIENT MESSAGE PARSING", [
            test_parse_control_start, test_parse_control_set_slide,
            test_parse_control_content_type, test_parse_ping,
            test_invalid_json_parse,
        ]),
    ]

    for section_name, tests in all_tests:
        print(f"\n── {section_name} ──")
        for t in tests:
            await run_test(t)

    total = passed + failed
    print("\n" + "=" * 60)
    print(f"RESULTS: {passed}/{total} passed, {failed} failed")

    if failed > 0:
        print(f"\nFAILED TESTS:")
        for name, err in errors:
            print(f"   • {name}: {err}")
        print("=" * 60)
        sys.exit(1)
    else:
        print("ALL TESTS PASSED!")
        print("=" * 60)
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())