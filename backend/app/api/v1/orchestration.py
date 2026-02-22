from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, List
import json
from app.services import intent_service
from app.core.logger import logger
from app.core.database import AsyncSessionLocal
from app.models.presentation import PresentationSession, Base
from sqlalchemy import select, update, text

router = APIRouter()

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
                    logger.info(f"Analyzing intent for presentation {presentation_id} (Slide {current_slide}/{total_slides}): {transcript}")
                    result = await intent_service.analyze_intent(transcript, current_slide, total_slides)
                    logger.info(f"Analysis result for {presentation_id}: intent={result.intent}, target={result.slide_number}")
                    
                    if result.intent != intent_service.IntentType.UNKNOWN:
                        # Broadcast the command to all listeners
                        command_message = {
                            "type": "COMMAND",
                            "payload": result.to_dict()
                        }
                        await manager.broadcast(presentation_id, command_message)
                    
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
