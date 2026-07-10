"""
Unit tests for app.services.generation_service.resolve_image_url — the
keyword-scoring function that auto-matches an AI-generated slide's image
prompt to a curated Unsplash URL. Pure function, no I/O, no mocking needed.
"""
from app.services import generation_service


def test_resolve_image_url_matches_technology_keyword():
    url = generation_service.resolve_image_url("a close-up of a microchip circuit board")
    matched = next(img for img in generation_service.UNSPLASH_IMAGE_DATABASE if img["url"] == url)
    assert "chip" in matched["keywords"] or "circuit" in matched["keywords"]


def test_resolve_image_url_matches_business_keyword():
    url = generation_service.resolve_image_url("modern office workspace with a laptop")
    matched = next(img for img in generation_service.UNSPLASH_IMAGE_DATABASE if img["url"] == url)
    assert "office" in matched["keywords"] or "laptop" in matched["keywords"]


def test_resolve_image_url_uses_alt_text_when_prompt_is_generic():
    """The `alt` argument should contribute to the match, not just `prompt`."""
    url = generation_service.resolve_image_url(
        "a picture for the slide", alt="team collaborating in a creative office"
    )
    matched = next(img for img in generation_service.UNSPLASH_IMAGE_DATABASE if img["url"] == url)
    assert "team" in matched["keywords"] or "collaboration" in matched["keywords"]


def test_resolve_image_url_prefers_full_phrase_match_over_partial_tokens():
    """'artificial intelligence' as a full phrase should outscore images that only
    partially overlap on individual tokens like 'intelligence' alone."""
    url = generation_service.resolve_image_url("artificial intelligence robot automation")
    matched = next(img for img in generation_service.UNSPLASH_IMAGE_DATABASE if img["url"] == url)
    assert "ai" in matched["keywords"]


def test_resolve_image_url_falls_back_to_first_entry_for_no_match():
    url = generation_service.resolve_image_url("zzqxxnonsensewordwithnomatches")
    assert url == generation_service.UNSPLASH_IMAGE_DATABASE[0]["url"]


def test_resolve_image_url_is_case_insensitive():
    lower = generation_service.resolve_image_url("business meeting strategy")
    upper = generation_service.resolve_image_url("BUSINESS MEETING STRATEGY")
    assert lower == upper


def test_resolve_image_url_returns_a_valid_database_entry():
    """The returned URL must always belong to the curated database (SSRF allow-list
    invariant relied on by pptx_service._fetch_image_bytes_safely)."""
    all_urls = {img["url"] for img in generation_service.UNSPLASH_IMAGE_DATABASE}
    for prompt in ["finance growth chart", "education online course", "random unrelated text"]:
        assert generation_service.resolve_image_url(prompt) in all_urls
