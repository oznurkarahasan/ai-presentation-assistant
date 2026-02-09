import os
from groq import Groq
from app.core.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

async def transcribe_audio(file_obj, prompt: str = None) -> str:
    """
    Takes an audio file (file-like object) and converts it into text.
    Maximum file size: 25MB
    """
    try:
        file_obj.seek(0)
        
        file_obj.seek(0, 2)
        file_size = file_obj.tell()
        file_obj.seek(0)
        
        if file_size > 25 * 1024 * 1024:
            raise ValueError("Audio file too large. Maximum size is 25MB.")
        
        params = {
            "file": ("audio.webm", file_obj.read()),
            "model": "whisper-large-v3",
            "response_format": "json",
            "language": "tr",
            "temperature": 0.0  # Back to 0 for consistency
        }
        
        if prompt and len(prompt.strip()) > 0:
            # Use previous context to improve accuracy
            params["prompt"] = prompt[-100:]  # Shorter context

        transcription = client.audio.transcriptions.create(**params)
        
        return transcription.text.strip()

    except Exception as e:
        print(f"STT Error: {str(e)}")
        return ""