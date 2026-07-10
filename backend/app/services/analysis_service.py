"""
AI-based presentation quality scoring, backing the `/presentations/{id}/analyze`
endpoint. Stateless like ideas_service — generated on demand, not persisted.
"""
import json

from app.core.openai_client import get_openai_client as get_client
from app.schemas.analysis import PresentationAnalysisResponse

# Per-slide text is capped to bound prompt size/cost on large presentations.
MAX_SLIDE_CHARS = 600

SYSTEM_PROMPT = """You are an expert presentation coach and design critic, evaluating a presentation's slide content.

You cannot see the actual visual design, so infer visual balance from text density (bullet count and length per slide) rather than colors or images.

Score each of the following 0-100:
- overall_score: overall quality of the presentation
- readability_score: clarity and conciseness of the text on each slide
- structure_score: logical flow and progression between slides
- visual_balance_score: estimated text density balance across slides (penalize overcrowded or near-empty slides)

Also write:
- summary: a 2-3 sentence overall assessment
- slide_feedback: for every slide, exactly one concrete strength and one concrete, actionable improvement

Return ONLY a valid JSON object in this exact format:
{
  "overall_score": 0,
  "readability_score": 0,
  "structure_score": 0,
  "visual_balance_score": 0,
  "summary": "...",
  "slide_feedback": [
    {"page_number": 1, "strength": "...", "improvement": "..."},
    ...
  ]
}

Rules:
- Include one slide_feedback entry per slide provided, in the same order
- Write ALL text (summary, strength, improvement) in the specified output language
- Be specific to this presentation's actual content, not generic advice
- Do NOT include markdown, explanations, or anything outside the JSON"""


async def analyze_presentation(
    title: str,
    slides: list[dict],
    language: str,
) -> PresentationAnalysisResponse:
    language_name = "Turkish" if language == "tr" else "English"
    slides_text = "\n\n".join(
        f"[Slide {s['page_number']}]: {s['content_text'][:MAX_SLIDE_CHARS]}"
        for s in slides
    )
    user_prompt = (
        f"Presentation title: {title}\n"
        f"Number of slides: {len(slides)}\n"
        f"Output language: {language_name}\n\n"
        f"Slide contents:\n{slides_text}"
    )

    client = get_client()
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.4,
        max_tokens=2500,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)
    return PresentationAnalysisResponse(**data)
