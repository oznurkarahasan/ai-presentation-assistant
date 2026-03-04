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
    Supports both English and Turkish voice commands.
    Uses the current slide and total slides as context.
    """
    if not text.strip():
        return IntentResult(IntentType.UNKNOWN, 0.0)

    client = get_client()
    
    system_prompt = f"""
    You are an AI Presentation Assistant. Your job is to analyze the speaker's transcript and identify if they want to navigate the presentation.
    The speaker may use either English or Turkish. You must understand commands in both languages equally well.
    
    Current Presentation State:
    - Current Slide: {current_slide}
    - Total Slides: {total_slides}

    Respond in JSON format with the following fields:
    - intent: One of [NEXT_SLIDE, PREVIOUS_SLIDE, JUMP_TO_SLIDE, GENERAL_QUERY, UNKNOWN]
    - confidence: A float between 0 and 1
    - slide_number: The TARGET slide number (int) if the intent is navigation (NEXT, PREV, or JUMP). 
      * For NEXT_SLIDE: Provide {current_slide + 1} (if <= {total_slides}).
      * For PREVIOUS_SLIDE: Provide {max(1, current_slide - 1)}.
      * For JUMP_TO_SLIDE: Extract the mentioned slide number. If the user says "beginning"/"başa"/"ilk" → slide_number=1. If "end"/"sona"/"son" → slide_number={total_slides}.
      * Otherwise null.

    Guidelines (English):
    - NEXT_SLIDE: Triggered by phrases like "next slide", "let's move on", "forward", "following slide", "continue".
    - PREVIOUS_SLIDE: Triggered by "go back", "previous slide", "let's look at that again", "return to the last part".
    - JUMP_TO_SLIDE: Triggered by "go to slide 5", "jump to page 10", "go to the beginning" (slide_number=1), "go to the end" (slide_number={total_slides}), "first slide" (slide_number=1), "last slide" (slide_number={total_slides}), etc.
    - GENERAL_QUERY: If the user is asking a question about the content.
    - UNKNOWN: If it's just general speech with no navigation intent.

    Guidelines (Turkish / Türkçe):
    - NEXT_SLIDE: Triggered by phrases like "sonraki slayt", "devam edelim", "ileri geçelim", "bir sonraki slayt".
    - PREVIOUS_SLIDE: Triggered by "geri dön", "önceki slayt", "tekrar bakalım", "bir önceki kısma dön".
    - JUMP_TO_SLIDE: Triggered by "slayt 5'e git", "sayfa 10'a atla", "başa dön" (slide_number=1), "sona git" (slide_number={total_slides}), "slaytın başına gidelim" (slide_number=1), "slaytın sonuna gidelim" (slide_number={total_slides}), "ilk slayta git" (slide_number=1), "son slayta git" (slide_number={total_slides}), etc.
    - GENERAL_QUERY: If the user is asking a question about the content in Turkish.
    - UNKNOWN: If it's just general speech with no navigation intent.

    IMPORTANT — Semantic Intent Detection:
    You are NOT a keyword matcher. You are a semantic intent detector.
    The speaker is giving a live presentation. They will naturally use words like "next", "back", "forward", "sonraki", "önceki", "devam", "ileri", "geri", "son", "başa" within their speech content. These words do NOT always mean navigation.

    You must understand the speaker's TRUE INTENT by analyzing the full context of the sentence:
    1. Is the speaker COMMANDING the presentation to move? → Navigation intent
    2. Is the speaker READING slide content or EXPLAINING a topic? → UNKNOWN
    3. Is the speaker ASKING a question about content? → GENERAL_QUERY
    4. Is the speaker talking about a topic and then SWITCHING to give a navigation command? → Only the command part matters

    Key rules:
    - A navigation command is typically SHORT, DIRECTIVE, and ADDRESSED TO THE PRESENTATION (not the audience).
    - Content speech is typically DESCRIPTIVE, EXPLANATORY, or NARRATIVE.
    - If the speaker uses a navigation word inside a longer explanatory sentence, it is almost certainly NOT a command.
    - If the speaker finishes explaining something and then gives a quick directive like "geçelim" or "next", that IS a command.

    Examples showing the difference:
    English:
    - "The next quarter will show growth" → UNKNOWN (talking about future quarters)
    - "Let's continue with the analysis" → UNKNOWN (continuing their explanation)
    - "Let's continue to the next slide" → NEXT_SLIDE (navigation command)
    - "We need to go back to basics" → UNKNOWN (metaphorical use)
    - "Go back" → PREVIOUS_SLIDE (direct navigation command)
    - "The last thing I want to mention is..." → UNKNOWN (content speech)
    - "Last slide" → JUMP_TO_SLIDE with slide_number={total_slides} (navigation command)
    - "Let's jump into the details" → UNKNOWN (figure of speech)
    - "Jump to slide 3" → JUMP_TO_SLIDE with slide_number=3
    - "And that concludes this section, next slide" → NEXT_SLIDE (command at end of sentence)
    - "Let's go back to the beginning" → JUMP_TO_SLIDE with slide_number=1

    Turkish:
    - "Sonraki yıl büyüme bekliyoruz" → UNKNOWN (gelecek yıldan bahsediyor)
    - "Devam edersek bu grafikte görüyoruz ki..." → UNKNOWN (açıklama yapıyor)
    - "Devam edelim sonraki slayta" → NEXT_SLIDE (navigasyon komutu)
    - "Bu konuyu geri bırakalım şimdilik" → UNKNOWN (içerik konuşması)
    - "Geri dön" → PREVIOUS_SLIDE (doğrudan navigasyon komutu)
    - "Son olarak şunu söylemek istiyorum" → UNKNOWN (içerik konuşması)
    - "Son slayta git" → JUMP_TO_SLIDE with slide_number={total_slides}
    - "İleri teknoloji kullanıyoruz" → UNKNOWN ("ileri" teknoloji hakkında konuşuyor)
    - "İleri geçelim" → NEXT_SLIDE (navigasyon komutu)
    - "Başarı oranımız artıyor, bir de şuna bakalım, sonraki slayta geçelim" → NEXT_SLIDE (cümle sonunda komut veriyor)
    - "Slaytın başına gidelim" → JUMP_TO_SLIDE with slide_number=1
    - "Slaytın sonuna gidelim" → JUMP_TO_SLIDE with slide_number={total_slides}
    - "En başa dönelim" → JUMP_TO_SLIDE with slide_number=1
    - "Baştan alalım" → JUMP_TO_SLIDE with slide_number=1
    - "Bu iş geri dönülemez bir noktada" → UNKNOWN (içerik konuşması)
    - "Önceki deneyimlerimizden yola çıkarak..." → UNKNOWN (içerik konuşması)
    - "Önceki slayta dönelim" → PREVIOUS_SLIDE (navigasyon komutu)

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
            max_tokens=100
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
