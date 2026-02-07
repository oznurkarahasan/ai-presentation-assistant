from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.stt_service import transcribe_audio
from app.core.logger import logger
from jose import jwt, JWTError
from app.core.config import settings
import io
import asyncio
import re
import json
import struct
import time
from collections import deque
from typing import Dict, List

router = APIRouter()

HALLUCINATION_PATTERNS = [
    r"altyazı", r"m\.k", r"m\.", r"k\.", r"izlediğiniz", 
    r"teşekkürler", r"okuduğunuz için", r"abone", r"çeviri"
]

# Session management for audio context
audio_sessions: Dict[str, Dict] = {}

class AudioBuffer:
    def __init__(self, max_size: int = 10):
        self.buffer = deque(maxlen=max_size)
        self.context_text = ""
        
    def add_chunk(self, chunk_data: dict):
        self.buffer.append(chunk_data)
        
    def get_context(self) -> str:
        # Return last few transcriptions for context
        recent_texts = [chunk.get('text', '') for chunk in list(self.buffer)[-3:]]
        return ' '.join(filter(None, recent_texts))

@router.websocket("/navigate")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(None)
):
    #Security: Authentication Check
    if not token:
        await websocket.close(code=4001, reason="Authentication Token Missing")
        return

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4002, reason="Invalid User Context")
            return
    except JWTError:
        await websocket.close(code=4002, reason="Invalid or Expired Token")
        return

    await websocket.accept()
    logger.info(f"WS Started: User {user_id} connected for live navigation")
    
    # Initialize audio session
    session_id = f"user_{user_id}"
    audio_sessions[session_id] = {
        'buffer': AudioBuffer(),
        'last_sequence': -1,
        'session_start': None
    }
    
    try:
        while True:
            data = await websocket.receive_bytes()
            
            #DoS Protection: Minimum & Maximum data size check
            if not data or len(data) < 1000 or len(data) > 2 * 1024 * 1024:  # Back to original
                continue

            try:
                # Simple approach - treat all data as audio
                audio_data = data
                timestamp = int(time.time() * 1000)
                
                #Use context manager for memory safety
                with io.BytesIO(audio_data) as audio_file:
                    audio_file.name = "chunk.webm"
                    text = await transcribe_audio(audio_file)
                
                if text and len(text.strip()) > 0:
                    clean_text = text.lower().strip()
                    
                    # Very minimal filtering
                    is_junk = False
                    if len(clean_text) <= 1:
                        is_junk = True
                    
                    if not is_junk:
                        logger.info(f"STT Result for User {user_id}: '{text}'")
                        
                        action = "info"
                        # Simple command detection
                        if re.search(r"(ileri|sonraki|next)", clean_text):
                            action = "next_slide"
                            logger.info(f"NEXT SLIDE command detected: {text}")
                        elif re.search(r"(geri|önceki|back)", clean_text):
                            action = "prev_slide"
                            logger.info(f"PREV SLIDE command detected: {text}")
                        
                        response = {
                            "action": action, 
                            "text": text,
                            "timestamp": timestamp
                        }
                        
                        logger.info(f"Sending response: {response}")
                        await websocket.send_json(response)

            except json.JSONDecodeError:
                logger.error(f"Invalid metadata format from User {user_id}")
                continue
            except struct.error:
                logger.error(f"Invalid binary format from User {user_id}")
                continue
            except Exception as e:
                logger.error(f"Transcription Error (User {user_id}): {e}")

    except WebSocketDisconnect:
        logger.info(f"WS Disconnected: User {user_id}")
        # Cleanup session
        if session_id in audio_sessions:
            del audio_sessions[session_id]
    except Exception as e:
        logger.error(f"WS Runtime Error (User {user_id}): {e}")
        # Cleanup session
        if session_id in audio_sessions:
            del audio_sessions[session_id]
