from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.presentation import Presentation, Slide, PresentationStatus, FileType
from app.core.logger import logger
from datetime import datetime, timezone
import os


async def _save_presentation_with_slides(
    db: AsyncSession,
    user_id: int,
    title: str,
    file_path: str,
    slide_texts: list[str],
    embeddings: list[list[float]],
    *,
    file_type: FileType,
    file_size: int = 0,
    file_hash: Optional[str] = None,
    is_ai_generated: bool = False,
    ai_content_json: Optional[dict] = None,
) -> Presentation:
    """Shared persistence logic for both uploaded and AI-generated presentations:
    create the Presentation row (ANALYZING), attach embedded slides, then mark
    COMPLETED — or FAILED with the error recorded, on any exception."""
    presentation = None
    try:
        presentation = Presentation(
            title=title,
            original_filename=title,
            file_path=file_path,
            file_type=file_type,
            file_size_bytes=file_size,
            file_hash=file_hash,
            user_id=user_id,
            status=PresentationStatus.ANALYZING,
            slide_count=len(slide_texts),
            processing_started_at=datetime.now(timezone.utc),
            is_ai_generated=is_ai_generated,
            ai_content_json=ai_content_json,
        )
        db.add(presentation)
        await db.flush()

        if len(slide_texts) != len(embeddings):
            raise ValueError("The number of slide texts and embeddings do not match!")

        # Create slides with embeddings
        slide_objects = [
            Slide(
                presentation_id=presentation.id,
                page_number=i + 1,
                content_text=text,
                embedding=vector
            )
            for i, (text, vector) in enumerate(zip(slide_texts, embeddings))
        ]
        db.add_all(slide_objects)

        presentation.status = PresentationStatus.COMPLETED
        presentation.processing_completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(presentation)

        return presentation

    except Exception as e:
        await db.rollback()

        # Update status to FAILED if presentation was created
        if presentation:
            try:
                presentation.status = PresentationStatus.FAILED
                presentation.error_message = str(e)
                presentation.processing_completed_at = datetime.now(timezone.utc)
                await db.commit()
            except Exception as inner_e:
                logger.error(f"Failed to update presentation status to FAILED: {inner_e}")

        raise e


async def save_presentation_with_slides(
    db: AsyncSession,
    user_id: int,
    title: str,
    file_path: str,
    slide_texts: list[str],
    embeddings: list[list[float]],
    file_hash: str = None
) -> Presentation:
    file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
    file_type = FileType.PPTX if file_path.endswith('.pptx') else FileType.PDF
    return await _save_presentation_with_slides(
        db, user_id, title, file_path, slide_texts, embeddings,
        file_type=file_type, file_size=file_size, file_hash=file_hash,
    )


async def save_ai_presentation_with_slides(
    db: AsyncSession,
    user_id: int,
    title: str,
    file_path: str,
    slide_texts: list[str],
    embeddings: list[list[float]],
    ai_content_json: dict,
) -> Presentation:
    return await _save_presentation_with_slides(
        db, user_id, title, file_path, slide_texts, embeddings,
        file_type=FileType.AI, is_ai_generated=True, ai_content_json=ai_content_json,
    )