from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.logger import logger

router = APIRouter(tags=["speech"])


@router.websocket("/ws/stt")
async def ws_stt(websocket: WebSocket):
    await websocket.accept()
    logger.info("WS /ws/stt connected")

    try:
        while True:
            message = await websocket.receive()

            # Client may send binary audio chunks
            if "bytes" in message and message["bytes"] is not None:
                data = message["bytes"]
                await websocket.send_json({"type": "echo_bytes", "len": len(data)})
                continue

            # Client may send plain text messages
            if "text" in message and message["text"] is not None:
                text = message["text"]
                await websocket.send_json({"type": "echo_text", "text": text})
                continue

    except WebSocketDisconnect:
        logger.info("WS /ws/stt disconnected")
    except RuntimeError as e:
        if "disconnect message" in str(e):
            logger.info("WS /ws/stt disconnected")
        else:
            logger.exception(f"WS /ws/stt runtime error: {e}")
            try:
                await websocket.close(code=1011)
            except Exception:
                pass
    except Exception as e:
        logger.exception(f"WS /ws/stt error: {e}")
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
