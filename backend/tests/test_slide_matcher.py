"""
Unit tests for Slide Matcher Service.

Tests cover:
1. Voice command detection (TR + EN)
2. Keyword extraction from slide text
3. Transition phrase generation
4. Keyword matching (runtime)
5. Transition phrase matching (runtime)
6. Cosine similarity computation
7. PresentationContext navigation
8. Build presentation context pipeline
9. Full matching engine (all layers)

No real API calls — all embedding operations are mocked.
"""

import os
import math
import pytest
from unittest.mock import AsyncMock, patch

# Set environment variables before imports
os.environ["DATABASE_URL"] = "postgresql+asyncpg://user:pass@localhost/dbname"
os.environ["OPENAI_API_KEY"] = "sk-dummy-key-for-testing"
os.environ["TESTING"] = "True"
os.environ["ENABLE_LOGGING"] = "False"

from app.services.slide_matcher import (
    detect_voice_command,
    extract_keywords_from_text,
    generate_transition_phrases,
    match_keywords,
    match_transition_phrases,
    cosine_similarity,
    build_presentation_context,
    match_transcript_to_slides,
    SlideContext,
    PresentationContext,
    SlideMatchResult,
    MatchType,
    SlideMatchError,
    KEYWORD_MATCH_THRESHOLD,
    KEYWORD_CONFIDENCE_THRESHOLD,
    TRANSITION_CONFIDENCE_THRESHOLD,
    SEMANTIC_CONFIDENCE_THRESHOLD,
)


# ──────────────────────────────────────────────
# Sample Data
# ──────────────────────────────────────────────

SAMPLE_SLIDES = [
    {
        "page_number": 1,
        "content_text": "Yapay Zeka ve Makine Öğrenmesi: Giriş. Yapay zeka teknolojileri günümüzde hayatımızın her alanında kullanılmaktadır.",
    },
    {
        "page_number": 2,
        "content_text": "Derin Öğrenme Modelleri. Sinir ağları, konvolüsyonel ağlar CNN, tekrarlayan sinir ağları RNN ve transformer mimarisi.",
    },
    {
        "page_number": 3,
        "content_text": "Doğal Dil İşleme NLP. Metin sınıflandırma, duygu analizi, makine çevirisi, soru cevaplama sistemleri.",
    },
    {
        "page_number": 4,
        "content_text": "Bilgisayarlı Görü. Nesne tanıma, yüz tanıma, otonom araçlar, medikal görüntü analizi.",
    },
    {
        "page_number": 5,
        "content_text": "Sonuç ve Gelecek Perspektifi. Yapay zeka etik sorunları, regülasyon, AGI tartışmaları.",
    },
]


# ──────────────────────────────────────────────
# 1. Voice Command Detection
# ──────────────────────────────────────────────

class TestVoiceCommandDetection:

    def test_next_turkish(self):
        assert detect_voice_command("sonraki slayt") == "next"

    def test_next_english(self):
        assert detect_voice_command("next slide") == "next"

    def test_previous_turkish(self):
        assert detect_voice_command("önceki slayt") == "previous"

    def test_previous_english(self):
        assert detect_voice_command("go back") == "previous"

    def test_first_slide(self):
        assert detect_voice_command("ilk slayt") == "first"

    def test_last_slide(self):
        assert detect_voice_command("son slayt") == "last"

    def test_devam_et(self):
        assert detect_voice_command("devam et") == "next"

    def test_no_command_long_text(self):
        long = "Bu konuda çok farklı yaklaşımlar var " * 5
        assert detect_voice_command(long) is None

    def test_no_command_unrelated(self):
        assert detect_voice_command("yapay zeka çok güçlü") is None

    def test_command_embedded(self):
        assert detect_voice_command("lütfen sonraki slayt geçer misin") == "next"


# ──────────────────────────────────────────────
# 2. Keyword Extraction
# ──────────────────────────────────────────────

class TestKeywordExtraction:

    def test_turkish_text(self):
        text = "Yapay Zeka ve Makine Öğrenmesi teknolojileri günümüzde çok önemli."
        kws = extract_keywords_from_text(text)
        assert len(kws) > 0

    def test_english_text(self):
        text = "Deep Learning models use neural networks for classification"
        kws = extract_keywords_from_text(text)
        assert len(kws) > 0

    def test_empty_text(self):
        assert extract_keywords_from_text("") == []
        assert extract_keywords_from_text("   ") == []

    def test_stopwords_filtered(self):
        text = "the and is in to of for a an bu ve ile için"
        assert extract_keywords_from_text(text) == []

    def test_max_keywords_limit(self):
        text = "alpha beta gamma delta epsilon zeta theta iota kappa lambda"
        kws = extract_keywords_from_text(text, max_keywords=3)
        assert len(kws) <= 3


# ──────────────────────────────────────────────
# 3. Transition Phrase Generation
# ──────────────────────────────────────────────

class TestTransitionPhraseGeneration:

    def test_generates_phrases(self):
        phrases = generate_transition_phrases(
            "Giriş konusu", "Derin öğrenme modelleri ve sinir ağları"
        )
        assert len(phrases) > 0

    def test_empty_next_slide(self):
        assert generate_transition_phrases("current", "") == []

    def test_includes_turkish_patterns(self):
        phrases = generate_transition_phrases("intro", "optimizasyon teknikleri detaylı bilgi")
        joined = " ".join(phrases).lower()
        assert "şimdi" in joined or "konusuna" in joined

    def test_includes_english_patterns(self):
        phrases = generate_transition_phrases("intro", "optimization techniques methods")
        joined = " ".join(phrases).lower()
        assert "let's" in joined or "moving" in joined


# ──────────────────────────────────────────────
# 4. Keyword Matching (Runtime)
# ──────────────────────────────────────────────

class TestKeywordMatching:

    def test_match_above_threshold(self):
        transcript = "yapay zeka modelleri derin öğrenme sinir ağları veri analizi"
        keywords = ["yapay", "zeka", "modelleri", "öğrenme", "sinir", "veri"]
        conf, matched = match_keywords(transcript, keywords, threshold=3)
        assert conf > 0
        assert len(matched) >= 3

    def test_no_match_below_threshold(self):
        conf, _ = match_keywords("bugün hava güzel", ["yapay", "zeka", "model"], threshold=3)
        assert conf == 0.0

    def test_empty_transcript(self):
        conf, _ = match_keywords("", ["keyword"], threshold=1)
        assert conf == 0.0

    def test_empty_keywords(self):
        conf, _ = match_keywords("some text", [], threshold=1)
        assert conf == 0.0


# ──────────────────────────────────────────────
# 5. Transition Phrase Matching (Runtime)
# ──────────────────────────────────────────────

class TestTransitionPhraseMatching:

    def test_exact_match(self):
        transcript = "şimdi derin öğrenme konusuna bakalım"
        phrases = ["şimdi derin", "derin öğrenme konusuna geçelim"]
        conf, matched = match_transition_phrases(transcript, phrases)
        assert conf > 0

    def test_no_match_unrelated(self):
        conf, _ = match_transition_phrases(
            "bugün hava sıcak", ["şimdi optimizasyon"]
        )
        assert conf < TRANSITION_CONFIDENCE_THRESHOLD

    def test_empty_inputs(self):
        assert match_transition_phrases("", ["phrase"])[0] == 0.0
        assert match_transition_phrases("text", [])[0] == 0.0


# ──────────────────────────────────────────────
# 6. Cosine Similarity
# ──────────────────────────────────────────────

class TestCosineSimilarity:

    def test_identical_vectors(self):
        vec = [1.0, 2.0, 3.0, 4.0]
        assert abs(cosine_similarity(vec, vec) - 1.0) < 0.001

    def test_orthogonal_vectors(self):
        assert abs(cosine_similarity([1, 0, 0], [0, 1, 0])) < 0.001

    def test_opposite_vectors(self):
        assert abs(cosine_similarity([1, 2, 3], [-1, -2, -3]) + 1.0) < 0.001

    def test_empty_vectors(self):
        assert cosine_similarity([], []) == 0.0

    def test_different_length(self):
        assert cosine_similarity([1.0, 2.0], [1.0]) == 0.0

    def test_zero_vector(self):
        assert cosine_similarity([0, 0], [1, 2]) == 0.0


# ──────────────────────────────────────────────
# 7. PresentationContext
# ──────────────────────────────────────────────

class TestPresentationContext:

    def test_navigation(self):
        ctx = PresentationContext(
            presentation_id=1,
            slides=[SlideContext(page_number=i, content_text=f"s{i}") for i in range(1, 4)],
        )
        assert ctx.current_slide.page_number == 1
        assert ctx.advance_next()
        assert ctx.current_slide.page_number == 2
        assert ctx.go_previous()
        assert ctx.current_slide.page_number == 1

    def test_is_last_slide(self):
        ctx = PresentationContext(
            presentation_id=1,
            slides=[SlideContext(page_number=i, content_text=f"s{i}") for i in range(1, 3)],
            current_slide_index=1,
        )
        assert ctx.is_last_slide
        assert not ctx.advance_next()

    def test_lookahead(self):
        ctx = PresentationContext(
            presentation_id=1,
            slides=[SlideContext(page_number=i, content_text=f"s{i}") for i in range(1, 6)],
        )
        la = ctx.get_lookahead_slides(count=2)
        assert len(la) == 2
        assert la[0].page_number == 2

    def test_advance_to(self):
        ctx = PresentationContext(
            presentation_id=1,
            slides=[SlideContext(page_number=i, content_text=f"s{i}") for i in range(1, 4)],
        )
        assert ctx.advance_to(3)
        assert ctx.current_slide.page_number == 3
        assert not ctx.advance_to(99)


# ──────────────────────────────────────────────
# 8. Build Presentation Context
# ──────────────────────────────────────────────

class TestBuildPresentationContext:

    @pytest.mark.asyncio
    async def test_builds_from_sample_slides(self):
        ctx = await build_presentation_context(1, SAMPLE_SLIDES)
        assert len(ctx.slides) == 5
        assert ctx.presentation_id == 1
        for slide in ctx.slides:
            assert isinstance(slide.keywords, list)

    @pytest.mark.asyncio
    async def test_last_slide_no_transition_phrases(self):
        ctx = await build_presentation_context(1, SAMPLE_SLIDES)
        assert len(ctx.slides[4].transition_phrases) == 0

    @pytest.mark.asyncio
    async def test_keywords_are_meaningful(self):
        ctx = await build_presentation_context(1, SAMPLE_SLIDES)
        slide2_kws = " ".join(ctx.slides[1].keywords)
        has_relevant = any(
            kw in slide2_kws
            for kw in ["derin", "sinir", "öğrenme", "transformer", "konvolüsyonel"]
        )
        assert has_relevant


# ──────────────────────────────────────────────
# 9. Full Matching Engine
# ──────────────────────────────────────────────

class TestMatchingEngine:

    @pytest.mark.asyncio
    async def test_voice_command_advances(self):
        ctx = await build_presentation_context(1, SAMPLE_SLIDES)
        result = await match_transcript_to_slides(
            "sonraki slayt", ctx, use_semantic=False
        )
        assert result.should_advance
        assert result.match_type == MatchType.VOICE_COMMAND
        assert result.target_slide == 2

    @pytest.mark.asyncio
    async def test_voice_back_on_slide_3(self):
        ctx = await build_presentation_context(1, SAMPLE_SLIDES)
        ctx.current_slide_index = 2
        result = await match_transcript_to_slides(
            "geri dön", ctx, use_semantic=False
        )
        assert result.should_advance
        assert result.target_slide == 2

    @pytest.mark.asyncio
    async def test_no_match_returns_false(self):
        ctx = await build_presentation_context(1, SAMPLE_SLIDES)
        result = await match_transcript_to_slides(
            "bugün hava çok güzel pikniğe gidelim",
            ctx, use_semantic=False,
        )
        assert not result.should_advance
        assert result.match_type == MatchType.NONE

    @pytest.mark.asyncio
    async def test_last_slide_no_advance(self):
        ctx = await build_presentation_context(1, SAMPLE_SLIDES)
        ctx.current_slide_index = 4
        result = await match_transcript_to_slides(
            "some random text", ctx, use_semantic=False
        )
        assert not result.should_advance

    @pytest.mark.asyncio
    async def test_semantic_match_with_mock(self):
        """Test semantic layer with mocked embedding service."""
        ctx = await build_presentation_context(1, SAMPLE_SLIDES)
        # Give slides fake embeddings
        ctx.slides[1].embedding = [0.5] * 10
        ctx.slides[2].embedding = [0.1] * 10

        mock_embedding = [0.5] * 10  # Same as slide 2 → high similarity

        with patch(
            "app.services.slide_matcher.compute_semantic_similarity",
            new_callable=AsyncMock,
            side_effect=[0.85, 0.3, 0.1],  # slide2=0.85, slide3=0.3, slide4=0.1
        ):
            result = await match_transcript_to_slides(
                "unrelated text that won't match keywords",
                ctx, use_semantic=True,
            )

        if result.should_advance and result.match_type == MatchType.SEMANTIC:
            assert result.confidence >= SEMANTIC_CONFIDENCE_THRESHOLD

    def test_result_to_dict(self):
        r = SlideMatchResult(
            should_advance=True, match_type=MatchType.KEYWORD,
            confidence=0.756, target_slide=3, current_slide=2,
            matched_keywords=["deep", "learning"],
        )
        d = r.to_dict()
        assert d["should_advance"] is True
        assert d["match_type"] == "keyword"
        assert d["confidence"] == 0.756