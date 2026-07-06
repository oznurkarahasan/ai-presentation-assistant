from fastapi import APIRouter, Depends, HTTPException

from app.api.v1 import auth
from app.core.logger import logger
from app.services import ideas_service
from app.schemas.ideas import TopicChatRequest, TopicChatResponse, TopicIdeasRequest, TopicIdeasResponse

router = APIRouter()


@router.post("/topics", response_model=TopicIdeasResponse)
async def generate_topic_ideas(
    request: TopicIdeasRequest,
    current_user=Depends(auth.get_current_user),
):
    try:
        return await ideas_service.generate_topic_ideas(request)
    except Exception as e:
        logger.error(f"Topic ideas generation failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate topic ideas. Please try again.")


@router.post("/topics/chat", response_model=TopicChatResponse)
async def chat_about_topic(
    request: TopicChatRequest,
    current_user=Depends(auth.get_current_user),
):
    try:
        return await ideas_service.chat_about_topic(request)
    except Exception as e:
        logger.error(f"Topic chat failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to process chat message. Please try again.")
