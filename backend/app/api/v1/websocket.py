"""
WebSocket endpoint for live presentation mode.

This is the bridge that connects:
    - Frontend (microphone audio) → STT Service → Slide Matcher → Frontend (slide commands)

Protocol:
    Client → Server:
        - Binary message: audio chunk (WebM/Opus bytes)
        - JSON text: {"type": "control", "action": "start|stop|pause|resume|set_slide", ...}

    Server → Client:
        - JSON text: {"type": "transcript", "text": "...", "chunk_index": N}
        - JSON text: {"type": "slide_change", "slide": N, "match_type": "keyword|semantic|..."}
        - JSON text: {"type": "status", "status": "connected|listening|processing|error"}
        - JSON text: {"type": "session_info", "session_id": "...", "presentation_id": N}
        - JSON text: {"type": "error", "message": "..."}

Authentication:
    - JWT token via query parameter: ws://host/ws/presentation/{id}?token=xxx
    - Guest token also supported: ws://host/ws/presentation/{id}?guest_token=xxx

Lifecycle:
    1. Client connects with presentation_id + token
    2. Server loads presentation slides, builds PresentationContext
    3. Client sends audio chunks
    4. Server transcribes (Whisper), matches slides, sends results
    5. Client or server closes connection
"""

import json
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import jwt, JWTError

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.logger import logger
from app.models.presentation import (
    Presentation, Slide, PresentationSession,
    SessionType, User,
)
from app.services.stt_service import (
    transcribe_with_session,
    create_session as create_stt_session,
    SupportedLanguage,
    STTError,
)
from app.services.slide_matcher import (
    match_transcript_to_slides,
    build_presentation_context,
    PresentationContext,
    MatchType,
    SlideMatchError,
)


router = APIRouter()


# ──────────────────────────────────────────────
# Helper: Authenticate WebSocket connection
# ──────────────────────────────────────────────

async def authenticate_ws(
    token: str | None,
    guest_token: str | None,
    db: AsyncSession,
) -> tuple[User | None, bool]:
    """
    Authenticate WebSocket connection.

    Returns:
        (user, is_guest) tuple.
        - Registered user: (User, False)
        - Guest user: (None, True)
        - Invalid: (None, False) — should reject
    """
    # Try JWT token first (registered user)
    if token:
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            user_id = payload.get("sub")
            if user_id:
                result = await db.execute(
                    select(User).where(User.id == int(user_id))
                )
                user = result.scalar_one_or_none()
                if user:
                    return user, False
        except JWTError:
            pass

    # Try guest token
    if guest_token:
        # For now, accept any non-empty guest token
        # In production, validate against guest session table
        return None, True

    return None, False


# ──────────────────────────────────────────────
# Helper: Load presentation slides from DB
# ──────────────────────────────────────────────

async def load_presentation_slides(
    presentation_id: int,
    user: User | None,
    is_guest: bool,
    db: AsyncSession,
) -> list[dict] | None:
    """
    Load presentation and its slides from database.

    Returns:
        List of slide dicts or None if not found/unauthorized.
    """
    # Fetch presentation
    result = await db.execute(
        select(Presentation).where(Presentation.id == presentation_id)
    )
    presentation = result.scalar_one_or_none()

    if not presentation:
        return None

    # Authorization check
    if not is_guest and user:
        if presentation.user_id != user.id:
            return None
    elif is_guest:
        if not presentation.is_guest_upload:
            # Guest can only access guest-uploaded presentations
            # or we allow it for demo purposes
            pass  # Allow for now, tighten later

    # Fetch slides ordered by page_number
    result = await db.execute(
        select(Slide)
        .where(Slide.presentation_id == presentation_id)
        .order_by(Slide.page_number)
    )
    slides = result.scalars().all()

    if not slides:
        return None

    return [
        {
            "page_number": s.page_number,
            "content_text": s.content_text or "",
            "embedding": list(s.embedding) if s.embedding is not None else None,
        }
        for s in slides
    ]


# ──────────────────────────────────────────────
# Helper: Create presentation session record
# ──────────────────────────────────────────────

async def create_db_session(
    db: AsyncSession,
    user: User | None,
    presentation_id: int,
    session_type: SessionType,
) -> PresentationSession:
    """Create a new presentation session in the database."""
    session = PresentationSession(
        user_id=user.id if user else None,
        session_uuid=str(uuid.uuid4()),
        presentation_id=presentation_id,
        session_type=session_type,
        started_at=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def close_db_session(
    db: AsyncSession,
    db_session_record: PresentationSession,
    metrics: dict | None = None,
):
    """Close a presentation session and save metrics."""
    db_session_record.ended_at = datetime.now(timezone.utc)
    if db_session_record.started_at:
        delta = db_session_record.ended_at - db_session_record.started_at
        db_session_record.duration_seconds = int(delta.total_seconds())
    if metrics:
        db_session_record.metrics_json = metrics
    try:
        await db.commit()
    except Exception as e:
        logger.error(f"Failed to close session: {e}")


# ──────────────────────────────────────────────
# Helper: Send JSON message via WebSocket
# ──────────────────────────────────────────────

async def ws_send(websocket: WebSocket, msg_type: str, **kwargs):
    """Send a typed JSON message to the client."""
    message = {"type": msg_type, **kwargs}
    await websocket.send_json(message)


# ──────────────────────────────────────────────
# Main WebSocket Endpoint
# ──────────────────────────────────────────────

@router.websocket("/ws/presentation/{presentation_id}")
async def websocket_presentation(
    websocket: WebSocket,
    presentation_id: int,
    token: str | None = Query(default=None),
    guest_token: str | None = Query(default=None),
    mode: str = Query(default="live"),  # "live" or "rehearsal"
    language: str = Query(default="auto"),  # "tr", "en", "auto"
):
    """
    WebSocket endpoint for live/rehearsal presentation mode.

    Query params:
        token: JWT access token (registered user)
        guest_token: Guest session token
        mode: "live" or "rehearsal"
        language: "tr", "en", or "auto"
    """
    # ── Phase 1: Accept connection ──
    await websocket.accept()
    logger.info(
        f"WebSocket connection attempt: "
        f"presentation_id={presentation_id}, mode={mode}"
    )

    # ── Phase 2: Authenticate ──
    async with AsyncSessionLocal() as db:
        user, is_guest = await authenticate_ws(token, guest_token, db)

        if not user and not is_guest:
            await ws_send(websocket, "error",
                          message="Authentication failed. Provide a valid token.")
            await websocket.close(code=4001, reason="Unauthorized")
            return

        user_label = f"user={user.id}" if user else "guest"
        logger.info(f"WebSocket authenticated: {user_label}")

        # ── Phase 3: Load presentation ──
        slides_data = await load_presentation_slides(
            presentation_id, user, is_guest, db
        )

        if not slides_data:
            await ws_send(websocket, "error",
                          message="Presentation not found or access denied.")
            await websocket.close(code=4004, reason="Not found")
            return

        # ── Phase 4: Build contexts ──
        presentation_context = await build_presentation_context(
            presentation_id, slides_data
        )

        # Map language string to enum
        lang_map = {
            "tr": SupportedLanguage.TURKISH,
            "en": SupportedLanguage.ENGLISH,
            "auto": SupportedLanguage.AUTO,
        }
        stt_language = lang_map.get(language, SupportedLanguage.AUTO)

        session_id = f"{presentation_id}_{int(time.time())}"
        stt_session = create_stt_session(session_id, stt_language)

        # Determine session type
        session_type = (
            SessionType.REHEARSAL if mode == "rehearsal"
            else SessionType.LIVE
        )

        # Create DB session record
        db_session_record = await create_db_session(
            db, user, presentation_id, session_type
        )

        # ── Phase 5: Send initial state ──
        await ws_send(websocket, "session_info",
                      session_id=session_id,
                      presentation_id=presentation_id,
                      total_slides=len(slides_data),
                      current_slide=1,
                      mode=mode,
                      language=language)

        await ws_send(websocket, "status", status="connected")

        # ── Phase 6: Main message loop ──
        is_listening = True
        total_transcripts = 0
        total_slide_changes = 0
        content_type = "audio/webm"

        try:
            while True:
                message = await websocket.receive()

                # ── Handle text messages (control commands) ──
                if "text" in message:
                    try:
                        data = json.loads(message["text"])
                        msg_type = data.get("type", "")

                        if msg_type == "control":
                            action = data.get("action", "")

                            if action == "start":
                                is_listening = True
                                await ws_send(websocket, "status",
                                              status="listening")

                            elif action == "stop":
                                is_listening = False
                                await ws_send(websocket, "status",
                                              status="stopped")

                            elif action == "pause":
                                is_listening = False
                                await ws_send(websocket, "status",
                                              status="paused")

                            elif action == "resume":
                                is_listening = True
                                await ws_send(websocket, "status",
                                              status="listening")

                            elif action == "set_slide":
                                slide_num = data.get("slide", 1)
                                presentation_context.advance_to(slide_num)
                                await ws_send(
                                    websocket, "slide_change",
                                    slide=slide_num,
                                    match_type="manual",
                                    confidence=1.0,
                                )

                            elif action == "set_content_type":
                                content_type = data.get(
                                    "content_type", "audio/webm"
                                )

                            elif action == "end_session":
                                break

                        elif msg_type == "ping":
                            await ws_send(websocket, "pong",
                                          timestamp=time.time())

                    except json.JSONDecodeError:
                        await ws_send(websocket, "error",
                                      message="Invalid JSON message")

                # ── Handle binary messages (audio chunks) ──
                elif "bytes" in message:
                    if not is_listening:
                        continue

                    audio_data = message["bytes"]

                    # Skip very small chunks (likely silence)
                    if len(audio_data) < 500:
                        continue

                    await ws_send(websocket, "status",
                                  status="processing")

                    try:
                        # Step 1: Transcribe audio
                        transcript_result = await transcribe_with_session(
                            audio_data=audio_data,
                            session=stt_session,
                            content_type=content_type,
                        )

                        total_transcripts += 1

                        # Send transcript to client (for live subtitles)
                        await ws_send(
                            websocket, "transcript",
                            text=transcript_result.text,
                            chunk_index=transcript_result.chunk_index,
                            duration_ms=transcript_result.duration_ms,
                            is_empty=transcript_result.is_empty,
                        )

                        # Step 2: Match transcript to slides
                        if not transcript_result.is_empty:
                            match_result = await match_transcript_to_slides(
                                transcript=transcript_result.text,
                                context=presentation_context,
                                use_semantic=True,
                            )

                            if match_result.should_advance:
                                # Update context
                                presentation_context.advance_to(
                                    match_result.target_slide
                                )
                                total_slide_changes += 1

                                # Send slide change command
                                await ws_send(
                                    websocket, "slide_change",
                                    slide=match_result.target_slide,
                                    match_type=match_result.match_type.value,
                                    confidence=match_result.confidence,
                                    matched_keywords=match_result.matched_keywords,
                                )

                                logger.info(
                                    f"Slide change: {match_result.current_slide}"
                                    f" → {match_result.target_slide} "
                                    f"({match_result.match_type.value}, "
                                    f"conf={match_result.confidence:.2f})"
                                )

                        await ws_send(websocket, "status",
                                      status="listening")

                    except STTError as e:
                        logger.warning(f"STT error: {e.message}")
                        await ws_send(websocket, "error",
                                      message=f"Transcription failed: {e.message}")
                        await ws_send(websocket, "status",
                                      status="listening")

                    except SlideMatchError as e:
                        logger.warning(f"Slide match error: {e.message}")
                        await ws_send(websocket, "status",
                                      status="listening")

                    except Exception as e:
                        logger.error(
                            f"Unexpected error in audio processing: {e}",
                            exc_info=True
                        )
                        await ws_send(websocket, "error",
                                      message="Processing error occurred")
                        await ws_send(websocket, "status",
                                      status="listening")

        except WebSocketDisconnect:
            logger.info(
                f"WebSocket disconnected: {user_label}, "
                f"presentation={presentation_id}"
            )

        except Exception as e:
            logger.error(
                f"WebSocket error: {e}", exc_info=True
            )

        finally:
            # ── Phase 7: Cleanup ──
            metrics = {
                "total_transcripts": total_transcripts,
                "total_slide_changes": total_slide_changes,
                "total_slides": len(slides_data),
                "final_slide": (
                    presentation_context.current_slide.page_number
                    if presentation_context.current_slide else 1
                ),
                "language": language,
                "mode": mode,
                "total_text": stt_session.total_transcribed_text[:5000],
            }

            await close_db_session(db, db_session_record, metrics)

            logger.info(
                f"Session closed: {session_id}, "
                f"transcripts={total_transcripts}, "
                f"slide_changes={total_slide_changes}"
            )