"""
STT Test Endpoints — for Swagger/docs testing.

These are temporary development endpoints to test STT and slide matching
via REST (file upload) instead of WebSocket.

Remove or disable in production.

Usage in Swagger (/docs):
    1. POST /api/v1/stt/test-transcribe → Upload an audio file, get transcript
    2. POST /api/v1/stt/test-match → Upload audio + presentation_id, get transcript + slide match
    3. GET  /api/v1/stt/health → Check if STT service is ready
"""

from fastapi import APIRouter, UploadFile, File, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.logger import logger
from app.core.database import AsyncSessionLocal
from app.models.presentation import Slide, Presentation
from app.services.stt_service import (
    transcribe_audio,
    create_session,
    transcribe_with_session,
    SupportedLanguage,
    STTError,
)
from app.services.slide_matcher import (
    build_presentation_context,
    match_transcript_to_slides,
)


router = APIRouter()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


# Extension → MIME type mapping for Swagger uploads
EXTENSION_TO_MIME = {
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".mp4": "audio/mp4",
    ".m4a": "audio/m4a",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".flac": "audio/flac",
    ".oga": "audio/ogg",
    ".opus": "audio/ogg;codecs=opus",
    ".3gp": "audio/mp4",
    ".aac": "audio/mp4",
}


def resolve_content_type(filename: str | None, upload_content_type: str | None) -> str:
    if filename:
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext in EXTENSION_TO_MIME:
            return EXTENSION_TO_MIME[ext]
    if upload_content_type and upload_content_type.startswith("audio/"):
        return upload_content_type
    if upload_content_type == "video/mp4":
        return "audio/mp4"
    return "audio/mp4"


@router.get("/health")
async def stt_health():
    """Check if STT service is operational."""
    try:
        from app.services.stt_service import get_client
        client = get_client()
        return {"status": "ok", "service": "stt", "whisper_model": "whisper-1", "message": "STT service is ready"}
    except Exception as e:
        return {"status": "error", "service": "stt", "message": str(e)}


@router.post("/test-transcribe")
async def test_transcribe(
    audio: UploadFile = File(..., description="Audio file: mp4, m4a, webm, ogg, wav, mp3, flac"),
    language: str = Query(default="auto", description="Language: 'tr', 'en', or 'auto'"),
):
    """
    🎤 Test Speech-to-Text

    Upload any audio file and get the transcript back.
    Supported formats: mp4, m4a, webm, ogg, wav, mp3, flac, 3gp, aac
    """
    audio_data = await audio.read()
    content_type = resolve_content_type(audio.filename, audio.content_type)

    logger.info(f"STT test-transcribe: file={audio.filename}, size={len(audio_data)} bytes, upload_type={audio.content_type}, resolved_type={content_type}")

    lang_map = {"tr": SupportedLanguage.TURKISH, "en": SupportedLanguage.ENGLISH, "auto": SupportedLanguage.AUTO}
    lang = lang_map.get(language, SupportedLanguage.AUTO)

    try:
        result = await transcribe_audio(audio_data=audio_data, content_type=content_type, language=lang)
        return {
            "status": "success",
            "transcript": result.text,
            "language": result.language,
            "duration_ms": result.duration_ms,
            "is_empty": result.is_empty,
            "audio_size_bytes": len(audio_data),
            "filename": audio.filename,
            "upload_content_type": audio.content_type,
            "detected_content_type": content_type,
        }
    except STTError as e:
        return {"status": "error", "message": e.message, "details": e.details, "filename": audio.filename, "detected_content_type": content_type}


@router.post("/test-match")
async def test_match(
    audio: UploadFile = File(..., description="Audio file: mp4, m4a, webm, ogg, wav, mp3, flac"),
    presentation_id: int = Query(..., description="Presentation ID to match against"),
    current_slide: int = Query(default=1, description="Current slide number (1-based)"),
    language: str = Query(default="auto", description="Language: 'tr', 'en', or 'auto'"),
    use_semantic: bool = Query(default=True, description="Use semantic matching (embedding comparison)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Test Full Pipeline: Audio → Transcript → Slide Match

    Upload audio + presentation ID to see transcript and slide match result.
    Try saying "sonraki slayt" to test voice commands!
    """
    audio_data = await audio.read()
    content_type = resolve_content_type(audio.filename, audio.content_type)

    lang_map = {"tr": SupportedLanguage.TURKISH, "en": SupportedLanguage.ENGLISH, "auto": SupportedLanguage.AUTO}
    lang = lang_map.get(language, SupportedLanguage.AUTO)

    result = await db.execute(select(Slide).where(Slide.presentation_id == presentation_id).order_by(Slide.page_number))
    slides = result.scalars().all()

    if not slides:
        return {"status": "error", "message": f"No slides found for presentation {presentation_id}"}

    slides_data = [
        {"page_number": s.page_number, "content_text": s.content_text or "", "embedding": list(s.embedding) if s.embedding is not None else None}
        for s in slides
    ]

    context = await build_presentation_context(presentation_id, slides_data)
    if current_slide > 1:
        context.advance_to(current_slide)

    try:
        transcript_result = await transcribe_audio(audio_data=audio_data, content_type=content_type, language=lang)
    except STTError as e:
        return {"status": "error", "step": "transcription", "message": e.message, "details": e.details}

    match_result = await match_transcript_to_slides(transcript=transcript_result.text, context=context, use_semantic=use_semantic)

    slide_keywords = {}
    for sc in context.slides:
        slide_keywords[sc.page_number] = {"keywords": sc.keywords[:10], "transition_phrases": sc.transition_phrases[:5]}

    return {
        "status": "success",
        "transcription": {"text": transcript_result.text, "language": transcript_result.language, "duration_ms": transcript_result.duration_ms, "is_empty": transcript_result.is_empty},
        "slide_match": {"should_advance": match_result.should_advance, "match_type": match_result.match_type.value, "confidence": round(match_result.confidence, 3), "current_slide": match_result.current_slide, "target_slide": match_result.target_slide, "matched_keywords": match_result.matched_keywords},
        "context": {"total_slides": len(slides_data), "current_slide": current_slide, "slide_info": slide_keywords},
        "audio": {"size_bytes": len(audio_data), "filename": audio.filename, "detected_content_type": content_type},
    }