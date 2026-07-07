"""
Topic idea generation and follow-up chat, backing app/api/v1/ideas.py.

Previously this OpenAI call/prompt logic lived directly in the route module,
unlike every other feature (presentations -> generation_service, chat ->
rag_service), which made it harder to test or reuse independently of FastAPI.
"""
import json

from app.core.openai_client import get_openai_client as get_client
from app.schemas.ideas import TopicChatRequest, TopicChatResponse, TopicIdea, TopicIdeasRequest, TopicIdeasResponse

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


async def generate_topic_ideas(request: TopicIdeasRequest) -> TopicIdeasResponse:
    language_name = "Turkish" if request.language == "tr" else "English"
    user_prompt = (
        f"Field / Expertise: {request.context}\n"
        f"Target Audience: {request.audience}\n"
        f"Purpose: {request.purpose}\n"
        f"Number of ideas: {request.num_ideas}\n"
        f"Output language: {language_name}"
    )

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
    data = json.loads(raw)
    ideas = [TopicIdea(**item) for item in data.get("ideas", [])]

    return TopicIdeasResponse(ideas=ideas)


async def chat_about_topic(request: TopicChatRequest) -> TopicChatResponse:
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

    client = get_client()
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7,
        max_tokens=400,
    )

    reply = response.choices[0].message.content or ""
    return TopicChatResponse(message=reply)
