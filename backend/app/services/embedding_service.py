from openai import AsyncOpenAI
from app.core.config import settings
from app.core.exceptions import EmbeddingError
from app.core.logger import logger
import asyncio

# Lazy initialization of OpenAI client
_client = None

def get_client() -> AsyncOpenAI:
    """
    Get or create the OpenAI client instance with lazy initialization.
    This allows proper error handling if the API key is missing or invalid.
    """
    global _client
    if _client is None:
        try:
            _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("OpenAI client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {str(e)}")
            raise EmbeddingError(
                message="Failed to initialize OpenAI client",
                details=str(e)
            )
    return _client

# Batch processing configuration
MAX_CONCURRENT_EMBEDDINGS = 10  # Process 10 embeddings at a time

async def create_embedding(text: str) -> list[float]:
    """
    Converts text to a vector. If the text is empty, it vectorizes the word ‘empty’ instead of a space to avoid errors.
    """
    try:
        client = get_client()
        target_text = text if text.strip() else "empty slide content"
        target_text = target_text.replace("\n", " ")

        response = await client.embeddings.create(
            input=target_text,
            model="text-embedding-3-small"
        )
        return response.data[0].embedding

    except Exception as e:
        logger.error(f"Embedding generation failed: {str(e)}", exc_info=True)
        raise EmbeddingError(
            message="Failed to generate text embedding",
            details=str(e)
        )

async def create_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """
    Creates embeddings for multiple texts in parallel with batching.
    Processes MAX_CONCURRENT_EMBEDDINGS at a time to avoid rate limits.
    
    Args:
        texts: List of text strings to embed
        
    Returns:
        List of embedding vectors in the same order as input texts
    """
    if not texts:
        return []
    
    logger.info(f"Starting batch embedding generation for {len(texts)} texts")

    # Process in batches to respect rate limits
    embeddings = []

    for i in range(0, len(texts), MAX_CONCURRENT_EMBEDDINGS):
        batch = texts[i:i + MAX_CONCURRENT_EMBEDDINGS]
        batch_num = (i // MAX_CONCURRENT_EMBEDDINGS) + 1
        total_batches = (len(texts) + MAX_CONCURRENT_EMBEDDINGS - 1) // MAX_CONCURRENT_EMBEDDINGS

        logger.debug(f"Processing batch {batch_num}/{total_batches} ({len(batch)} texts)")

        # Execute batch in parallel
        batch_embeddings = await asyncio.gather(
            *[create_embedding(text) for text in batch],
            return_exceptions=True
        )

        # Check for errors
        for idx, result in enumerate(batch_embeddings):
            if isinstance(result, Exception):
                logger.error(f"Failed to embed text at index {i + idx}: {str(result)}")
                raise EmbeddingError(
                    message=f"Batch embedding failed at position {i + idx}",
                    details=str(result)
                )

        embeddings.extend(batch_embeddings)
        logger.debug(f"Completed batch {batch_num}/{total_batches}")

    logger.info(f"Successfully generated {len(embeddings)} embeddings")
    return embeddings