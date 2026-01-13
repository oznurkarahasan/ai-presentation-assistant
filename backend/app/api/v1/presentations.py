from fastapi import APIRouter, Depends, UploadFile, File, status
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

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

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
    unique_id = uuid.uuid4().hex
    safe_filename = f"{current_user.id}_{unique_id}_{file.filename}"
    file_path = f"{upload_dir}/{safe_filename}"
    
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
            slide_texts = await pdf_service.extract_text_from_pdf(file, file_size)
            logger.info(f"Extracted {len(slide_texts)} slides from PDF")
        elif file.filename.endswith(".pptx"):
            slide_texts = await pptx_service.extract_text_from_pptx(file, file_size)
            logger.info(f"Extracted {len(slide_texts)} slides from PPTX")
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
        
        return {
            "id": new_presentation.id,
            "title": new_presentation.title,
            "pages": len(slide_texts),
            "status": "success"
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