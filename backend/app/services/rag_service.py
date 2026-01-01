from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.presentation import Slide
from app.services import embedding_service
from app.core.config import settings
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

async def ask_question(
    db: AsyncSession, 
    presentation_id: int, 
    question: str
) -> dict:
    """
    1. Converts the question into a vector.
    2. Finds the 3 most relevant slides.
    3. Sends context to GPT-4o-mini with instructions to match the user's language.
    """
    
    # 1. Embedding
    query_vector = await embedding_service.create_embedding(question)

    # 2. Vector Search
    stmt = select(Slide).filter(
        Slide.presentation_id == presentation_id
    ).order_by(
        Slide.embedding.l2_distance(query_vector)
    ).limit(3)
    
    result = await db.execute(stmt)
    top_slides = result.scalars().all()

    if not top_slides:
        return {
            "answer": "Üzgünüm, dokümanda bu konuyla ilgili bilgi bulamadım. / Sorry, I couldn't find relevant info in the document.",
            "sources": []
        }

    # Context & Prompt
    context_text = "\n\n".join([f"[Sayfa {s.page_number}]: {s.content_text}" for s in top_slides])

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
    {context_text}
    """

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
        "context_used": context_text
    }