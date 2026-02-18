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

            async def client_to_deepgram():
                """
                Frontend audio bytes -> Deepgram
                """
                try:
                    while not stop.is_set():
                        msg = await websocket.receive()
                        if "bytes" in msg and msg["bytes"] is not None:
                            await dg.send_audio(msg["bytes"])
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
                        text, is_final, conf = extract_transcript(payload)
                        if text:
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
