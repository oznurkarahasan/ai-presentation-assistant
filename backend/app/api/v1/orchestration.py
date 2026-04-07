from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List, Any
import json
import time
from app.services import intent_service
from app.core.config import settings
from app.core.logger import logger
from app.core.database import AsyncSessionLocal
from app.models.presentation import PresentationSession, Slide, Base
from sqlalchemy import select, update, text

router = APIRouter()

_telemetry_store: Dict[str, Dict[str, Any]] = {}


def _init_metrics() -> Dict[str, Any]:
    return {
        "commands_received": 0,
        "commands_executed": 0,
        "low_confidence_rejections": 0,
        "unknown_transcripts": 0,
        "total_latency_ms": 0.0,
        "latency_samples": 0,
        "per_intent": {},
        "last_updated_at": time.time(),
    }


def _update_telemetry(presentation_id: str, intent: str, executed: bool, latency_ms: float):
    metrics = _telemetry_store.setdefault(presentation_id, _init_metrics())
    metrics["commands_received"] += 1
    metrics["total_latency_ms"] += latency_ms
    metrics["latency_samples"] += 1
    metrics["last_updated_at"] = time.time()

    intent_metrics = metrics["per_intent"].setdefault(intent, {"received": 0, "executed": 0})
    intent_metrics["received"] += 1

    if executed:
        metrics["commands_executed"] += 1
        intent_metrics["executed"] += 1
    else:
        metrics["low_confidence_rejections"] += 1


def _mark_unknown_transcript(presentation_id: str):
    metrics = _telemetry_store.setdefault(presentation_id, _init_metrics())
    metrics["unknown_transcripts"] += 1
    metrics["last_updated_at"] = time.time()


def _telemetry_snapshot(presentation_id: str) -> Dict[str, Any]:
    metrics = _telemetry_store.get(presentation_id)
    if not metrics:
        return {
            "presentation_id": presentation_id,
            "commands_received": 0,
            "commands_executed": 0,
            "success_rate": 0.0,
            "false_positive_estimate": 0.0,
            "avg_command_latency_ms": 0.0,
            "unknown_transcripts": 0,
            "per_intent": {},
            "last_updated_at": None,
        }

    commands_received = metrics["commands_received"]
    commands_executed = metrics["commands_executed"]
    low_confidence = metrics["low_confidence_rejections"]
    latency_samples = metrics["latency_samples"]

    success_rate = (commands_executed / commands_received) if commands_received else 0.0
    false_positive_estimate = (low_confidence / commands_received) if commands_received else 0.0
    avg_latency = (metrics["total_latency_ms"] / latency_samples) if latency_samples else 0.0

    return {
        "presentation_id": presentation_id,
        "commands_received": commands_received,
        "commands_executed": commands_executed,
        "success_rate": round(success_rate, 4),
        "false_positive_estimate": round(false_positive_estimate, 4),
        "avg_command_latency_ms": round(avg_latency, 2),
        "unknown_transcripts": metrics["unknown_transcripts"],
        "per_intent": metrics["per_intent"],
        "last_updated_at": metrics["last_updated_at"],
    }


@router.get("/telemetry/presentation/{presentation_id}")
async def get_presentation_telemetry(presentation_id: str):
    return _telemetry_snapshot(presentation_id)

class ConnectionManager:
    def __init__(self):
        # active_connections[presentation_id] = [WebSocket, ...]
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, presentation_id: str, websocket: WebSocket):
        logger.info(f"Attempting to accept WebSocket connection for presentation {presentation_id}")
        await websocket.accept()
        if presentation_id not in self.active_connections:
            self.active_connections[presentation_id] = []
        self.active_connections[presentation_id].append(websocket)
        logger.info(f"New connection for presentation {presentation_id}. Total: {len(self.active_connections[presentation_id])}")

    def disconnect(self, presentation_id: str, websocket: WebSocket):
        if presentation_id in self.active_connections:
            self.active_connections[presentation_id].remove(websocket)
            if not self.active_connections[presentation_id]:
                del self.active_connections[presentation_id]
        logger.info(f"Disconnected from presentation {presentation_id}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, presentation_id: str, message: dict):
        if presentation_id in self.active_connections:
            # Create a copy of the list to iterate safely
            connections = list(self.active_connections[presentation_id])
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(f"Failed to send message to a connection for {presentation_id}: {str(e)}")
                    # Optionally remove the broken connection
                    if connection in self.active_connections[presentation_id]:
                        self.active_connections[presentation_id].remove(connection)

manager = ConnectionManager()

@router.websocket("/ws/presentation/{presentation_id}")
async def websocket_orchestration(websocket: WebSocket, presentation_id: str):
    logger.info(f"[WebSocket Handshake] Start for presentation_id: {presentation_id}")
    logger.debug(f"Loaded tables: {list(Base.metadata.tables.keys())}")
    try:
        await manager.connect(presentation_id, websocket)
        logger.info(f"[WebSocket Handshake] Connection accepted for {presentation_id}")
    except Exception as e:
        logger.error(f"[WebSocket Handshake] Failed for {presentation_id}: {str(e)}")
        return
        
    try:
        while True:
            # Receive text from the client (real-time transcript segment)
            data = await websocket.receive_text()
            logger.debug(f"Received WebSocket message for {presentation_id}: {data[:50]}...")
            try:
                payload = json.loads(data)
                transcript = payload.get("transcript", "")
                is_final = payload.get("is_final", False)
                current_slide = payload.get("current_page", 1)
                total_slides = payload.get("total_pages", 1)
                
                if is_final:
                    # Perform intent analysis with context
                    command_start = time.perf_counter()
                    current_slide_text = ""
                    try:
                        async with AsyncSessionLocal() as db:
                            slide_stmt = select(Slide.content_text).where(
                                Slide.presentation_id == int(presentation_id),
                                Slide.page_number == int(current_slide)
                            )
                            slide_result = await db.execute(slide_stmt)
                            current_slide_text = slide_result.scalar_one_or_none() or ""
                    except Exception as slide_err:
                        logger.warning(f"Failed to load slide text for semantic zoom targeting: {slide_err}")

                    logger.info(f"Analyzing intent for presentation {presentation_id} (Slide {current_slide}/{total_slides}): {transcript}")
                    result = await intent_service.analyze_intent(
                        transcript,
                        current_slide,
                        total_slides,
                        current_slide_text=current_slide_text,
                    )
                    command_latency_ms = (time.perf_counter() - command_start) * 1000
                    logger.info(
                        f"Analysis result for {presentation_id}: "
                        f"intent={result.intent}, confidence={result.confidence:.2f}, target={result.slide_number}, region={result.region}, focus_target={result.focus_target}, focus_index={result.focus_index}, latency_ms={command_latency_ms:.2f}"
                    )
                    
                    if result.intent != intent_service.IntentType.UNKNOWN:
                        if result.confidence >= settings.INTENT_COMMAND_CONFIDENCE_THRESHOLD:
                            # Broadcast the command to all listeners
                            command_message = {
                                "type": "COMMAND",
                                "payload": result.to_dict()
                            }
                            await manager.broadcast(presentation_id, command_message)
                            _update_telemetry(presentation_id, result.intent.value, True, command_latency_ms)
                        else:
                            # Safe fallback: do not execute low-confidence commands.
                            await manager.broadcast(presentation_id, {
                                "type": "FEEDBACK",
                                "payload": {
                                    "message": "Low confidence command detected. Please repeat the command clearly.",
                                    "intent": result.intent.value,
                                    "confidence": result.confidence,
                                    "executed": False
                                }
                            })
                            _update_telemetry(presentation_id, result.intent.value, False, command_latency_ms)
                    else:
                        _mark_unknown_transcript(presentation_id)
                    
                    # Persist the current state to the latest active session (no await to keep responsive)
                    try:
                        async with AsyncSessionLocal() as db:
                            # Update the most recent active session for this presentation
                            # Note: presentation_id is a string from the URL, converting to int
                            stmt = (
                                update(PresentationSession)
                                .where(PresentationSession.presentation_id == int(presentation_id))
                                .where(PresentationSession.ended_at == None)
                                .values(current_slide_index=current_slide)
                            )
                            await db.execute(stmt)
                            await db.commit()
                            logger.debug(f"Persisted slide state {current_slide} for presentation {presentation_id}")
                    except Exception as db_err:
                        logger.error(f"Database session update failed for {presentation_id}: {db_err}")
                
                else:
                    # Broadcast interim transcript for UI feedback
                    await manager.broadcast(presentation_id, {
                        "type": "TRANSCRIPT",
                        "payload": {"transcript": transcript, "is_final": False}
                    })
                
                # Optionally echo back transcript acknowledgment or partial processing
                # For now, we mainly care about the intent detection commands
                
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received on WebSocket: {data}")
                
    except WebSocketDisconnect:
        manager.disconnect(presentation_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        manager.disconnect(presentation_id, websocket)
