from openai import AsyncOpenAI
from app.core.config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

async def create_embedding(text: str) -> list[float]:
    """
    Converts text to a vector. If the text is empty, it vectorizes the word ‘empty’ instead of a space to avoid errors.
    """
    try:
        target_text = text if text.strip() else "empty slide content"
        target_text = target_text.replace("\n", " ")

        response = await client.embeddings.create(
            input=target_text,
            model="text-embedding-3-small"
        )
        return response.data[0].embedding

    except Exception as e:
        print(f"Embedding Hatası: {e}")
        raise e