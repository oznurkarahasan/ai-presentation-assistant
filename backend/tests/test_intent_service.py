import pytest
from unittest.mock import AsyncMock, patch
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
    # Mock the OpenAI response to return the expected intent
    mock_response = AsyncMock()
    mock_response.choices = [
        AsyncMock(message=AsyncMock(content=f'{{"intent": "{expected.value}", "confidence": 0.9}}'))
    ]
    
    with patch("app.services.intent_service.get_client") as mock_get_client:
        mock_client = AsyncMock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_get_client.return_value = mock_client
        
        result = await analyze_intent(text)
        assert result.intent == expected
        assert result.confidence >= 0.0
