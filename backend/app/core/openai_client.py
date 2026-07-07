"""
Shared lazily-initialized AsyncOpenAI client, single source of truth for the
5 services/routes that each used to define their own identical get_client().
"""
from typing import Optional
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.logger import logger

_client: Optional[AsyncOpenAI] = None


def get_openai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        logger.info("OpenAI client initialized")
    return _client
