from typing import Optional
import re

from openai import AsyncOpenAI, OpenAIError
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.logger import logger
from app.schemas.presentation_generation import PresentationGenerateRequest, PresentationState

_client: Optional[AsyncOpenAI] = None

# Curated Unsplash image database with category keywords for auto-matching
UNSPLASH_IMAGE_DATABASE = [
    {
        "url": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80",
        "alt": "Silicon microchip with glowing gold elements",
        "keywords": ["technology", "chip", "microchip", "circuit", "hardware", "semiconductor", "tech", "digital", "electronic", "processor", "cpu", "computer", "engineering"],
    },
    {
        "url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
        "alt": "Digital binary matrix computer code on screen",
        "keywords": ["code", "programming", "data", "binary", "matrix", "software", "developer", "cyber", "hacking", "database", "algorithm", "machine learning"],
    },
    {
        "url": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80",
        "alt": "Robotic hand gesturing in front of holographic UI",
        "keywords": ["robot", "ai", "artificial intelligence", "automation", "future", "machine", "robotic", "innovation", "tech", "hologram", "futuristic"],
    },
    {
        "url": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80",
        "alt": "Modern workspace setup with laptop and graphs",
        "keywords": ["business", "office", "work", "laptop", "professional", "meeting", "corporate", "strategy", "planning", "management", "productivity", "workspace"],
    },
    {
        "url": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
        "alt": "Financial analytics on laptop screen with warm lighting",
        "keywords": ["analytics", "finance", "chart", "graph", "data", "business", "statistics", "dashboard", "metrics", "kpi", "report", "analysis", "growth"],
    },
    {
        "url": "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80",
        "alt": "Team members collaborating in a creative office",
        "keywords": ["team", "collaboration", "people", "meeting", "group", "office", "colleagues", "teamwork", "brainstorm", "culture", "startup", "organization"],
    },
    {
        "url": "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80",
        "alt": "Minimalist designer workstation with UI design wireframes",
        "keywords": ["design", "ui", "ux", "wireframe", "creative", "art", "graphic", "prototype", "interface", "product", "visual", "layout"],
    },
    {
        "url": "https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&auto=format&fit=crop&q=80",
        "alt": "Design wireframes layout sketched on paper",
        "keywords": ["wireframe", "sketch", "design", "prototype", "ux", "planning", "creative", "brainstorm", "idea", "concept", "draft"],
    },
    {
        "url": "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=80",
        "alt": "Abstract glowing node mesh network representing artificial intelligence",
        "keywords": ["ai", "network", "neural", "connection", "abstract", "technology", "nodes", "mesh", "pattern", "intelligence", "deep learning", "model"],
    },
    {
        "url": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format&fit=crop&q=80",
        "alt": "Futuristic abstract digital model of human neural connection",
        "keywords": ["brain", "neural", "mind", "cognitive", "future", "human", "intelligence", "thought", "psychology", "learning", "abstract", "digital"],
    },
    {
        "url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
        "alt": "Fluid gradient 3D rendering with neon orange and cyan hues",
        "keywords": ["abstract", "gradient", "color", "art", "creative", "design", "background", "visual", "modern", "aesthetic", "render", "3d"],
    },
    {
        "url": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80",
        "alt": "Presenter gesturing in front of screen in workshop session",
        "keywords": ["presentation", "speaker", "conference", "audience", "speech", "workshop", "training", "educator", "stage", "seminar", "talk", "lecture"],
    },
    {
        "url": "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80",
        "alt": "Stage microphone ready for public speaking event",
        "keywords": ["microphone", "speech", "speaking", "stage", "voice", "broadcast", "podcast", "event", "public speaking", "performance", "communicate"],
    },
    {
        "url": "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&auto=format&fit=crop&q=80",
        "alt": "Bright digital display screen on stage in front of audience seats",
        "keywords": ["stage", "conference", "presentation", "screen", "audience", "event", "exhibition", "keynote", "display", "hall", "theater"],
    },
    {
        "url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
        "alt": "Data visualization dashboard with colorful charts",
        "keywords": ["dashboard", "data", "visualization", "chart", "metrics", "analytics", "report", "statistics", "kpi", "business intelligence", "monitoring"],
    },
    {
        "url": "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&auto=format&fit=crop&q=80",
        "alt": "Modern startup office with open workspace and natural light",
        "keywords": ["startup", "office", "modern", "workspace", "open", "company", "culture", "environment", "professional", "architecture"],
    },
    {
        "url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=80",
        "alt": "People in a business meeting discussing strategy with charts",
        "keywords": ["meeting", "strategy", "business", "discussion", "plan", "corporate", "boardroom", "management", "leadership", "decision"],
    },
    {
        "url": "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&auto=format&fit=crop&q=80",
        "alt": "Smartphone showing social media and mobile app interface",
        "keywords": ["mobile", "phone", "app", "social media", "digital", "smartphone", "technology", "platform", "user", "interface", "screen"],
    },
    {
        "url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
        "alt": "Portrait of confident professional person in business attire",
        "keywords": ["person", "professional", "leader", "people", "human", "portrait", "executive", "individual", "employee", "entrepreneur"],
    },
    {
        "url": "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&auto=format&fit=crop&q=80",
        "alt": "Global map network connections representing international business",
        "keywords": ["global", "world", "map", "international", "network", "connection", "globe", "geography", "market", "expansion", "reach"],
    },
    {
        "url": "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800&auto=format&fit=crop&q=80",
        "alt": "Stack of coins and financial growth chart upward trend",
        "keywords": ["money", "finance", "growth", "investment", "revenue", "profit", "economy", "coins", "budget", "funding", "roi", "success"],
    },
    {
        "url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80",
        "alt": "Person using laptop for online learning and education",
        "keywords": ["education", "learning", "online", "course", "student", "knowledge", "training", "skill", "university", "study", "book", "school"],
    },
    {
        "url": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80",
        "alt": "Clean modern office interior with glass walls and city view",
        "keywords": ["office", "building", "corporate", "architecture", "interior", "modern", "glass", "city", "headquarters", "real estate", "location"],
    },
    {
        "url": "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=800&auto=format&fit=crop&q=80",
        "alt": "Creative team brainstorming with sticky notes on whiteboard",
        "keywords": ["brainstorm", "creative", "idea", "team", "whiteboard", "sticky", "notes", "agile", "collaboration", "design thinking", "innovation", "process"],
    },
]


def resolve_image_url(prompt: str, alt: Optional[str] = None) -> str:
    """Find the best matching Unsplash image URL for a given image prompt using keyword scoring."""
    search_text = f"{prompt} {alt or ''}".lower()
    # Tokenize: split on spaces and non-alphanumeric chars
    tokens = set(re.split(r'[\s,.\-_/]+', search_text))
    tokens.discard('')

    best_score = -1
    best_url = UNSPLASH_IMAGE_DATABASE[0]["url"]

    for img in UNSPLASH_IMAGE_DATABASE:
        score = 0
        for keyword in img["keywords"]:
            kw_tokens = set(keyword.lower().split())
            # Full phrase match scores more
            if keyword.lower() in search_text:
                score += len(kw_tokens) * 2
            else:
                # Partial token match
                score += len(kw_tokens & tokens)
        if score > best_score:
            best_score = score
            best_url = img["url"]

    return best_url


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        logger.info("OpenAI client initialized for generation service")
    return _client


def _build_system_prompt() -> str:
    return """You are an expert presentation designer and communication strategist with 15+ years of experience creating high-impact presentations for Fortune 500 companies, TED talks, and startup pitches.

Your task: Generate a COMPLETE, PROFESSIONAL presentation as strict JSON matching the required schema.

## OUTPUT RULES
- Output ONLY valid JSON. Zero markdown. Zero explanations. Zero code blocks.
- Match schema exactly: { "metadata": {...}, "slides": [...] }

## SLIDE STRUCTURE RULES
- Every slide must serve a clear narrative purpose in the presentation flow.
- Use these content_type values:
  * "standard" — full-width text with bullet points (use for text-heavy content)
  * "left" — image on LEFT, text on RIGHT (use for intro/concept slides)
  * "right" — text on LEFT, image on RIGHT (use for feature/benefit slides)
  * "background" — large background image with text overlay (use for impact/CTA slides)
- For "standard": set image to null.
- For "left", "right", "background": ALWAYS provide a descriptive image object.

## CONTENT QUALITY RULES
- Slide titles: Short, punchy, action-oriented (max 8 words). Avoid generic titles like "Introduction" or "Overview".
- Bullet points (items): Each item must be a COMPLETE thought that adds value. Max 15 words each. 3-5 items per slide.
- Speaker notes: 2-4 sentences with delivery guidance, key emphasis points, and audience engagement tips.
- Create a logical narrative arc: Hook → Problem → Solution → Evidence → Implementation → Call to Action.

## IMAGE DESCRIPTION RULES
- Write image prompts in English regardless of presentation language.
- Be SPECIFIC and VISUAL: describe what to SEE, not concepts.
- Include: subject, mood, composition (e.g. "Close-up of a glowing circuit board with blue LED lights, dark background, dramatic lighting").
- Match image tone to slide content.

## COLOR & TYPOGRAPHY RULES
- primary_color: The dominant brand/accent color in HEX.
- accent_color: A complementary highlight color in HEX.
- Choose colors that reflect the presentation's tone (corporate = deep blues/navy; startup = vibrant oranges/purples; health = greens/teals).
- font_family: Choose ONE from: "Inter, sans-serif" | "Montserrat, sans-serif" | "Outfit, sans-serif" | "Playfair Display, serif" | "Space Grotesk, sans-serif"

## LANGUAGE RULE
CRITICAL: Generate ALL text content (titles, items, speaker_notes, metadata title) STRICTLY in the requested language. Only image.prompt must be in English."""


def _build_user_prompt(request: PresentationGenerateRequest) -> str:
    slide_instruction = ""
    if request.slide_count:
        slide_instruction = f"\nSlide count: EXACTLY {request.slide_count} slides."
    else:
        slide_instruction = "\nSlide count: Choose optimally between 6-12 slides based on topic complexity."

    type_instruction = ""
    if request.presentation_type:
        type_map = {
            "pitch_deck": "investor pitch deck with problem/solution/market/team/ask structure",
            "educational": "educational/training presentation with clear learning objectives and step-by-step explanations",
            "workshop": "interactive workshop with activities, exercises, and participant engagement",
            "product_demo": "product demonstration showing features, benefits, and use cases",
            "report": "business report with data, findings, and recommendations",
            "keynote": "inspiring keynote speech with storytelling and strong emotional arc",
            "marketing": "marketing/sales presentation focused on value proposition and conversion",
        }
        type_instruction = f"\nPresentation type: {type_map.get(request.presentation_type, request.presentation_type)}"

    tone_instruction = ""
    if request.tone:
        tone_map = {
            "professional": "formal and authoritative, data-driven, polished corporate language",
            "casual": "conversational and approachable, friendly tone, simple language",
            "inspiring": "motivational and energetic, emotional storytelling, call-to-action focus",
            "educational": "clear and instructive, pedagogical structure, accessible explanations",
            "creative": "bold and unconventional, visual storytelling, design-forward",
        }
        tone_instruction = f"\nTone: {tone_map.get(request.tone, request.tone)}"

    audience_instruction = ""
    if request.audience:
        audience_instruction = f"\nTarget audience: {request.audience}"

    return f"""Topic: {request.topic}
Language: {request.language} (ALL text content — titles, items, speaker_notes, metadata.title — must be in {request.language}){slide_instruction}{type_instruction}{tone_instruction}{audience_instruction}

Return this exact JSON structure:
{{
  "metadata": {{
    "title": "string (in {request.language})",
    "theme": "string (theme name)",
    "primary_color": "#hexcolor",
    "accent_color": "#hexcolor",
    "font_family": "string"
  }},
  "slides": [
    {{
      "id": "slide-1",
      "title": "string (in {request.language}, max 8 words)",
      "content_type": "standard|left|right|background",
      "items": ["string (in {request.language})", ...],
      "image": null or {{"prompt": "English visual description", "style": "modern", "alt": "English alt text"}},
      "speaker_note": "string (in {request.language}, 2-4 sentences)"
    }}
  ]
}}"""


async def generate_presentation_state(request: PresentationGenerateRequest) -> PresentationState:
    client = get_client()

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": _build_system_prompt()},
                {"role": "user", "content": _build_user_prompt(request)},
            ],
            temperature=0.6,
            max_tokens=6000,
            response_format={"type": "json_object"},
        )
    except OpenAIError as oai_exc:
        logger.error(f"OpenAI API error during generation: {oai_exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI generation service is temporarily unavailable"
        )

    raw = response.choices[0].message.content or "{}"

    try:
        state = PresentationState.model_validate_json(raw)
    except Exception as exc:
        logger.error(f"Presentation generation validation failed: {exc}")
        logger.debug(f"Raw failing JSON: {raw}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="AI generated an invalid presentation structure"
        )

    # Auto-resolve image URLs: match AI-generated image prompts to Unsplash images
    for slide in state.slides:
        if slide.image and not slide.image.url:
            slide.image.url = resolve_image_url(slide.image.prompt, slide.image.alt)

    return state
