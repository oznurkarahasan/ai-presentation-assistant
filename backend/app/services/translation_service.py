from app.core.config import settings
from app.core.logger import logger
from openai import AsyncOpenAI

_client = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


async def translate_text(text: str, source_language: str = "English", target_language: str = "Turkish") -> str:
    if not text.strip():
        return ""

    client = get_client()

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a translation engine. Translate the user text from "
                        f"{source_language} to {target_language}. "
                        "Return only the translated text without explanations."
                    ),
                },
                {"role": "user", "content": text},
            ],
            temperature=0,
            max_tokens=300,
        )

        translated = response.choices[0].message.content or ""
        return translated.strip()
    except Exception as exc:
        logger.error(f"Translation failed: {str(exc)}")
        return ""
