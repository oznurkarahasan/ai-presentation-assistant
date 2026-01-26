import os
from groq import Groq
from app.core.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

async def transcribe_audio(file_obj) -> str:
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
        
        transcription = client.audio.transcriptions.create(
            file=("audio.wav", file_obj.read()),
            model="whisper-large-v3",
            prompt="Software presentation, Next.js, Python, RAG architecture, Slide transition, budget, analysis.",
            response_format="json",
            #language="tr",
            temperature=0.0
        )
        
        return transcription.text

    except Exception as e:
        print(f"STT Error: {str(e)}")
        return ""