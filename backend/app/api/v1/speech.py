import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.logger import logger
from app.services.speech.deepgram_stream import DeepgramStream, extract_transcript

router = APIRouter(tags=["speech"])


@router.websocket("/ws/stt")
async def ws_stt(websocket: WebSocket):
    await websocket.accept()
    logger.info("WS /ws/stt connected")

    try:
        async with DeepgramStream() as dg:
            stop = asyncio.Event()
            audio_chunks = 0

            async def client_to_deepgram():
                """
                Frontend audio bytes -> Deepgram
                """
                nonlocal audio_chunks
                try:
                    while not stop.is_set():
                        msg = await websocket.receive()
                        if msg.get("type") == "websocket.disconnect":
                            stop.set()
                            break
                        if "bytes" in msg and msg["bytes"] is not None:
                            await dg.send_audio(msg["bytes"])
                            audio_chunks += 1
                            if audio_chunks == 1 or audio_chunks % 50 == 0:
                                logger.info(f"WS /ws/stt forwarded audio chunks: {audio_chunks}")
                        elif "text" in msg and msg["text"] is not None:
                            text = msg["text"]
                            if text == "__STOP__":
                                stop.set()
                                break
                except WebSocketDisconnect:
                    stop.set()
                except Exception as e:
                    logger.exception(f"client_to_deepgram error: {e}")
                    stop.set()

            async def deepgram_to_client():
                """
                Deepgram transcript -> Frontend
                """
                try:
                    async for payload in dg.transcripts():
                        payload_type = str(payload.get("type", "")).lower()
                        if payload_type == "error":
                            await websocket.send_json(
                                {
                                    "type": "stt_error",
                                    "message": payload.get("description") or payload.get("message") or "Deepgram error",
                                }
                            )
                            logger.warning(f"Deepgram error payload: {payload}")
                            continue

                        text, is_final, conf = extract_transcript(payload)
                        if text:
                            logger.info(
                                f"WS /ws/stt transcript: final={is_final} "
                                f"conf={conf:.2f} text='{text[:80]}'"
                            )
                            await websocket.send_json(
                                {
                                    "type": "transcript",
                                    "text": text,
                                    "is_final": is_final,
                                    "confidence": conf,
                                }
                            )
                        if stop.is_set():
                            break
                except Exception as e:
                    logger.exception(f"deepgram_to_client error: {e}")
                    stop.set()

            await asyncio.gather(client_to_deepgram(), deepgram_to_client())
            await dg.finish()

    except WebSocketDisconnect:
        logger.info("WS /ws/stt disconnected")
    except Exception as e:
        logger.exception(f"WS /ws/stt error: {e}")
        try:
            await websocket.close(code=1011)
        except Exception as close_err:
            logger.warning(f"WS /ws/stt close failed: {close_err}")
