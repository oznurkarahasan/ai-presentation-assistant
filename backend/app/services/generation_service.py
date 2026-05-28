from typing import Optional
import json

from openai import AsyncOpenAI, OpenAIError  # Added to handle OpenAI errors.
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.logger import logger
from app.schemas.presentation_generation import PresentationGenerateRequest, PresentationState

_client: Optional[AsyncOpenAI] = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        # Optionally validate settings.OPENAI_API_KEY before client init.
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        logger.info("OpenAI client initialized for generation service")
    return _client


SYSTEM_PROMPT = """You are a senior presentation designer and strategist.

Generate a structured presentation plan as strict JSON that matches the required schema.

Rules:
- Output only JSON. No markdown, no explanations.
- The JSON must match the schema exactly: metadata + slides.
- Determine the optimum slide count automatically based on the complexity of the topic (usually between 5 to 12 slides). Do not overextend or make it too short.
- Keep slide titles concise and action-oriented.
- Use content_type values from this set: standard, left, right, background.
  * standard: standard text-only layout with bullet points. Set image to null.
  * left: slide with an image on the left side. Provide a descriptive image object.
  * right: slide with an image on the right side. Provide a descriptive image object.
  * background: slide with a background image. Provide a descriptive image object.
- items must be an array of short strings (max 12 words each).
- speaker_note should be 1-3 concise sentences for delivery guidance.
- Provide a cohesive color palette and a legible font_family.
- CRITICAL: You must generate all natural text content (titles, items, speaker_notes) STRICTLY in the language requested by the user. Do not mix languages.
"""


async def generate_presentation_state(request: PresentationGenerateRequest) -> PresentationState:
    # User prompt optimized to reinforce the requested language.
    user_prompt = (
        f"Topic: {request.topic}\n"
        f"Language: {request.language} (ALL text content must be in this language!)\n"
        f"Theme: {request.theme or 'Auto'}\n\n"
        "Return JSON structure:\n"
        "metadata: {title, theme, primary_color, accent_color, font_family}\n"
        "slides: [ {id, title, content_type, items, image, speaker_note} ]\n"
        "image can be null (especially when content_type is 'standard') or an object with keys: {prompt, style, alt}."
    )

    client = get_client()
    
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=2500,  # Increased to avoid truncation with higher slide counts.
            response_format={"type": "json_object"},
        )
    except OpenAIError as oai_exc:
        # Handle OpenAI-originated errors (timeout, rate limit, auth).
        logger.error(f"OpenAI API error during generation: {oai_exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI generation service is temporarily unavailable"
        )

    raw = response.choices[0].message.content or "{}"
    
    try:
        # Pydantic v2 validation and parsing.
        return PresentationState.model_validate_json(raw)
    except Exception as exc:
        logger.error(f"Presentation generation validation failed: {exc}")
        logger.debug(f"Raw failing JSON: {raw}")  # Log invalid JSON for troubleshooting.
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="AI generated an invalid presentation structure"
        )