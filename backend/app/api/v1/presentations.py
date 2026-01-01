from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.v1 import auth
from app.core.database import AsyncSessionLocal
from app.services import pdf_service, embedding_service, vector_db
import os
import shutil

router = APIRouter()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_presentation(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Sadece PDF dosyaları kabul edilir.")

    upload_dir = "uploaded_files"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = f"{upload_dir}/{current_user.id}_{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    file.file.seek(0)

    try:
        slide_texts = await pdf_service.extract_text_from_pdf(file)
        
        embeddings = []
        for text in slide_texts:
            vector = await embedding_service.create_embedding(text)
            embeddings.append(vector)
            
        new_presentation = await vector_db.save_presentation_with_slides(
            db=db,
            user_id=current_user.id,
            title=file.filename,
            file_path=file_path,
            slide_texts=slide_texts,
            embeddings=embeddings
        )
        
        return {
            "id": new_presentation.id,
            "title": new_presentation.title,
            "pages": len(slide_texts),
            "status": "success"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))