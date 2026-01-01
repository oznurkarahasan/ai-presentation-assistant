from sqlalchemy.ext.asyncio import AsyncSession
from app.models.presentation import Presentation, Slide

async def save_presentation_with_slides(
    db: AsyncSession, 
    user_id: int, 
    title: str, 
    file_path: str,
    slide_texts: list[str], 
    embeddings: list[list[float]]
):
    try:
        
        new_presentation = Presentation(
            title=title,
            file_path=file_path,
            user_id=user_id,
            status="analyzed" 
        )
        db.add(new_presentation)
        await db.flush()

        if len(slide_texts) != len(embeddings):
             raise ValueError("The number of characters and vectors do not match!")
        
        slide_objects = [
            Slide(
                presentation_id=new_presentation.id, 
                page_number=i + 1,
                content_text=text,
                embedding=vector 
            )
            for i, (text, vector) in enumerate(zip(slide_texts, embeddings))
        ]
        db.add_all(slide_objects)
        await db.commit()
        await db.refresh(new_presentation) 

        return new_presentation

    except Exception as e:
        await db.rollback()
        raise e