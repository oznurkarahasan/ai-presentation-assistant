import asyncio
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import and_, select

from app.core.database import AsyncSessionLocal
from app.core.logger import logger
from app.models.presentation import PlannerEvent, Presentation, User
from app.services.email_service import send_presentation_reminder_email

POLL_INTERVAL_SECONDS = 60
BATCH_SIZE = 100


def _format_in_user_timezone(value: datetime, user_timezone: str | None) -> str:
    tz_name = user_timezone or "UTC"
    try:
        tz = ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        tz = timezone.utc
        tz_name = "UTC"

    # PostgreSQL returns timezone-aware values, but keep this fallback for safety.
    aware_value = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    local_value = aware_value.astimezone(tz)
    return local_value.strftime('%Y-%m-%d %H:%M')


async def process_due_reminders_once() -> None:
    """Find due planner reminders and send one email per event."""
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        stmt = (
            select(PlannerEvent, User, Presentation)
            .join(User, User.id == PlannerEvent.user_id)
            .join(Presentation, Presentation.id == PlannerEvent.presentation_id)
            .where(
                and_(
                    PlannerEvent.reminder_at.is_not(None),
                    PlannerEvent.reminder_sent_at.is_(None),
                    PlannerEvent.reminder_at <= now,
                )
            )
            .limit(BATCH_SIZE)
        )

        result = await db.execute(stmt)
        due_rows = result.all()

        if not due_rows:
            return

        for event, user, presentation in due_rows:
            scheduled_text = _format_in_user_timezone(event.scheduled_at, user.timezone) if event.scheduled_at else "N/A"
            is_sent = await send_presentation_reminder_email(
                to_email=user.email,
                presentation_title=presentation.title,
                scheduled_at_text=scheduled_text,
                note=event.note,
            )
            if is_sent:
                event.reminder_sent_at = now

        await db.commit()
        logger.info(f"Processed {len(due_rows)} due planner reminder(s)")


async def run_reminder_worker() -> None:
    """Background worker that periodically checks due reminders."""
    logger.info("Planner reminder worker started")
    try:
        while True:
            try:
                await process_due_reminders_once()
            except Exception as exc:
                logger.error(f"Planner reminder worker cycle failed: {exc}", exc_info=True)
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
    except asyncio.CancelledError:
        logger.info("Planner reminder worker stopped")
        raise
