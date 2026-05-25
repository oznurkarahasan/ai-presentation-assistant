from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from openai import AsyncOpenAI

from app.api.v1 import auth
from app.core.config import settings
from app.core.logger import logger

router = APIRouter()

_client: Optional[AsyncOpenAI] = None

def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


class TopicIdeasRequest(BaseModel):
    context: str = Field(..., min_length=2, max_length=300)
    audience: str = Field(..., min_length=2, max_length=200)
    purpose: str = Field(..., min_length=2, max_length=200)
    num_ideas: int = Field(default=5, ge=1, le=10)
    language: str = Field(default="en", max_length=10)


class TopicIdea(BaseModel):
    title: str
    description: str
    angle: str


class TopicIdeasResponse(BaseModel):
    ideas: list[TopicIdea]


class ChatMessageItem(BaseModel):
    role: str
    content: str


class TopicChatRequest(BaseModel):
    topic: TopicIdea
    messages: list[ChatMessageItem] = Field(default_factory=list)
    context: str = ""
    audience: str = ""
    purpose: str = ""
    language: str = "en"


class TopicChatResponse(BaseModel):
    message: str


CHAT_SYSTEM_PROMPT = """You are a presentation coach helping a speaker develop and refine their chosen topic.

Topic: {title}
Description: {description}
Unique angle: {angle}
Speaker's field: {context}
Target audience: {audience}
Purpose: {purpose}
Response language: {language_name}

Your role:
- Help structure the presentation (outline, sections, flow)
- Suggest talking points, hooks, opening lines, and stories
- Answer questions about the topic clearly and practically
- Provide concise, actionable advice

Always respond in the specified response language.
Keep responses under 150 words unless the user asks for more detail. Be direct and encouraging."""


SYSTEM_PROMPT = """You are a presentation strategist helping speakers craft compelling, distinct presentation topics.

Given the speaker's field/expertise, target audience, purpose, and output language, generate unique and actionable presentation topic ideas.

Each idea must have:
- title: A concise, attention-grabbing presentation title (max 12 words)
- description: A 1-2 sentence explanation of what the presentation covers (max 50 words)
- angle: The unique angle or hook that makes this topic stand out (max 20 words)

Return ONLY a valid JSON object in this exact format:
{
  "ideas": [
    {"title": "...", "description": "...", "angle": "..."},
    ...
  ]
}

Rules:
- Make each idea distinct — no overlap in angle or theme
- Keep titles punchy and memorable
- Descriptions should be practical and audience-focused
- Angles should highlight what makes the topic fresh or unexpected
- Write ALL text (title, description, angle) in the specified output language
- Do NOT include markdown, explanations, or anything outside the JSON"""


@router.post("/topics", response_model=TopicIdeasResponse)
async def generate_topic_ideas(
    request: TopicIdeasRequest,
    current_user=Depends(auth.get_current_user),
):
    language_name = "Turkish" if request.language == "tr" else "English"
    user_prompt = (
        f"Field / Expertise: {request.context}\n"
        f"Target Audience: {request.audience}\n"
        f"Purpose: {request.purpose}\n"
        f"Number of ideas: {request.num_ideas}\n"
        f"Output language: {language_name}"
    )

    try:
        client = get_client()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.85,
            max_tokens=1200,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content or "{}"

        import json
        data = json.loads(raw)
        ideas = [TopicIdea(**item) for item in data.get("ideas", [])]

        return TopicIdeasResponse(ideas=ideas)

    except Exception as e:
        logger.error(f"Topic ideas generation failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate topic ideas. Please try again.")


@router.post("/topics/chat", response_model=TopicChatResponse)
async def chat_about_topic(
    request: TopicChatRequest,
    current_user=Depends(auth.get_current_user),
):
    language_name = "Turkish" if request.language == "tr" else "English"
    system_content = CHAT_SYSTEM_PROMPT.format(
        title=request.topic.title,
        description=request.topic.description,
        angle=request.topic.angle,
        context=request.context or "Not specified",
        audience=request.audience or "Not specified",
        purpose=request.purpose or "Not specified",
        language_name=language_name,
    )

    messages = [{"role": "system", "content": system_content}]
    for msg in request.messages[-20:]:
        if msg.role in ("user", "assistant"):
            messages.append({"role": msg.role, "content": msg.content})

    try:
        client = get_client()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=400,
        )

        reply = response.choices[0].message.content or ""
        return TopicChatResponse(message=reply)

    except Exception as e:
        logger.error(f"Topic chat failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to process chat message. Please try again.")
