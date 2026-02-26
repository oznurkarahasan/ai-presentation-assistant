import pytest
from app.services.intent_service import analyze_intent, IntentType

@pytest.mark.asyncio
@pytest.mark.parametrize("text, expected", [
    ("Next slide please", IntentType.NEXT_SLIDE),
    ("Let's move on to the next part", IntentType.NEXT_SLIDE),
    ("Go back to the previous slide", IntentType.PREVIOUS_SLIDE),
    ("Can we see that last part again?", IntentType.PREVIOUS_SLIDE),
    ("Let's jump to slide five", IntentType.JUMP_TO_SLIDE),
    ("What is the revenue for this year?", IntentType.GENERAL_QUERY),
    ("Hello everyone, welcome to the talk", IntentType.UNKNOWN),
])
async def test_analyze_intent_logic(text, expected):
    """Verify that the intent service correctly identifies various user intents."""
    result = await analyze_intent(text)
    assert result.intent == expected
    assert result.confidence >= 0.0
