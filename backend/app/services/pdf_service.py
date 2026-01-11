import pypdf
from fastapi import UploadFile
from app.core.exceptions import PDFExtractionError
from app.core.logger import logger
import re

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

async def extract_text_from_pdf(file: UploadFile) -> list[str]:
    """
    Reads the PDF and returns each page as an element of the list.
    Example: ['Page 1 text', 'Page 2 text']
    """
    try:
        pdf_reader = pypdf.PdfReader(file.file)
        
        if len(pdf_reader.pages) == 0:
            raise PDFExtractionError("PDF file has no pages")
        
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