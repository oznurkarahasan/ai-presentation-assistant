"""
Slide Matcher Service — Intelligent slide transition engine.

This service determines WHEN to change slides during a live presentation
by analyzing the speaker's transcript against slide content.

Three-layer matching strategy (fastest → most accurate):
    Layer 1: Keyword Match — instant, checks extracted keywords
    Layer 2: Transition Phrase — fast, checks pre-computed phrases
    Layer 3: Semantic Similarity — accurate, uses embedding cosine distance

Architecture:
    - At UPLOAD time: extract keywords + transition phrases per slide
      (one-time cost, stored alongside slide data)
    - At RUNTIME: match incoming transcript against current/next slides
      (low latency, mostly in-memory comparisons)

Dependencies:
    - embedding_service.py (existing) — for semantic similarity
    - OpenAI GPT-4o-mini (existing) — for keyword/phrase extraction
    - Slide model (existing) — content_text + embedding fields
"""

import re
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from app.core.logger import logger
from app.core.exceptions import AppBaseException
from app.core.exceptions import SlideMatchError

# Custom Exception

class SlideMatchError(AppBaseException):
    """Raised when slide matching fails"""
    pass


# Data Models

class MatchType(str, Enum):
    """How the slide transition was triggered."""
    KEYWORD = "keyword"
    TRANSITION_PHRASE = "transition_phrase"
    SEMANTIC = "semantic"
    VOICE_COMMAND = "voice_command"
    MANUAL = "manual"
    NONE = "none"


@dataclass
class SlideMatchResult:
    """Result of matching transcript against slides."""
    should_advance: bool
    match_type: MatchType
    confidence: float  # 0.0 - 1.0
    target_slide: int  # page_number to go to
    current_slide: int
    matched_keywords: list[str] = field(default_factory=list)
    debug_info: str = ""

    def to_dict(self) -> dict:
        return {
            "should_advance": self.should_advance,
            "match_type": self.match_type.value,
            "confidence": round(self.confidence, 3),
            "target_slide": self.target_slide,
            "current_slide": self.current_slide,
            "matched_keywords": self.matched_keywords,
        }


@dataclass
class SlideContext:
    """
    Pre-computed context for a single slide.
    Generated at upload time, used at runtime for fast matching.
    """
    page_number: int
    content_text: str
    keywords: list[str] = field(default_factory=list)
    transition_phrases: list[str] = field(default_factory=list)
    embedding: Optional[list[float]] = None

    def to_dict(self) -> dict:
        return {
            "page_number": self.page_number,
            "keywords": self.keywords,
            "transition_phrases": self.transition_phrases,
        }


@dataclass
class PresentationContext:
    """
    Runtime context for an entire presentation.
    Loaded once when live session starts, kept in memory.
    """
    presentation_id: int
    slides: list[SlideContext] = field(default_factory=list)
    current_slide_index: int = 0  # 0-based index

    @property
    def current_slide(self) -> Optional[SlideContext]:
        if 0 <= self.current_slide_index < len(self.slides):
            return self.slides[self.current_slide_index]
        return None

    @property
    def next_slide(self) -> Optional[SlideContext]:
        next_idx = self.current_slide_index + 1
        if next_idx < len(self.slides):
            return self.slides[next_idx]
        return None

    @property
    def is_last_slide(self) -> bool:
        return self.current_slide_index >= len(self.slides) - 1

    def get_lookahead_slides(self, count: int = 2) -> list[SlideContext]:
        """Get next N slides for matching."""
        start = self.current_slide_index + 1
        end = min(start + count, len(self.slides))
        return self.slides[start:end]

    def advance_to(self, page_number: int) -> bool:
        """Move to a specific slide by page_number."""
        for i, slide in enumerate(self.slides):
            if slide.page_number == page_number:
                self.current_slide_index = i
                return True
        return False

    def advance_next(self) -> bool:
        """Move to the next slide."""
        if not self.is_last_slide:
            self.current_slide_index += 1
            return True
        return False

    def go_previous(self) -> bool:
        """Move to the previous slide."""
        if self.current_slide_index > 0:
            self.current_slide_index -= 1
            return True
        return False


# Voice Commands (Layer 0 — fastest)

# Multi-language voice commands for slide navigation
VOICE_COMMANDS = {
    "next": [
        # Turkish
        "sonraki slayt", "sonraki sayfa", "ileri",
        "sonrakine geç", "devam et", "devam",
        "bir sonraki", "ilerle", "geç",
        # English
        "next slide", "next page", "go forward",
        "move on", "continue", "next one", "advance",
    ],
    "previous": [
        # Turkish
        "önceki slayt", "önceki sayfa", "geri",
        "bir önceki", "geri dön", "geri git",
        # English
        "previous slide", "previous page", "go back",
        "go backward", "back one",
    ],
    "first": [
        "ilk slayt", "başa dön", "en başa",
        "first slide", "go to start", "beginning",
    ],
    "last": [
        "son slayt", "sona git", "en sona",
        "last slide", "go to end",
    ],
}


def detect_voice_command(transcript: str) -> Optional[str]:
    """
    Check if transcript contains a voice command.
    Returns command type or None.

    This is the FASTEST check — simple string matching.
    Should be called BEFORE any other matching layer.
    """
    text = transcript.strip().lower()

    # Short text is more likely to be a command
    # Long text is more likely natural speech
    if len(text) > 100:
        return None

    for command_type, phrases in VOICE_COMMANDS.items():
        for phrase in phrases:
            if phrase in text:
                return command_type

    return None


# Layer 1: Keyword Extraction (Upload-time)

def extract_keywords_from_text(text: str, max_keywords: int = 15) -> list[str]:
    """
    Extract important keywords from slide text using TF-based approach.
    No API call needed — runs locally, fast.

    Strategy:
        - Tokenize and normalize
        - Remove stopwords (TR + EN)
        - Keep words that appear meaningful (length > 2, not pure numbers)
        - Score by length * frequency (longer, repeated words = more important)
        - Return top N keywords
    """
    if not text or not text.strip():
        return []

    # Normalize
    text_lower = text.lower()
    # Remove punctuation but keep Turkish chars
    text_clean = re.sub(r'[^\w\sçğıöşüâîûÇĞİÖŞÜ]', ' ', text_lower)
    words = text_clean.split()

    # Stopwords (Turkish + English, common presentation words)
    stopwords = {
        # Turkish
        "bir", "ve", "bu", "da", "de", "ile", "için", "gibi",
        "olan", "olarak", "daha", "en", "çok", "her", "ama",
        "ancak", "veya", "ya", "hem", "ne", "nasıl", "kadar",
        "sonra", "önce", "üzere", "göre", "ayrıca", "ise",
        "var", "yok", "olan", "oldu", "olur", "olmak",
        "den", "dan", "nin", "nın", "nun", "nün",
        "dir", "dır", "dur", "dür", "tir", "tır", "tur", "tür",
        # English
        "the", "and", "is", "in", "to", "of", "for", "a", "an",
        "that", "this", "with", "are", "was", "be", "has", "have",
        "it", "not", "on", "at", "by", "from", "or", "but", "as",
        "can", "will", "do", "if", "so", "we", "you", "they",
        "our", "your", "its", "all", "also", "more", "about",
        "how", "what", "when", "which", "who", "than", "then",
        # Common presentation filler
        "slide", "slayt", "sayfa", "page", "notes", "notlar",
    }

    # Count word frequencies (excluding stopwords and short words)
    word_freq: dict[str, int] = {}
    for w in words:
        if len(w) > 2 and w not in stopwords and not w.isdigit():
            word_freq[w] = word_freq.get(w, 0) + 1

    if not word_freq:
        return []

    # Score: frequency * log(length) — longer meaningful words score higher
    import math
    scored = [
        (word, freq * math.log2(max(len(word), 2)))
        for word, freq in word_freq.items()
    ]
    scored.sort(key=lambda x: x[1], reverse=True)

    return [word for word, _ in scored[:max_keywords]]


def generate_transition_phrases(
    current_text: str,
    next_text: str,
) -> list[str]:
    """
    Generate likely transition phrases between two consecutive slides.
    These are phrases a speaker might say when moving from one topic to another.

    No API call — rule-based generation from slide content.
    """
    phrases = []

    # Extract first meaningful sentence/topic from next slide
    next_keywords = extract_keywords_from_text(next_text, max_keywords=5)
    current_keywords = extract_keywords_from_text(current_text, max_keywords=5)

    if not next_keywords:
        return phrases

    # Build natural transition patterns using next slide's keywords
    primary_keyword = next_keywords[0]

    # Turkish transitions
    phrases.extend([
        f"şimdi {primary_keyword}",
        f"{primary_keyword} konusuna geçelim",
        f"{primary_keyword} hakkında",
        f"sıradaki konu {primary_keyword}",
        f"{primary_keyword} bakacak olursak",
        f"{primary_keyword} ele alalım",
    ])

    # English transitions
    phrases.extend([
        f"now let's talk about {primary_keyword}",
        f"moving on to {primary_keyword}",
        f"next topic is {primary_keyword}",
        f"let's look at {primary_keyword}",
        f"regarding {primary_keyword}",
    ])

    # Add secondary keyword combinations
    if len(next_keywords) >= 2:
        kw2 = next_keywords[1]
        phrases.extend([
            f"{primary_keyword} ve {kw2}",
            f"{primary_keyword} and {kw2}",
        ])

    return phrases


# Layer 1: Keyword Matching (Runtime)

def match_keywords(
    transcript: str,
    slide_keywords: list[str],
    threshold: int = 3,
) -> tuple[float, list[str]]:
    """
    Check how many of the slide's keywords appear in the transcript.

    Args:
        transcript: Current speech transcript
        slide_keywords: Keywords for the target slide
        threshold: Minimum keyword matches to trigger

    Returns:
        (confidence_score, matched_keywords)
    """
    if not transcript or not slide_keywords:
        return 0.0, []

    text_lower = transcript.lower()
    matched = [kw for kw in slide_keywords if kw in text_lower]

    if len(matched) < threshold:
        return 0.0, matched

    # Confidence: ratio of matched keywords, capped at 1.0
    confidence = min(len(matched) / max(len(slide_keywords), 1), 1.0)

    return confidence, matched


# Layer 2: Transition Phrase Matching (Runtime)

def match_transition_phrases(
    transcript: str,
    transition_phrases: list[str],
) -> tuple[float, str]:
    """
    Check if any transition phrase appears in the transcript.

    Returns:
        (confidence_score, matched_phrase)
    """
    if not transcript or not transition_phrases:
        return 0.0, ""

    text_lower = transcript.lower()

    for phrase in transition_phrases:
        if phrase.lower() in text_lower:
            # Full phrase match is high confidence
            return 0.85, phrase

    # Partial match: check if most words of any phrase are present
    best_score = 0.0
    best_phrase = ""

    for phrase in transition_phrases:
        phrase_words = set(phrase.lower().split())
        if len(phrase_words) < 2:
            continue
        matched_words = sum(1 for w in phrase_words if w in text_lower)
        ratio = matched_words / len(phrase_words)

        if ratio > 0.6 and ratio > best_score:
            best_score = ratio * 0.7  # Partial match gets lower confidence
            best_phrase = phrase

    return best_score, best_phrase


# Layer 3: Semantic Similarity (Runtime)

def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """
    Compute cosine similarity between two vectors.
    Pure Python — no numpy dependency needed.
    """
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    magnitude_a = sum(a * a for a in vec_a) ** 0.5
    magnitude_b = sum(b * b for b in vec_b) ** 0.5

    if magnitude_a == 0 or magnitude_b == 0:
        return 0.0

    return dot_product / (magnitude_a * magnitude_b)


async def compute_semantic_similarity(
    transcript: str,
    slide_embedding: list[float],
) -> float:
    """
    Compute semantic similarity between transcript and slide.
    Uses existing embedding_service for transcript embedding.

    Args:
        transcript: Speaker's transcript text.
        slide_embedding: Pre-computed slide embedding (1536-dim).

    Returns:
        Cosine similarity score (0.0 - 1.0).
    """
    if not transcript.strip() or not slide_embedding:
        return 0.0

    try:
        from app.services.embedding_service import create_embedding

        transcript_embedding = await create_embedding(transcript)
        similarity = cosine_similarity(transcript_embedding, slide_embedding)
        return max(0.0, similarity)  # Clamp to non-negative

    except Exception as e:
        logger.error(f"Semantic similarity failed: {e}")
        return 0.0


# Main Matching Engine

# Configurable thresholds
KEYWORD_MATCH_THRESHOLD = 3          # Minimum keywords to match
KEYWORD_CONFIDENCE_THRESHOLD = 0.25  # Minimum keyword confidence
TRANSITION_CONFIDENCE_THRESHOLD = 0.5  # Minimum transition phrase confidence
SEMANTIC_CONFIDENCE_THRESHOLD = 0.72  # Minimum cosine similarity


async def match_transcript_to_slides(
    transcript: str,
    context: PresentationContext,
    use_semantic: bool = True,
) -> SlideMatchResult:
    """
    Main matching engine — determines if a slide transition should occur.

    Matching order (short-circuit on first confident match):
        0. Voice command → immediate action
        1. Keyword match on next slide(s) → fast, low-cost
        2. Transition phrase match → fast, medium confidence
        3. Semantic similarity → slower but most accurate

    Args:
        transcript: Latest speech transcript from STT.
        context: Current presentation context with slide data.
        use_semantic: Whether to use Layer 3 (costs an API call).

    Returns:
        SlideMatchResult with decision and confidence.
    """
    start_time = time.time()
    current_page = context.current_slide.page_number if context.current_slide else 1

    # ── Layer 0: Voice Command ──
    command = detect_voice_command(transcript)
    if command:
        target = current_page
        success = False

        if command == "next":
            target = current_page + 1
            success = not context.is_last_slide
        elif command == "previous":
            target = current_page - 1
            success = context.current_slide_index > 0
        elif command == "first":
            target = 1
            success = True
        elif command == "last":
            target = len(context.slides)
            success = True

        if success:
            logger.debug(
                f"Voice command '{command}' → slide {target} "
                f"({(time.time() - start_time)*1000:.1f}ms)"
            )
            return SlideMatchResult(
                should_advance=True,
                match_type=MatchType.VOICE_COMMAND,
                confidence=1.0,
                target_slide=target,
                current_slide=current_page,
                debug_info=f"voice_command={command}",
            )

    # Get lookahead slides (next 2-3)
    lookahead = context.get_lookahead_slides(count=3)

    if not lookahead:
        # We're on the last slide, nowhere to go
        return SlideMatchResult(
            should_advance=False,
            match_type=MatchType.NONE,
            confidence=0.0,
            target_slide=current_page,
            current_slide=current_page,
            debug_info="last_slide_reached",
        )

    # ── Layer 1: Keyword Match ──
    for slide in lookahead:
        kw_confidence, matched_kws = match_keywords(
            transcript, slide.keywords, threshold=KEYWORD_MATCH_THRESHOLD
        )
        if kw_confidence >= KEYWORD_CONFIDENCE_THRESHOLD:
            logger.debug(
                f"Keyword match → slide {slide.page_number}, "
                f"confidence={kw_confidence:.2f}, "
                f"keywords={matched_kws[:5]} "
                f"({(time.time() - start_time)*1000:.1f}ms)"
            )
            return SlideMatchResult(
                should_advance=True,
                match_type=MatchType.KEYWORD,
                confidence=kw_confidence,
                target_slide=slide.page_number,
                current_slide=current_page,
                matched_keywords=matched_kws,
                debug_info=f"matched {len(matched_kws)} keywords",
            )

    # ── Layer 2: Transition Phrase Match ──
    for slide in lookahead:
        tp_confidence, matched_phrase = match_transition_phrases(
            transcript, slide.transition_phrases
        )
        if tp_confidence >= TRANSITION_CONFIDENCE_THRESHOLD:
            logger.debug(
                f"Transition phrase match → slide {slide.page_number}, "
                f"confidence={tp_confidence:.2f}, "
                f"phrase='{matched_phrase}' "
                f"({(time.time() - start_time)*1000:.1f}ms)"
            )
            return SlideMatchResult(
                should_advance=True,
                match_type=MatchType.TRANSITION_PHRASE,
                confidence=tp_confidence,
                target_slide=slide.page_number,
                current_slide=current_page,
                debug_info=f"phrase='{matched_phrase}'",
            )

    # ── Layer 3: Semantic Similarity ──
    if use_semantic:
        best_semantic_score = 0.0
        best_semantic_slide = None

        for slide in lookahead:
            if slide.embedding:
                score = await compute_semantic_similarity(
                    transcript, slide.embedding
                )
                if score > best_semantic_score:
                    best_semantic_score = score
                    best_semantic_slide = slide

        if (
            best_semantic_slide
            and best_semantic_score >= SEMANTIC_CONFIDENCE_THRESHOLD
        ):
            logger.debug(
                f"Semantic match → slide {best_semantic_slide.page_number}, "
                f"similarity={best_semantic_score:.3f} "
                f"({(time.time() - start_time)*1000:.1f}ms)"
            )
            return SlideMatchResult(
                should_advance=True,
                match_type=MatchType.SEMANTIC,
                confidence=best_semantic_score,
                target_slide=best_semantic_slide.page_number,
                current_slide=current_page,
                debug_info=f"cosine={best_semantic_score:.3f}",
            )

    # No match found
    elapsed = (time.time() - start_time) * 1000
    logger.debug(f"No slide match ({elapsed:.1f}ms)")

    return SlideMatchResult(
        should_advance=False,
        match_type=MatchType.NONE,
        confidence=0.0,
        target_slide=current_page,
        current_slide=current_page,
    )


# Helper: Build PresentationContext from DB

async def build_presentation_context(
    presentation_id: int,
    slides_data: list[dict],
) -> PresentationContext:
    """
    Build a PresentationContext from database slide records.

    This should be called once when a live session starts.
    It pre-computes keywords and transition phrases for all slides.

    Args:
        presentation_id: The presentation ID.
        slides_data: List of dicts with keys:
            page_number, content_text, embedding

    Returns:
        PresentationContext ready for runtime matching.
    """
    slide_contexts = []

    for i, slide in enumerate(slides_data):
        keywords = extract_keywords_from_text(
            slide.get("content_text", ""),
            max_keywords=15,
        )

        # Transition phrases need current + next slide text
        transition_phrases = []
        if i < len(slides_data) - 1:
            next_slide = slides_data[i + 1]
            transition_phrases = generate_transition_phrases(
                slide.get("content_text", ""),
                next_slide.get("content_text", ""),
            )

        ctx = SlideContext(
            page_number=slide.get("page_number", i + 1),
            content_text=slide.get("content_text", ""),
            keywords=keywords,
            transition_phrases=transition_phrases,
            embedding=slide.get("embedding"),
        )
        slide_contexts.append(ctx)

    context = PresentationContext(
        presentation_id=presentation_id,
        slides=slide_contexts,
    )

    logger.info(
        f"PresentationContext built: {len(slide_contexts)} slides, "
        f"presentation_id={presentation_id}"
    )

    return context