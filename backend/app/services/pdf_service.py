import pypdf
from fastapi import UploadFile
from app.core.exceptions import PDFExtractionError, ValidationError
from app.core.logger import logger
import re

# Security limits
MAX_PDF_PAGES = 500
MAX_PAGE_SIZE_KB = 5000  # 5MB per page

def clean_text(text: str) -> str:
    """
    Cleans extracted PDF text by removing null bytes and other invalid characters.
    """
    # Remove null bytes
    text = text.replace('\x00', '')
    # Remove other control characters except newlines and tabs
    text = re.sub(r'[\x01-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', text)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def validate_pdf_security(pdf_reader: pypdf.PdfReader, file_size: int) -> None:
    """
    Validates PDF for security issues: page bombs, excessive size, encryption.
    
    Raises:
        ValidationError: If PDF fails security checks
    """
    # Check page count (PDF bomb protection)
    num_pages = len(pdf_reader.pages)
    if num_pages > MAX_PDF_PAGES:
        logger.warning(f"PDF has too many pages: {num_pages}")
        raise ValidationError(
            f"PDF has too many pages ({num_pages}). Maximum allowed: {MAX_PDF_PAGES}"
        )
    
    # Check average page size (detect compression bombs)
    avg_page_size = file_size / num_pages if num_pages > 0 else 0
    if avg_page_size > MAX_PAGE_SIZE_KB * 1024:
        logger.warning(f"PDF has suspicious page size: {avg_page_size/1024:.2f}KB per page")
        raise ValidationError(
            "PDF file has unusually large pages. This may be a malicious file."
        )
    
    # Check encryption
    if pdf_reader.is_encrypted:
        logger.warning("Encrypted PDF upload attempted")
        raise ValidationError("Encrypted PDFs are not supported")
    
    logger.debug(f"PDF security validation passed: {num_pages} pages, {file_size/1024:.2f}KB")

async def extract_text_from_pdf(file: UploadFile, file_size: int = 0) -> list[str]:
    """
    Reads the PDF and returns each page as an element of the list.
    Example: ['Page 1 text', 'Page 2 text']
    
    Args:
        file: Uploaded PDF file
        file_size: File size in bytes (for security validation)
    """
    try:
        pdf_reader = pypdf.PdfReader(file.file)
        
        if len(pdf_reader.pages) == 0:
            raise PDFExtractionError("PDF file has no pages")
        
        # Security validation
        validate_pdf_security(pdf_reader, file_size)
        
        slides_text = []
        
        for i, page in enumerate(pdf_reader.pages, 1):
            try:
                text = page.extract_text() or "" # if no text, return empty string
                cleaned_text = clean_text(text)
                slides_text.append(cleaned_text)
                logger.debug(f"Extracted page {i}/{len(pdf_reader.pages)}")
            except Exception as e:
                logger.warning(f"Failed to extract page {i}: {str(e)}")
                slides_text.append("")  # Add empty string for failed pages
            
        return slides_text

    except pypdf.errors.PdfReadError as e:
        logger.error(f"PDF Read Error: {str(e)}")
        raise PDFExtractionError(
            message="Failed to read PDF file",
            details="The PDF file may be corrupted, encrypted, or in an unsupported format"
        )
    except Exception as e:
        logger.error(f"Unexpected PDF extraction error: {str(e)}", exc_info=True)
        raise PDFExtractionError(
            message="Failed to extract text from PDF",
            details=str(e)
        )