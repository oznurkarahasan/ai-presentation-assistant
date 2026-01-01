import pypdf
from fastapi import UploadFile, HTTPException

async def extract_text_from_pdf(file: UploadFile) -> list[str]:
    """
    Reads the PDF and returns each page as an element of the list.
    Example: [‘Page 1 text’, ‘Page 2 text’]
    """
    try:
        pdf_reader = pypdf.PdfReader(file.file)
        slides_text = []
        
        for page in pdf_reader.pages:
            text = page.extract_text() or "" # if no text, return empty string
            slides_text.append(text.strip())
            
        return slides_text

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF okuma hatası: {str(e)}")