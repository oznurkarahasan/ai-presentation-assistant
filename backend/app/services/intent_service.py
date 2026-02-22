from enum import Enum
from typing import Optional, Dict, Any
import json
from app.core.config import settings
from app.core.logger import logger
from openai import AsyncOpenAI

class IntentType(str, Enum):
    NEXT_SLIDE = "NEXT_SLIDE"
    PREVIOUS_SLIDE = "PREVIOUS_SLIDE"
    JUMP_TO_SLIDE = "JUMP_TO_SLIDE"
    GENERAL_QUERY = "GENERAL_QUERY"
    UNKNOWN = "UNKNOWN"

class IntentResult:
    def __init__(self, intent: IntentType, confidence: float, slide_number: Optional[int] = None, original_text: str = ""):
        self.intent = intent
        self.confidence = confidence
        self.slide_number = slide_number
        self.original_text = original_text

    def to_dict(self) -> Dict[str, Any]:
        return {
            "intent": self.intent.value,
            "confidence": self.confidence,
            "slide_number": self.slide_number,
            "original_text": self.original_text
        }

_client = None

def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client

async def analyze_intent(text: str, current_slide: int = 1, total_slides: int = 1) -> IntentResult:
    """
    Analyzes the user's speech transcript to detect presentation-related intents.
    Uses the current slide and total slides as context.
    """
    if not text.strip():
        return IntentResult(IntentType.UNKNOWN, 0.0)

    client = get_client()
    
    system_prompt = f"""
    You are an AI Presentation Assistant. Your job is to analyze the speaker's transcript and identify if they want to navigate the presentation.
    
    Current Presentation State:
    - Current Slide: {current_slide}
    - Total Slides: {total_slides}

    Respond in JSON format with the following fields:
    - intent: One of [NEXT_SLIDE, PREVIOUS_SLIDE, JUMP_TO_SLIDE, GENERAL_QUERY, UNKNOWN]
    - confidence: A float between 0 and 1
    - slide_number: The TARGET slide number (int) if the intent is navigation (NEXT, PREV, or JUMP). 
      * For NEXT_SLIDE: Provide {current_slide + 1} (if <= {total_slides}).
      * For PREVIOUS_SLIDE: Provide {max(1, current_slide - 1)}.
      * For JUMP_TO_SLIDE: Extract the mentioned slide number.
      * Otherwise null.

    Guidelines:
    - NEXT_SLIDE: Triggered by phrases like "next slide", "let's move on", "forward", "following slide".
    - PREVIOUS_SLIDE: Triggered by "go back", "previous slide", "let's look at that again", "return to the last part".
    - JUMP_TO_SLIDE: Triggered by "go to slide 5", "jump to page 10", etc.
    - GENERAL_QUERY: If the user is asking a question about the content.
    - UNKNOWN: If it's just general speech with no navigation intent.

    Only provide the JSON.
    """

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Transcript: {text}"}
            ],
            response_format={"type": "json_object"},
            temperature=0,
            max_tokens=60
        )
        
        result_content = response.choices[0].message.content
        logger.debug(f"Intent analysis raw response: {result_content}")
        result_data = json.loads(result_content)
        intent_str = result_data.get("intent", "UNKNOWN")
        confidence = result_data.get("confidence", 0.0)
        slide_number = result_data.get("slide_number")

        try:
            intent_type = IntentType(intent_str)
        except ValueError:
            intent_type = IntentType.UNKNOWN

        return IntentResult(
            intent=intent_type,
            confidence=confidence,
            slide_number=slide_number,
            original_text=text
        )

    except Exception as e:
        logger.error(f"Error in intent analysis: {str(e)}")
        return IntentResult(IntentType.UNKNOWN, 0.0, original_text=text)
