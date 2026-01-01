from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.api.v1 import auth
from app.core.database import AsyncSessionLocal
from app.services import rag_service
from app.models.presentation import Presentation

router = APIRouter()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str
    sources: list[int]

@router.post("/{presentation_id}", response_model=ChatResponse)
async def ask_presentation(
    presentation_id: int,
    chat_request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    """
    Ask a question about a specific presentation.
    The AI will automatically detect the language of the question and respond in the same language.
    """
    stmt = select(Presentation).where(
        Presentation.id == presentation_id,
        Presentation.user_id == current_user.id
    )
    result = await db.execute(stmt)
    presentation = result.scalar_one_or_none()

    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found.")

    try:
        # Parametre sayısı azaldı
        response = await rag_service.ask_question(
            db=db, 
            presentation_id=presentation_id, 
            question=chat_request.question
        )
        return response

    except Exception as e:
        print(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail="Response generation failed.")