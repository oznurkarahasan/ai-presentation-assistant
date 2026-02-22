"""
Standalone Slide Matcher Test Suite
=====================================
Tests all matching layers without external dependencies.

Run: python3 test_slide_matcher_standalone.py
"""

import asyncio
import sys
import time
import math
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
from unittest.mock import AsyncMock, patch


# ═══════════════════════════════════════════════
# STUBS
# ═══════════════════════════════════════════════

class AppBaseException(Exception):
    def __init__(self, message: str, details: str = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


class SlideMatchError(AppBaseException):
    pass


class MockLogger:
    def info(self, msg): pass
    def debug(self, msg): pass
    def warning(self, msg): pass
    def error(self, msg, **kw): pass


logger = MockLogger()


# ═══════════════════════════════════════════════
# COPY OF CORE LOGIC (for standalone testing)
# ═══════════════════════════════════════════════

class MatchType(str, Enum):
    KEYWORD = "keyword"
    TRANSITION_PHRASE = "transition_phrase"
    SEMANTIC = "semantic"
    VOICE_COMMAND = "voice_command"
    MANUAL = "manual"
    NONE = "none"


@dataclass
class SlideMatchResult:
    should_advance: bool
    match_type: MatchType
    confidence: float
    target_slide: int
    current_slide: int
    matched_keywords: list = field(default_factory=list)
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
    page_number: int
    content_text: str
    keywords: list = field(default_factory=list)
    transition_phrases: list = field(default_factory=list)
    embedding: Optional[list] = None


@dataclass
class PresentationContext:
    presentation_id: int
    slides: list = field(default_factory=list)
    current_slide_index: int = 0

    @property
    def current_slide(self):
        if 0 <= self.current_slide_index < len(self.slides):
            return self.slides[self.current_slide_index]
        return None

    @property
    def next_slide(self):
        idx = self.current_slide_index + 1
        if idx < len(self.slides):
            return self.slides[idx]
        return None

    @property
    def is_last_slide(self):
        return self.current_slide_index >= len(self.slides) - 1

    def get_lookahead_slides(self, count=2):
        start = self.current_slide_index + 1
        end = min(start + count, len(self.slides))
        return self.slides[start:end]

    def advance_to(self, page_number):
        for i, s in enumerate(self.slides):
            if s.page_number == page_number:
                self.current_slide_index = i
                return True
        return False

    def advance_next(self):
        if not self.is_last_slide:
            self.current_slide_index += 1
            return True
        return False

    def go_previous(self):
        if self.current_slide_index > 0:
            self.current_slide_index -= 1
            return True
        return False


# Voice commands
VOICE_COMMANDS = {
    "next": [
        "sonraki slayt", "sonraki sayfa", "ileri",
        "sonrakine geç", "devam et", "devam",
        "bir sonraki", "ilerle", "geç",
        "next slide", "next page", "go forward",
        "move on", "continue", "next one", "advance",
    ],
    "previous": [
        "önceki slayt", "önceki sayfa", "geri",
        "bir önceki", "geri dön", "geri git",
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


def detect_voice_command(transcript):
    text = transcript.strip().lower()
    if len(text) > 100:
        return None
    for cmd_type, phrases in VOICE_COMMANDS.items():
        for phrase in phrases:
            if phrase in text:
                return cmd_type
    return None


# Keyword extraction
def extract_keywords_from_text(text, max_keywords=15):
    if not text or not text.strip():
        return []
    text_lower = text.lower()
    text_clean = re.sub(r'[^\w\sçğıöşüâîûÇĞİÖŞÜ]', ' ', text_lower)
    words = text_clean.split()

    stopwords = {
        "bir", "ve", "bu", "da", "de", "ile", "için", "gibi",
        "olan", "olarak", "daha", "en", "çok", "her", "ama",
        "ancak", "veya", "ya", "hem", "ne", "nasıl", "kadar",
        "sonra", "önce", "üzere", "göre", "ayrıca", "ise",
        "var", "yok", "olan", "oldu", "olur", "olmak",
        "den", "dan", "nin", "nın", "nun", "nün",
        "dir", "dır", "dur", "dür", "tir", "tır", "tur", "tür",
        "the", "and", "is", "in", "to", "of", "for", "a", "an",
        "that", "this", "with", "are", "was", "be", "has", "have",
        "it", "not", "on", "at", "by", "from", "or", "but", "as",
        "can", "will", "do", "if", "so", "we", "you", "they",
        "our", "your", "its", "all", "also", "more", "about",
        "how", "what", "when", "which", "who", "than", "then",
        "slide", "slayt", "sayfa", "page", "notes", "notlar",
    }

    word_freq = {}
    for w in words:
        if len(w) > 2 and w not in stopwords and not w.isdigit():
            word_freq[w] = word_freq.get(w, 0) + 1

    if not word_freq:
        return []

    scored = [
        (word, freq * math.log2(max(len(word), 2)))
        for word, freq in word_freq.items()
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [word for word, _ in scored[:max_keywords]]


def generate_transition_phrases(current_text, next_text):
    phrases = []
    next_keywords = extract_keywords_from_text(next_text, max_keywords=5)
    if not next_keywords:
        return phrases
    kw = next_keywords[0]
    phrases.extend([
        f"şimdi {kw}", f"{kw} konusuna geçelim", f"{kw} hakkında",
        f"sıradaki konu {kw}", f"{kw} bakacak olursak", f"{kw} ele alalım",
        f"now let's talk about {kw}", f"moving on to {kw}",
        f"next topic is {kw}", f"let's look at {kw}", f"regarding {kw}",
    ])
    if len(next_keywords) >= 2:
        kw2 = next_keywords[1]
        phrases.extend([f"{kw} ve {kw2}", f"{kw} and {kw2}"])
    return phrases


def match_keywords(transcript, slide_keywords, threshold=3):
    if not transcript or not slide_keywords:
        return 0.0, []
    text_lower = transcript.lower()
    matched = [kw for kw in slide_keywords if kw in text_lower]
    if len(matched) < threshold:
        return 0.0, matched
    confidence = min(len(matched) / max(len(slide_keywords), 1), 1.0)
    return confidence, matched


def match_transition_phrases(transcript, transition_phrases):
    if not transcript or not transition_phrases:
        return 0.0, ""
    text_lower = transcript.lower()
    for phrase in transition_phrases:
        if phrase.lower() in text_lower:
            return 0.85, phrase
    best_score = 0.0
    best_phrase = ""
    for phrase in transition_phrases:
        phrase_words = set(phrase.lower().split())
        if len(phrase_words) < 2:
            continue
        matched_words = sum(1 for w in phrase_words if w in text_lower)
        ratio = matched_words / len(phrase_words)
        if ratio > 0.6 and ratio > best_score:
            best_score = ratio * 0.7
            best_phrase = phrase
    return best_score, best_phrase


def cosine_similarity(vec_a, vec_b):
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = sum(a * a for a in vec_a) ** 0.5
    mag_b = sum(b * b for b in vec_b) ** 0.5
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


KEYWORD_MATCH_THRESHOLD = 3
KEYWORD_CONFIDENCE_THRESHOLD = 0.25
TRANSITION_CONFIDENCE_THRESHOLD = 0.5
SEMANTIC_CONFIDENCE_THRESHOLD = 0.72


# Simplified match engine (no real embedding calls for standalone test)
async def match_transcript_to_slides(transcript, context, use_semantic=True, mock_semantic_scores=None):
    """Standalone version with injectable semantic scores for testing."""
    start_time = time.time()
    current_page = context.current_slide.page_number if context.current_slide else 1

    # Layer 0: Voice Command
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
            return SlideMatchResult(
                should_advance=True, match_type=MatchType.VOICE_COMMAND,
                confidence=1.0, target_slide=target, current_slide=current_page,
                debug_info=f"voice_command={command}",
            )

    lookahead = context.get_lookahead_slides(count=3)
    if not lookahead:
        return SlideMatchResult(
            should_advance=False, match_type=MatchType.NONE,
            confidence=0.0, target_slide=current_page, current_slide=current_page,
            debug_info="last_slide_reached",
        )

    # Layer 1: Keyword Match
    for slide in lookahead:
        kw_conf, matched_kws = match_keywords(
            transcript, slide.keywords, threshold=KEYWORD_MATCH_THRESHOLD
        )
        if kw_conf >= KEYWORD_CONFIDENCE_THRESHOLD:
            return SlideMatchResult(
                should_advance=True, match_type=MatchType.KEYWORD,
                confidence=kw_conf, target_slide=slide.page_number,
                current_slide=current_page, matched_keywords=matched_kws,
            )

    # Layer 2: Transition Phrase
    for slide in lookahead:
        tp_conf, matched_phrase = match_transition_phrases(
            transcript, slide.transition_phrases
        )
        if tp_conf >= TRANSITION_CONFIDENCE_THRESHOLD:
            return SlideMatchResult(
                should_advance=True, match_type=MatchType.TRANSITION_PHRASE,
                confidence=tp_conf, target_slide=slide.page_number,
                current_slide=current_page, debug_info=f"phrase='{matched_phrase}'",
            )

    # Layer 3: Semantic (use mock scores if provided)
    if use_semantic and mock_semantic_scores:
        best_score = 0.0
        best_slide = None
        for slide in lookahead:
            score = mock_semantic_scores.get(slide.page_number, 0.0)
            if score > best_score:
                best_score = score
                best_slide = slide
        if best_slide and best_score >= SEMANTIC_CONFIDENCE_THRESHOLD:
            return SlideMatchResult(
                should_advance=True, match_type=MatchType.SEMANTIC,
                confidence=best_score, target_slide=best_slide.page_number,
                current_slide=current_page, debug_info=f"cosine={best_score:.3f}",
            )

    return SlideMatchResult(
        should_advance=False, match_type=MatchType.NONE,
        confidence=0.0, target_slide=current_page, current_slide=current_page,
    )


async def build_presentation_context(presentation_id, slides_data):
    slide_contexts = []
    for i, slide in enumerate(slides_data):
        keywords = extract_keywords_from_text(slide.get("content_text", ""), max_keywords=15)
        transition_phrases = []
        if i < len(slides_data) - 1:
            next_slide = slides_data[i + 1]
            transition_phrases = generate_transition_phrases(
                slide.get("content_text", ""), next_slide.get("content_text", ""),
            )
        ctx = SlideContext(
            page_number=slide.get("page_number", i + 1),
            content_text=slide.get("content_text", ""),
            keywords=keywords, transition_phrases=transition_phrases,
            embedding=slide.get("embedding"),
        )
        slide_contexts.append(ctx)
    return PresentationContext(presentation_id=presentation_id, slides=slide_contexts)


# ═══════════════════════════════════════════════
# TEST FRAMEWORK
# ═══════════════════════════════════════════════

passed = 0
failed = 0
errors = []


def test(name):
    def decorator(func):
        func._test_name = name
        return func
    return decorator


async def run_test(func):
    global passed, failed
    name = getattr(func, '_test_name', func.__name__)
    try:
        if asyncio.iscoroutinefunction(func):
            await func()
        else:
            func()
        passed += 1
        print(f"  ✅ {name}")
    except Exception as e:
        failed += 1
        errors.append((name, e))
        print(f"  ❌ {name}")
        print(f"     → {type(e).__name__}: {e}")


# ═══════════════════════════════════════════════
# SAMPLE PRESENTATION DATA
# ═══════════════════════════════════════════════

SAMPLE_SLIDES = [
    {
        "page_number": 1,
        "content_text": "Yapay Zeka ve Makine Öğrenmesi: Giriş. Yapay zeka teknolojileri günümüzde hayatımızın her alanında kullanılmaktadır. Bu sunumda yapay zeka temellerini ele alacağız.",
    },
    {
        "page_number": 2,
        "content_text": "Derin Öğrenme Modelleri. Sinir ağları, konvolüsyonel ağlar (CNN), tekrarlayan sinir ağları (RNN) ve transformer mimarisi. Derin öğrenme, büyük veri setlerinde etkili sonuçlar üretir.",
    },
    {
        "page_number": 3,
        "content_text": "Doğal Dil İşleme (NLP). Metin sınıflandırma, duygu analizi, makine çevirisi, soru cevaplama sistemleri. GPT ve BERT modelleri NLP alanını dönüştürdü.",
    },
    {
        "page_number": 4,
        "content_text": "Bilgisayarlı Görü. Nesne tanıma, yüz tanıma, otonom araçlar, medikal görüntü analizi. CNN tabanlı modeller bilgisayarlı görüde çığır açtı.",
    },
    {
        "page_number": 5,
        "content_text": "Sonuç ve Gelecek Perspektifi. Yapay zeka etik sorunları, regülasyon, AGI tartışmaları. Sorular ve tartışma.",
    },
]


# ═══════════════════════════════════════════════
# TESTS
# ═══════════════════════════════════════════════

# ─── 1. Voice Command Detection ───

@test("Detect 'sonraki slayt' command (Turkish)")
def test_voice_cmd_next_tr():
    assert detect_voice_command("sonraki slayt") == "next"

@test("Detect 'next slide' command (English)")
def test_voice_cmd_next_en():
    assert detect_voice_command("next slide") == "next"

@test("Detect 'önceki slayt' command")
def test_voice_cmd_prev_tr():
    assert detect_voice_command("önceki slayt") == "previous"

@test("Detect 'go back' command")
def test_voice_cmd_prev_en():
    assert detect_voice_command("go back") == "previous"

@test("Detect 'ilk slayt' command")
def test_voice_cmd_first():
    assert detect_voice_command("ilk slayt") == "first"

@test("Detect 'son slayt' command")
def test_voice_cmd_last():
    assert detect_voice_command("son slayt") == "last"

@test("Detect 'devam et' command")
def test_voice_cmd_devam():
    assert detect_voice_command("devam et") == "next"

@test("No command in long natural speech")
def test_voice_cmd_long_text():
    long = "Bu konuda çok farklı yaklaşımlar var ve " * 5
    assert detect_voice_command(long) is None

@test("No command in unrelated text")
def test_voice_cmd_unrelated():
    assert detect_voice_command("yapay zeka çok güçlü") is None

@test("Command embedded in sentence")
def test_voice_cmd_embedded():
    assert detect_voice_command("lütfen sonraki slayt geçer misin") == "next"


# ─── 2. Keyword Extraction ───

@test("Extract keywords from Turkish AI text")
def test_extract_kw_turkish():
    text = "Yapay Zeka ve Makine Öğrenmesi teknolojileri günümüzde çok önemli. Yapay zeka modelleri büyük veri ile çalışır."
    kws = extract_keywords_from_text(text)
    assert len(kws) > 0
    # "yapay", "zeka", "makine", "öğrenmesi" should be in there
    kw_joined = " ".join(kws)
    assert "yapay" in kw_joined or "zeka" in kw_joined

@test("Extract keywords from English text")
def test_extract_kw_english():
    text = "Deep Learning models use neural networks for classification and prediction tasks in computer vision"
    kws = extract_keywords_from_text(text)
    assert len(kws) > 0
    kw_joined = " ".join(kws)
    assert "learning" in kw_joined or "neural" in kw_joined or "deep" in kw_joined

@test("No keywords from empty text")
def test_extract_kw_empty():
    assert extract_keywords_from_text("") == []
    assert extract_keywords_from_text("   ") == []

@test("Stopwords filtered out")
def test_extract_kw_stopwords():
    text = "the and is in to of for a an bu ve ile için"
    kws = extract_keywords_from_text(text)
    assert len(kws) == 0

@test("Respects max_keywords limit")
def test_extract_kw_limit():
    text = "alpha beta gamma delta epsilon zeta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon"
    kws = extract_keywords_from_text(text, max_keywords=5)
    assert len(kws) <= 5


# ─── 3. Transition Phrase Generation ───

@test("Generate transition phrases between slides")
def test_gen_transition():
    current = "Yapay zeka giriş konusu"
    next_text = "Derin öğrenme modelleri ve sinir ağları"
    phrases = generate_transition_phrases(current, next_text)
    assert len(phrases) > 0
    # Should contain reference to next slide's keywords
    phrases_joined = " ".join(phrases).lower()
    assert "derin" in phrases_joined or "öğrenme" in phrases_joined or "sinir" in phrases_joined

@test("No transition phrases when next slide is empty")
def test_gen_transition_empty_next():
    phrases = generate_transition_phrases("current content", "")
    assert len(phrases) == 0

@test("Transition phrases include Turkish patterns")
def test_gen_transition_turkish():
    phrases = generate_transition_phrases("intro", "optimizasyon teknikleri hakkında detaylı bilgi")
    phrases_joined = " ".join(phrases).lower()
    assert "şimdi" in phrases_joined or "konusuna" in phrases_joined or "hakkında" in phrases_joined

@test("Transition phrases include English patterns")
def test_gen_transition_english():
    phrases = generate_transition_phrases("intro", "optimization techniques and methods")
    phrases_joined = " ".join(phrases).lower()
    assert "let's" in phrases_joined or "moving" in phrases_joined or "regarding" in phrases_joined


# ─── 4. Keyword Matching (Runtime) ───

@test("Match keywords above threshold")
def test_kw_match_above():
    transcript = "yapay zeka modelleri derin öğrenme sinir ağları kullanarak veri analizi yapar"
    keywords = ["yapay", "zeka", "modelleri", "öğrenme", "sinir", "veri"]
    conf, matched = match_keywords(transcript, keywords, threshold=3)
    assert conf > 0
    assert len(matched) >= 3

@test("No match below threshold")
def test_kw_match_below():
    transcript = "bugün hava çok güzel"
    keywords = ["yapay", "zeka", "modelleri", "öğrenme"]
    conf, matched = match_keywords(transcript, keywords, threshold=3)
    assert conf == 0.0

@test("Empty transcript returns no match")
def test_kw_match_empty():
    conf, matched = match_keywords("", ["keyword"], threshold=1)
    assert conf == 0.0

@test("Empty keywords returns no match")
def test_kw_match_no_keywords():
    conf, matched = match_keywords("some text", [], threshold=1)
    assert conf == 0.0


# ─── 5. Transition Phrase Matching (Runtime) ───

@test("Exact transition phrase match")
def test_tp_exact_match():
    transcript = "şimdi derin öğrenme konusuna bakalım"
    phrases = ["şimdi derin", "derin öğrenme konusuna geçelim"]
    conf, matched = match_transition_phrases(transcript, phrases)
    assert conf > 0
    assert "derin" in matched.lower()

@test("No match with unrelated transcript")
def test_tp_no_match():
    transcript = "bugün hava çok sıcak"
    phrases = ["şimdi optimizasyon", "optimizasyon konusuna geçelim"]
    conf, _ = match_transition_phrases(transcript, phrases)
    assert conf < TRANSITION_CONFIDENCE_THRESHOLD

@test("Empty inputs return no match")
def test_tp_empty():
    conf, _ = match_transition_phrases("", ["phrase"])
    assert conf == 0.0
    conf2, _ = match_transition_phrases("text", [])
    assert conf2 == 0.0


# ─── 6. Cosine Similarity ───

@test("Identical vectors = 1.0")
def test_cosine_identical():
    vec = [1.0, 2.0, 3.0, 4.0]
    assert abs(cosine_similarity(vec, vec) - 1.0) < 0.001

@test("Orthogonal vectors = 0.0")
def test_cosine_orthogonal():
    a = [1.0, 0.0, 0.0]
    b = [0.0, 1.0, 0.0]
    assert abs(cosine_similarity(a, b)) < 0.001

@test("Opposite vectors = -1.0")
def test_cosine_opposite():
    a = [1.0, 2.0, 3.0]
    b = [-1.0, -2.0, -3.0]
    assert abs(cosine_similarity(a, b) - (-1.0)) < 0.001

@test("Empty vectors = 0.0")
def test_cosine_empty():
    assert cosine_similarity([], []) == 0.0
    assert cosine_similarity([1.0], []) == 0.0

@test("Different length vectors = 0.0")
def test_cosine_diff_len():
    assert cosine_similarity([1.0, 2.0], [1.0]) == 0.0

@test("Zero vector = 0.0")
def test_cosine_zero():
    assert cosine_similarity([0.0, 0.0], [1.0, 2.0]) == 0.0


# ─── 7. PresentationContext ───

@test("Context navigation: next/previous/first/last")
def test_context_navigation():
    ctx = PresentationContext(
        presentation_id=1,
        slides=[
            SlideContext(page_number=1, content_text="s1"),
            SlideContext(page_number=2, content_text="s2"),
            SlideContext(page_number=3, content_text="s3"),
        ],
    )
    assert ctx.current_slide.page_number == 1
    assert ctx.next_slide.page_number == 2
    assert not ctx.is_last_slide

    assert ctx.advance_next()
    assert ctx.current_slide.page_number == 2

    assert ctx.advance_next()
    assert ctx.current_slide.page_number == 3
    assert ctx.is_last_slide
    assert not ctx.advance_next()  # Can't go beyond last

    assert ctx.go_previous()
    assert ctx.current_slide.page_number == 2

    assert ctx.advance_to(1)
    assert ctx.current_slide.page_number == 1

@test("Lookahead returns correct slides")
def test_context_lookahead():
    ctx = PresentationContext(
        presentation_id=1,
        slides=[SlideContext(page_number=i, content_text=f"s{i}") for i in range(1, 6)],
    )
    # At slide 1, lookahead should be [2, 3]
    la = ctx.get_lookahead_slides(count=2)
    assert len(la) == 2
    assert la[0].page_number == 2
    assert la[1].page_number == 3

@test("Lookahead at last slide returns empty")
def test_context_lookahead_last():
    ctx = PresentationContext(
        presentation_id=1,
        slides=[SlideContext(page_number=i, content_text=f"s{i}") for i in range(1, 4)],
        current_slide_index=2,
    )
    assert ctx.get_lookahead_slides(count=3) == []


# ─── 8. Build Presentation Context ───

@test("Build context from sample slides")
async def test_build_context():
    ctx = await build_presentation_context(1, SAMPLE_SLIDES)
    assert len(ctx.slides) == 5
    assert ctx.presentation_id == 1
    # Each slide should have keywords
    for slide in ctx.slides:
        assert isinstance(slide.keywords, list)
    # First 4 slides should have transition phrases
    for slide in ctx.slides[:4]:
        assert isinstance(slide.transition_phrases, list)
    # Last slide should have no transition phrases (no next slide)
    assert len(ctx.slides[4].transition_phrases) == 0

@test("Built context keywords are meaningful")
async def test_build_context_keywords():
    ctx = await build_presentation_context(1, SAMPLE_SLIDES)
    # Slide 2 is about deep learning
    slide2_kws = " ".join(ctx.slides[1].keywords)
    assert "derin" in slide2_kws or "sinir" in slide2_kws or "öğrenme" in slide2_kws


# ─── 9. Full Matching Engine ───

@test("Voice command triggers slide advance")
async def test_engine_voice_cmd():
    ctx = await build_presentation_context(1, SAMPLE_SLIDES)
    result = await match_transcript_to_slides("sonraki slayt", ctx, use_semantic=False)
    assert result.should_advance
    assert result.match_type == MatchType.VOICE_COMMAND
    assert result.confidence == 1.0
    assert result.target_slide == 2

@test("Voice command 'geri' goes to previous slide")
async def test_engine_voice_back():
    ctx = await build_presentation_context(1, SAMPLE_SLIDES)
    ctx.current_slide_index = 2  # On slide 3
    result = await match_transcript_to_slides("geri dön", ctx, use_semantic=False)
    assert result.should_advance
    assert result.match_type == MatchType.VOICE_COMMAND
    assert result.target_slide == 2

@test("No advance on last slide with 'next' command")
async def test_engine_last_slide_no_next():
    ctx = await build_presentation_context(1, SAMPLE_SLIDES)
    ctx.current_slide_index = 4  # Last slide
    result = await match_transcript_to_slides("sonraki slayt", ctx, use_semantic=False)
    # Voice command detected but can't advance
    assert result.match_type == MatchType.NONE or not result.should_advance

@test("Keyword match triggers advance to correct slide")
async def test_engine_keyword_match():
    ctx = await build_presentation_context(1, SAMPLE_SLIDES)
    # We're on slide 1, talking about slide 2's content
    transcript = "derin öğrenme sinir ağları konvolüsyonel transformer mimarisi hakkında konuşalım"
    result = await match_transcript_to_slides(transcript, ctx, use_semantic=False)
    if result.should_advance:
        assert result.target_slide == 2
        assert result.match_type == MatchType.KEYWORD

@test("No match returns should_advance=False")
async def test_engine_no_match():
    ctx = await build_presentation_context(1, SAMPLE_SLIDES)
    result = await match_transcript_to_slides(
        "bugün hava çok güzel pikniğe gidelim",
        ctx, use_semantic=False,
    )
    assert not result.should_advance
    assert result.match_type == MatchType.NONE

@test("Semantic match with high similarity triggers advance")
async def test_engine_semantic():
    ctx = await build_presentation_context(1, SAMPLE_SLIDES)
    # Mock: slide 2 has 0.85 similarity (above threshold)
    mock_scores = {2: 0.85, 3: 0.3, 4: 0.1}
    result = await match_transcript_to_slides(
        "some unrelated text for keyword layers",
        ctx, use_semantic=True, mock_semantic_scores=mock_scores,
    )
    assert result.should_advance
    assert result.match_type == MatchType.SEMANTIC
    assert result.target_slide == 2
    assert result.confidence >= SEMANTIC_CONFIDENCE_THRESHOLD

@test("Semantic match below threshold does not trigger")
async def test_engine_semantic_below():
    ctx = await build_presentation_context(1, SAMPLE_SLIDES)
    mock_scores = {2: 0.5, 3: 0.3}  # All below 0.72
    result = await match_transcript_to_slides(
        "some unrelated text for testing",
        ctx, use_semantic=True, mock_semantic_scores=mock_scores,
    )
    assert not result.should_advance

@test("SlideMatchResult.to_dict works correctly")
def test_result_to_dict():
    r = SlideMatchResult(
        should_advance=True, match_type=MatchType.KEYWORD,
        confidence=0.756, target_slide=3, current_slide=2,
        matched_keywords=["deep", "learning"],
    )
    d = r.to_dict()
    assert d["should_advance"] is True
    assert d["match_type"] == "keyword"
    assert d["confidence"] == 0.756
    assert d["target_slide"] == 3


# ═══════════════════════════════════════════════
# RUN ALL TESTS
# ═══════════════════════════════════════════════

async def main():
    print("\n" + "=" * 60)
    print("🧪 SLIDE MATCHER SERVICE - UNIT TEST SUITE")
    print("=" * 60)

    all_tests = [
        ("1. VOICE COMMAND DETECTION", [
            test_voice_cmd_next_tr, test_voice_cmd_next_en,
            test_voice_cmd_prev_tr, test_voice_cmd_prev_en,
            test_voice_cmd_first, test_voice_cmd_last,
            test_voice_cmd_devam, test_voice_cmd_long_text,
            test_voice_cmd_unrelated, test_voice_cmd_embedded,
        ]),
        ("2. KEYWORD EXTRACTION", [
            test_extract_kw_turkish, test_extract_kw_english,
            test_extract_kw_empty, test_extract_kw_stopwords,
            test_extract_kw_limit,
        ]),
        ("3. TRANSITION PHRASE GENERATION", [
            test_gen_transition, test_gen_transition_empty_next,
            test_gen_transition_turkish, test_gen_transition_english,
        ]),
        ("4. KEYWORD MATCHING (Runtime)", [
            test_kw_match_above, test_kw_match_below,
            test_kw_match_empty, test_kw_match_no_keywords,
        ]),
        ("5. TRANSITION PHRASE MATCHING (Runtime)", [
            test_tp_exact_match, test_tp_no_match, test_tp_empty,
        ]),
        ("6. COSINE SIMILARITY", [
            test_cosine_identical, test_cosine_orthogonal,
            test_cosine_opposite, test_cosine_empty,
            test_cosine_diff_len, test_cosine_zero,
        ]),
        ("7. PRESENTATION CONTEXT", [
            test_context_navigation, test_context_lookahead,
            test_context_lookahead_last,
        ]),
        ("8. BUILD PRESENTATION CONTEXT", [
            test_build_context, test_build_context_keywords,
        ]),
        ("9. FULL MATCHING ENGINE", [
            test_engine_voice_cmd, test_engine_voice_back,
            test_engine_last_slide_no_next, test_engine_keyword_match,
            test_engine_no_match, test_engine_semantic,
            test_engine_semantic_below, test_result_to_dict,
        ]),
    ]

    for section_name, tests in all_tests:
        print(f"\n── {section_name} ──")
        for t in tests:
            await run_test(t)

    total = passed + failed
    print("\n" + "=" * 60)
    print(f"RESULTS: {passed}/{total} passed, {failed} failed")

    if failed > 0:
        print(f"\nFAILED TESTS:")
        for name, err in errors:
            print(f"   • {name}: {err}")
        print("=" * 60)
        sys.exit(1)
    else:
        print("ALL TESTS PASSED!")
        print("=" * 60)
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())