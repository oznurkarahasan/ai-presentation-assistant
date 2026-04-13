from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1 import auth
from app.core.database import AsyncSessionLocal
from app.core.exceptions import ValidationError
from app.models.presentation import Presentation, PresentationSession
from app.schemas.presentations import RecentSessionItemResponse

router = APIRouter()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


@router.get("/sessions/recent", response_model=list[RecentSessionItemResponse])
async def list_recent_sessions(
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    stmt = (
        select(PresentationSession, Presentation)
        .join(Presentation, Presentation.id == PresentationSession.presentation_id)
        .where(PresentationSession.user_id == current_user.id)
        .order_by(PresentationSession.started_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.all()

    response = []
    for session, presentation in rows:
        duration_seconds = int(session.duration_seconds or 0)
        duration_minutes = int(duration_seconds // 60)
        response.append(
            {
                "id": session.id,
                "session_type": session.session_type.value if hasattr(session.session_type, "value") else str(session.session_type),
                "duration_seconds": duration_seconds,
                "duration_minutes": duration_minutes,
                "started_at": session.started_at.isoformat() if session.started_at else None,
                "ended_at": session.ended_at.isoformat() if session.ended_at else None,
                "presentation": {
                    "id": presentation.id,
                    "title": presentation.title,
                    "slide_count": presentation.slide_count,
                },
            }
        )

    return response


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    stmt = (
        select(PresentationSession)
        .join(Presentation, Presentation.id == PresentationSession.presentation_id)
        .where(PresentationSession.id == session_id)
        .where(Presentation.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()

    if session is None:
        raise ValidationError("Session not found")

    await db.delete(session)
    await db.commit()
    return None
