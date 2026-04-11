from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1 import auth
from app.core.database import AsyncSessionLocal
from app.models.presentation import PlannerEvent, Presentation, User
from app.schemas.planner import PlannerEventCreate, PlannerEventResponse

router = APIRouter()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


def _parse_datetime_parts(day: date, hhmm: str) -> datetime:
    hour, minute = hhmm.split(":")
    return datetime(day.year, day.month, day.day, int(hour), int(minute))


@router.post("/events", response_model=PlannerEventResponse, status_code=status.HTTP_201_CREATED)
async def create_planner_event(
    payload: PlannerEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    stmt = select(Presentation).where(
        and_(
            Presentation.id == payload.presentation_id,
            Presentation.user_id == current_user.id,
        )
    )
    result = await db.execute(stmt)
    presentation = result.scalar_one_or_none()
    if presentation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Presentation not found")

    if payload.timezone:
        user_stmt = select(User).where(User.id == current_user.id)
        user_result = await db.execute(user_stmt)
        db_user = user_result.scalar_one_or_none()
        if db_user is not None:
            db_user.timezone = payload.timezone

    scheduled_at = _parse_datetime_parts(payload.scheduled_date, payload.scheduled_time)
    reminder_at = None
    if payload.reminder_time:
        reminder_day = payload.reminder_date or payload.scheduled_date
        reminder_at = _parse_datetime_parts(reminder_day, payload.reminder_time)

    event = PlannerEvent(
        user_id=current_user.id,
        presentation_id=presentation.id,
        scheduled_at=scheduled_at,
        reminder_at=reminder_at,
        note=payload.note,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    return PlannerEventResponse(
        id=event.id,
        presentation_id=presentation.id,
        presentation_title=presentation.title,
        scheduled_date=event.scheduled_at.date(),
        scheduled_time=event.scheduled_at.strftime("%H:%M"),
        reminder_date=event.reminder_at.date() if event.reminder_at else None,
        reminder_time=event.reminder_at.strftime("%H:%M") if event.reminder_at else None,
        note=event.note,
        created_at=event.created_at,
    )


@router.get("/events", response_model=list[PlannerEventResponse])
async def list_planner_events(
    selected_date: date | None = Query(default=None, alias="date"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    stmt = (
        select(PlannerEvent, Presentation.title)
        .join(Presentation, Presentation.id == PlannerEvent.presentation_id)
        .where(PlannerEvent.user_id == current_user.id)
        .order_by(PlannerEvent.scheduled_at.asc())
    )

    if selected_date:
        day_start = datetime(selected_date.year, selected_date.month, selected_date.day, 0, 0)
        day_end = datetime(selected_date.year, selected_date.month, selected_date.day, 23, 59, 59)
        stmt = stmt.where(
            and_(
                PlannerEvent.scheduled_at >= day_start,
                PlannerEvent.scheduled_at <= day_end,
            )
        )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        PlannerEventResponse(
            id=event.id,
            presentation_id=event.presentation_id,
            presentation_title=title,
            scheduled_date=event.scheduled_at.date(),
            scheduled_time=event.scheduled_at.strftime("%H:%M"),
            reminder_date=event.reminder_at.date() if event.reminder_at else None,
            reminder_time=event.reminder_at.strftime("%H:%M") if event.reminder_at else None,
            note=event.note,
            created_at=event.created_at,
        )
        for event, title in rows
    ]


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_planner_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    stmt = select(PlannerEvent).where(
        and_(PlannerEvent.id == event_id, PlannerEvent.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner event not found")

    await db.delete(event)
    await db.commit()
    return None


@router.put("/events/{event_id}", response_model=PlannerEventResponse)
async def update_planner_event(
    event_id: int,
    payload: PlannerEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    event_stmt = select(PlannerEvent).where(
        and_(PlannerEvent.id == event_id, PlannerEvent.user_id == current_user.id)
    )
    event_result = await db.execute(event_stmt)
    event = event_result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner event not found")

    presentation_stmt = select(Presentation).where(
        and_(Presentation.id == payload.presentation_id, Presentation.user_id == current_user.id)
    )
    presentation_result = await db.execute(presentation_stmt)
    presentation = presentation_result.scalar_one_or_none()
    if presentation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Presentation not found")

    if payload.timezone:
        user_stmt = select(User).where(User.id == current_user.id)
        user_result = await db.execute(user_stmt)
        db_user = user_result.scalar_one_or_none()
        if db_user is not None:
            db_user.timezone = payload.timezone

    scheduled_at = _parse_datetime_parts(payload.scheduled_date, payload.scheduled_time)
    reminder_at = None
    if payload.reminder_time:
        reminder_day = payload.reminder_date or payload.scheduled_date
        reminder_at = _parse_datetime_parts(reminder_day, payload.reminder_time)

    event.presentation_id = presentation.id
    event.scheduled_at = scheduled_at
    event.reminder_at = reminder_at
    event.note = payload.note
    event.reminder_sent_at = None

    await db.commit()
    await db.refresh(event)

    return PlannerEventResponse(
        id=event.id,
        presentation_id=presentation.id,
        presentation_title=presentation.title,
        scheduled_date=event.scheduled_at.date(),
        scheduled_time=event.scheduled_at.strftime("%H:%M"),
        reminder_date=event.reminder_at.date() if event.reminder_at else None,
        reminder_time=event.reminder_at.strftime("%H:%M") if event.reminder_at else None,
        note=event.note,
        created_at=event.created_at,
    )


@router.delete("/events/{event_id}/reminder", status_code=status.HTTP_204_NO_CONTENT)
async def delete_planner_event_reminder(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    stmt = select(PlannerEvent).where(
        and_(PlannerEvent.id == event_id, PlannerEvent.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner event not found")

    event.reminder_at = None
    event.reminder_sent_at = None
    await db.commit()
    return None
