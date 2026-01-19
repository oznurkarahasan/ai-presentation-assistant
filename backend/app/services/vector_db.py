from sqlalchemy.ext.asyncio import AsyncSession
from app.models.presentation import Presentation, Slide, PresentationStatus, FileType
from datetime import datetime, timezone
import os

async def save_presentation_with_slides(
    db: AsyncSession, 
    user_id: int, 
    title: str, 
    file_path: str,
    slide_texts: list[str], 
    embeddings: list[list[float]],
    file_hash: str = None
):
    presentation = None
    try:
        # Get file size
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0

        # Determine file type from filename
        file_type = FileType.PPTX if file_path.endswith('.pptx') else FileType.PDF

        # Create presentation with ANALYZING status
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
            processing_started_at=datetime.now(timezone.utc)
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
        
        # Update status to COMPLETED
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
                from app.core.logger import logger
                logger.error(f"Failed to update presentation status to FAILED: {inner_e}")
        
        raise e