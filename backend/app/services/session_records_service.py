from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from jose import JWTError, jwt
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.logger import logger
from app.models.presentation import PresentationSession, SessionType, User


async def resolve_user_id_from_token(token: Optional[str]) -> Optional[int]:
    if not token:
        return None

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        parsed_user_id = int(user_id)
    except (JWTError, ValueError, TypeError):
        return None

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User.id).where(User.id == parsed_user_id))
        existing_id = result.scalar_one_or_none()
        return existing_id


async def start_live_session(
    presentation_id: int,
    user_id: Optional[int],
    current_slide: int = 1,
) -> Optional[int]:
    try:
        async with AsyncSessionLocal() as db:
            session = PresentationSession(
                user_id=user_id,
                session_uuid=str(uuid4()),
                presentation_id=presentation_id,
                session_type=SessionType.LIVE,
                current_slide_index=current_slide,
            )
            db.add(session)
            await db.commit()
            await db.refresh(session)
            return session.id
    except Exception as exc:
        logger.error(f"Failed to start live session for presentation {presentation_id}: {exc}")
        return None


async def end_live_session(session_id: int) -> None:
    ended_at = datetime.now(timezone.utc)
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(PresentationSession).where(PresentationSession.id == session_id))
            session = result.scalar_one_or_none()
            if session is None or session.ended_at is not None:
                return

            session.ended_at = ended_at
            start_time = session.started_at
            if start_time is not None:
                if start_time.tzinfo is None:
                    start_time = start_time.replace(tzinfo=timezone.utc)
                duration_seconds = int((ended_at - start_time).total_seconds())
                session.duration_seconds = max(0, duration_seconds)

            await db.commit()
    except Exception as exc:
        logger.error(f"Failed to end live session {session_id}: {exc}")