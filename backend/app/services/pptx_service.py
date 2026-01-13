"""
PPTX text extraction service with security validation.
"""
from pptx import Presentation
from fastapi import UploadFile
from app.core.exceptions import FileProcessingError, ValidationError
from app.core.logger import logger
import re
import io

# Security limits (same as PDF)
MAX_PPTX_SLIDES = 500
MAX_SLIDE_SIZE_KB = 5000  # 5MB per slide

def clean_text(text: str) -> str:
    """
    Cleans extracted PPTX text by removing null bytes and other invalid characters.
    """
    # Remove null bytes
    text = text.replace('\x00', '')
    # Remove other control characters except newlines and tabs
    text = re.sub(r'[\x01-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', text)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def validate_pptx_security(prs: Presentation, file_size: int) -> None:
    """
    Validates PPTX for security issues: slide bombs, excessive size.
    
    Raises:
        ValidationError: If PPTX fails security checks
    """
    # Check slide count (PPTX bomb protection)
    num_slides = len(prs.slides)
    if num_slides > MAX_PPTX_SLIDES:
        logger.warning(f"PPTX has too many slides: {num_slides}")
        raise ValidationError(
            f"PPTX has too many slides ({num_slides}). Maximum allowed: {MAX_PPTX_SLIDES}"
        )
    
    # Check average slide size (detect compression bombs)
    avg_slide_size = file_size / num_slides if num_slides > 0 else 0
    if avg_slide_size > MAX_SLIDE_SIZE_KB * 1024:
        logger.warning(f"PPTX has suspicious slide size: {avg_slide_size/1024:.2f}KB per slide")
        raise ValidationError(
            "PPTX file has unusually large slides. This may be a malicious file."
        )
    
    logger.debug(f"PPTX security validation passed: {num_slides} slides, {file_size/1024:.2f}KB")

async def extract_text_from_pptx(file: UploadFile, file_size: int = 0) -> list[str]:
    """
    Reads the PPTX and returns each slide as an element of the list.
    Extracts both slide text and speaker notes.
    
    Args:
        file: Uploaded PPTX file
        file_size: File size in bytes (for security validation)
        
    Returns:
        List of text strings, one per slide
    """
    try:
        # Read file content into memory
        file_content = await file.read()
        file_bytes = io.BytesIO(file_content)
        
        # Load presentation
        prs = Presentation(file_bytes)
        
        if len(prs.slides) == 0:
            raise FileProcessingError("PPTX file has no slides")
        
        # Security validation
        validate_pptx_security(prs, file_size)
        
        slides_text = []
        
        for i, slide in enumerate(prs.slides, 1):
            try:
                text_parts = []
                
                # Extract text from all shapes in slide
                for shape in slide.shapes:
                    if hasattr(shape, "text") and shape.text:
                        text_parts.append(shape.text)
                
                # Extract speaker notes if available
                if slide.has_notes_slide:
                    notes_frame = slide.notes_slide.notes_text_frame
                    if notes_frame and notes_frame.text:
                        text_parts.append(f"Notes: {notes_frame.text}")
                
                # Combine all text from slide
                slide_text = "\n".join(text_parts) if text_parts else ""
                cleaned_text = clean_text(slide_text)
                slides_text.append(cleaned_text)
                
                logger.debug(f"Extracted slide {i}/{len(prs.slides)}")
                
            except Exception as e:
                logger.warning(f"Failed to extract slide {i}: {str(e)}")
                slides_text.append("")  # Add empty string for failed slides
        
        logger.info(f"Successfully extracted {len(slides_text)} slides from PPTX")
        return slides_text

    except Exception as e:
        logger.error(f"PPTX extraction error: {str(e)}", exc_info=True)
        raise FileProcessingError(
            message="Failed to extract text from PPTX",
            details=str(e)
        )
