from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.presentation import Slide
from app.services import embedding_service
from app.core.config import settings
from app.core.logger import logger
from app.core.exceptions import EmbeddingError
from openai import AsyncOpenAI

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
            logger.info("OpenAI client initialized successfully in RAG service")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client in RAG service: {str(e)}")
            raise EmbeddingError(
                message="Failed to initialize OpenAI client",
                details=str(e)
            )
    return _client

async def ask_question(
    db: AsyncSession, 
    presentation_id: int, 
    question: str,
    current_slide: Optional[int] = None
) -> dict:
    """
    1. Converts the question into a vector.
    2. Finds the 3 most relevant slides.
    3. Sends context to GPT-4o-mini with instructions to match the user's language.
    """
    
    # 1. Embedding
    query_vector = await embedding_service.create_embedding(question)

    # 2. Vector Search + Current Slide Context
    top_slides = []
    
    # Always include the current slide if provided
    if current_slide:
        current_stmt = select(Slide).filter(
            Slide.presentation_id == presentation_id,
            Slide.page_number == current_slide
        )
        current_res = await db.execute(current_stmt)
        curr_slide_obj = current_res.scalar_one_or_none()
        if curr_slide_obj:
            top_slides.append(curr_slide_obj)

    # Fetch nearest neighbors (excluding current slide if already added)
    search_stmt = select(Slide).filter(
        Slide.presentation_id == presentation_id
    )
    if current_slide:
        search_stmt = search_stmt.filter(Slide.page_number != current_slide)
    
    search_stmt = search_stmt.order_by(
        Slide.embedding.l2_distance(query_vector)
    ).limit(3 - len(top_slides))
    
    result = await db.execute(search_stmt)
    top_slides.extend(result.scalars().all())

    if not top_slides:
        return {
            "answer": "Üzgünüm, dokümanda bu konuyla ilgili bilgi bulamadım. / Sorry, I couldn't find relevant info in the document.",
            "sources": []
        }

    # Context & Prompt
    retrieved_context = "\n\n".join([
        f"[Sayfa {s.page_number}]{' (Görüntülenen Sayfa)' if s.page_number == current_slide else ''}: {s.content_text}" 
        for s in top_slides
    ])

    system_prompt = """
    Sen yardımcı bir asistanısın. Aşağıda verilen SUNUM İÇERİĞİ'ni (Context) kullanarak soruyu cevapla.
    
    Kurallar:
    1. Kullanıcı soruyu hangi dilde sorduysa, cevabı da O DİLDE ver. (Örn: Soru Türkçe ise cevap Türkçe, İngilizce ise İngilizce).
    2. Cevabı verirken hangi sayfadan bilgi aldığını belirt (Örn: [Sayfa 1] veya [Page 1]) Sayfalardan bilgi almadıysan belirtme.
    3. Eğer bilgi metinde yoksa, sorulan dilde "Bilgi bulunamadı" anlamına gelen nazik bir cümle kur, asla bilgi uydurma.
    """

    user_prompt = f"""
    SORU (USER QUESTION): {question}

    SUNUM İÇERİĞİ (CONTEXT):
    {retrieved_context}
    """

    client = get_client()
    response = await client.chat.completions.create(
        model="gpt-4o-mini", 
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.3
    )

    return {
        "answer": response.choices[0].message.content,
        "sources": [s.page_number for s in top_slides],
        "context_used": retrieved_context
    }