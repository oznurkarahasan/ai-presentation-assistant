import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Mock settings if needed or use real ones
from app.services.intent_service import analyze_intent, IntentType

async def test_intents():
    test_cases = [
        ("Next slide please", IntentType.NEXT_SLIDE),
        ("Let's move on to the next part", IntentType.NEXT_SLIDE),
        ("Go back to the previous slide", IntentType.PREVIOUS_SLIDE),
        ("Can we see that last part again?", IntentType.PREVIOUS_SLIDE),
        ("Let's jump to slide five", IntentType.JUMP_TO_SLIDE),
        ("What is the revenue for this year?", IntentType.GENERAL_QUERY),
        ("Hello everyone, welcome to the talk", IntentType.UNKNOWN),
    ]

    print("--- Starting Intent Analysis Verification ---")
    for text, expected in test_cases:
        result = await analyze_intent(text)
        status = "PASS" if result.intent == expected else "FAIL"
        print(f"Text: '{text}'")
        print(f"  Expected: {expected}, Got: {result.intent} ({result.confidence:.2f})")
        print(f"  Status: {status}")
        print("-" * 20)

if __name__ == "__main__":
    asyncio.run(test_intents())
