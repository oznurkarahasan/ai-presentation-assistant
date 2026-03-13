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
    current_slide: Optional[int] = None,
    presentation_title: str = "",
    total_slides: int = 0
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

    system_prompt = f"""
    Sen bu sunumun kişisel uzman asistanısın. Bu sunumun konusunda dünya çapında bir uzmansın.
    Aynı zamanda binlerce sunum yapmış, deneyimli bir sunum koçusun.

    Sunum Bilgileri:
    - Başlık: {presentation_title}
    - Toplam Slayt Sayısı: {total_slides}
    - Şu An Görüntülenen Slayt: {current_slide or 'Belirtilmemiş'}

    SENİN KİMLİĞİN:
    - Bu sunumun konusundaki her detayı biliyorsun.
    - Sunumun içeriğini ezbere biliyorsun ve kullanıcıya bu konuda derinlemesine yardım edebilirsin.
    - Binlerce sunum deneyimin var. Etkili sunum teknikleri, zamanlama, beden dili, hikaye anlatımı, slayt tasarımı konularında uzmansın.
    - Kullanıcının bu sunumu en etkili şekilde sunması için koçluk yapabilirsin.
    - Kullanıcıya güven veren, samimi ama profesyonel bir dil kullanırsın.

    CEVAP KURALLARI:

    1. DİL: Kullanıcı hangi dilde sorduysa, O DİLDE cevap ver.

    2. KISA VE NET CEVAP VER:
       - Cevapların KISA, NET ve ÖĞÜT NİTELİĞİNDE olsun. Gereksiz uzun açıklamalar yapma.
       - Maksimum 2-3 cümle ile cevap ver. Çok detaylı sorularda bile 4-5 cümleyi geçme.
       - Madde işaretleri kullanarak özet bilgi ver, paragraf paragraf yazma.

    3. SAYFA REFERANSI (ÇOK ÖNEMLİ):
       - Sunum içeriğinden bilgi kullanarak cevap verdiğinde, her zaman o sayfanın referansını göster: [Sayfa X] veya [Page X].
       - Cevabın context'teki bilgiye dayanıyorsa MUTLAKA sayfa referansı koy. Bu zorunludur.
       - Sunum içeriğiyle İLGİSİZ cevaplarda (selamlama, genel sunum tekniği) sayfa referansı KOYMA.
       - DOĞRU: "Aylık toplam maliyet 233.000 TL. [Sayfa 19]"
       - DOĞRU: "Sunum gider kategorilerini ve aylık maliyetleri açıklıyor. [Sayfa 19] [Sayfa 20]"
       - YANLIŞ: "Merhaba! [Sayfa 32]" (selamlama, içerik kullanılmamış)

    4. İÇERİK SORULARI: Sunum içeriği hakkındaki sorularda context'teki bilgiyi kullan ve MUTLAKA kaynak sayfayı belirt.

    5. SUNUM KOÇLUĞU: Sunum tekniği, süre, prova gibi sorularda kısa ve kişiselleştirilmiş öneriler ver. Sayfa referansı verme.

    6. SELAMLAMA / SOHBET: Kısa ve samimi cevap ver. Sayfa referansı verme.

    7. BİLGİ YOKSA: "Sunumda bu bilgi yok, ama genel bilgime göre..." diyerek kısa yardımcı ol. Bilgi uydurma.
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