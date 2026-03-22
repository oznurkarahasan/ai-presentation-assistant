from fastapi import APIRouter, Depends, UploadFile, File, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.v1 import auth
from app.core.database import AsyncSessionLocal
from app.core.logger import logger
from app.core.exceptions import FileProcessingError, ValidationError
from app.services import pdf_service, pptx_service, embedding_service, vector_db, file_validator
import os
import shutil
import uuid

router = APIRouter()

# File size limit: 50MB
MAX_FILE_SIZE = 50 * 1024 * 1024

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.presentation import Presentation

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@router.get("/", response_model=list)
async def list_presentations(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    stmt = select(Presentation).where(Presentation.user_id == current_user.id).order_by(Presentation.created_at.desc())
    result = await db.execute(stmt)
    presentations = result.scalars().all()
    
    return [
        {
            "id": p.id,
            "title": p.title,
            "file_name": os.path.basename(p.file_path),
            "file_path": p.file_path,
            "file_type": p.file_type,
            "slide_count": p.slide_count,
            "status": p.status,
            "created_at": p.created_at.isoformat() if p.created_at else None
        }
        for p in presentations
    ]

@router.get("/{presentation_id}")
async def get_presentation(
    presentation_id: int,
    include_slides: bool = Query(False, description="Include slide text content in response"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    stmt = select(Presentation).where(
        Presentation.id == presentation_id,
        Presentation.user_id == current_user.id
    )

    if include_slides:
        stmt = stmt.options(selectinload(Presentation.slides))

    result = await db.execute(stmt)
    presentation = result.scalar_one_or_none()
    
    if not presentation:
        raise ValidationError("Presentation not found")
        
    # Detect orientation and aspect ratio for frontend
    orientation = "landscape"
    aspect_ratio = 1.777
    if presentation.file_type == "pdf":
        orientation, aspect_ratio = pdf_service.get_pdf_orientation(presentation.file_path)
    elif presentation.file_type == "pptx":
        orientation, aspect_ratio = pptx_service.get_pptx_orientation(presentation.file_path)

    # Include PDF preview path for PPTX files
    pdf_preview_path = None
    if presentation.file_type == "pptx":
        preview = presentation.file_path + ".preview.pdf"
        if not os.path.exists(preview) and os.path.exists(presentation.file_path):
            # On-demand conversion for files uploaded before this feature was added
            await pptx_service.convert_to_pdf_preview(presentation.file_path)
        if os.path.exists(preview):
            pdf_preview_path = preview

    response = {
        "id": presentation.id,
        "title": presentation.title,
        "file_path": presentation.file_path,
        "file_type": presentation.file_type,
        "pdf_preview_path": pdf_preview_path,
        "slide_count": presentation.slide_count,
        "total_pages": presentation.slide_count,  # Added for frontend compatibility
        "status": presentation.status,
        "orientation": orientation,
        "aspect_ratio": aspect_ratio,
    }

    if include_slides:
        response["slides"] = [
            {"page_number": s.page_number, "content_text": s.content_text}
            for s in presentation.slides
        ]

    return response


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_presentation(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    logger.info(f"Upload request from user {current_user.id}: {file.filename}")

    # Validate file extension
    if not (file.filename.endswith(".pdf") or file.filename.endswith(".pptx")):
        logger.warning(f"Invalid file type attempted: {file.filename}")
        raise ValidationError("Only PDF and PPTX files are accepted.")

    # Validate file size first (more efficient to fail early)
    file.file.seek(0, 2)  # Move to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > MAX_FILE_SIZE:
        logger.warning(f"File too large: {file_size} bytes from user {current_user.id}")
        raise ValidationError(f"File size exceeds limit. Maximum allowed: {MAX_FILE_SIZE // (1024*1024)}MB")
    
    if file_size == 0:
        logger.warning(f"Empty file uploaded: {file.filename}")
        raise ValidationError("File is empty.")
    
    # Read first 512 bytes for magic byte validation
    file_header = await file.read(512)
    file.file.seek(0)
    
    # Validate file type using magic bytes (not just extension)
    file_validator.validate_file_type(file_header, file.filename)

    upload_dir = "uploaded_files"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename to prevent overwrite
    import re
    unique_id = uuid.uuid4().hex
    # Sanitize the filename: remove path traversal characters and keep only safe ones
    filename_from_user = os.path.basename(file.filename)
    filename_sanitized = re.sub(r'[^a-zA-Z0-9._-]', '_', filename_from_user)
    safe_filename = f"{current_user.id}_{unique_id}_{filename_sanitized}"
    file_path = os.path.join(upload_dir, safe_filename)
    
    try:
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"File saved: {file_path}")
        
        # Calculate file hash for analytics (optional)
        file_hash = file_validator.calculate_file_hash(file_path)
        
        file.file.seek(0)

        # Extract text based on file type (with security validation)
        if file.filename.endswith(".pdf"):
            slide_texts, _orientation, _aspect_ratio = await pdf_service.extract_text_from_pdf(file, file_size)
            logger.info(f"Extracted {len(slide_texts)} slides from PDF")
        elif file.filename.endswith(".pptx"):
            slide_texts, _orientation, _aspect_ratio = await pptx_service.extract_text_from_pptx(file, file_size)
            logger.info(f"Extracted {len(slide_texts)} slides from PPTX")
            # Convert to PDF preview for browser display (non-breaking — failure is logged only)
            await pptx_service.convert_to_pdf_preview(file_path)

        else:
            raise ValidationError("Unsupported file type")

        # Generate embeddings in parallel (10x faster!)
        logger.info(f"Generating embeddings for {len(slide_texts)} slides...")
        embeddings = await embedding_service.create_embeddings_batch(slide_texts)

        new_presentation = await vector_db.save_presentation_with_slides(
            db=db,
            user_id=current_user.id,
            title=file.filename,
            file_path=file_path,
            slide_texts=slide_texts,
            embeddings=embeddings,
            file_hash=file_hash
        )
        
        logger.info(f"Presentation uploaded successfully: ID={new_presentation.id}, User={current_user.id}")

        preview_path = file_path + ".preview.pdf"
        pdf_preview_path = preview_path if os.path.exists(preview_path) else None

        return {
            "id": new_presentation.id,
            "title": new_presentation.title,
            "pages": len(slide_texts),
            "status": "success",
            "pdf_preview_path": pdf_preview_path,
        }

    except Exception as e:
        # Clean up uploaded file on error
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"Cleaned up file after error: {file_path}")
            except Exception as cleanup_error:
                logger.warning(
                    f"Failed to clean up file after error: {file_path}. Cleanup error: {cleanup_error}",
                    exc_info=True,
                )
        
        logger.error(f"Upload failed for user {current_user.id}: {str(e)}", exc_info=True)
        raise FileProcessingError(
            message="Failed to process presentation",
            details=str(e)
        )

@router.delete("/{presentation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_presentation(
    presentation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    """Delete a presentation"""
    
    stmt = select(Presentation).where(
        Presentation.id == presentation_id,
        Presentation.user_id == current_user.id
    )
    result = await db.execute(stmt)
    presentation = result.scalar_one_or_none()
    
    if not presentation:
        raise ValidationError("Presentation not found")
    
    # Delete file from disk
    if os.path.exists(presentation.file_path):
        try:
            os.remove(presentation.file_path)
            logger.info(f"Deleted file: {presentation.file_path}")
        except Exception as e:
            logger.warning(f"Failed to delete file: {presentation.file_path}. Error: {e}")

    # Also delete PDF preview if it exists (PPTX uploads)
    preview_path = presentation.file_path + ".preview.pdf"
    if os.path.exists(preview_path):
        try:
            os.remove(preview_path)
            logger.info(f"Deleted PDF preview: {preview_path}")
        except Exception as e:
            logger.warning(f"Failed to delete PDF preview: {preview_path}. Error: {e}")
    
    # Delete from database (cascade will handle related records)
    await db.delete(presentation)
    await db.commit()
    
    logger.info(f"Presentation deleted: ID={presentation_id}, User={current_user.id}")
    return None