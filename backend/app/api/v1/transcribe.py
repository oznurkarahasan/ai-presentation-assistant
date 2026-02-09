# backend/app/api/v1/transcribe.py

from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.stt_service import transcribe_audio

router = APIRouter()

@router.post("/speech-to-text")
async def speech_to_text(file: UploadFile = File(...)):
    """
    Converts the uploaded audio file into text.
    This endpoint is for testing purposes only and contains no business logic.
    """
    text = await transcribe_audio(file.file)
    
    if not text:
        raise HTTPException(status_code=500, detail="Failed to transcribe audio.")
        
    return {"text": text}