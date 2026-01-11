import pypdf
from fastapi import UploadFile, HTTPException
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
        slides_text = []
        
        for page in pdf_reader.pages:
            text = page.extract_text() or "" # if no text, return empty string
            cleaned_text = clean_text(text)
            slides_text.append(cleaned_text)
            
        return slides_text

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF okuma hatası: {str(e)}")