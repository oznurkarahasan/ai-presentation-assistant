from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PlannerEventCreate(BaseModel):
    presentation_id: int = Field(..., ge=1)
    scheduled_date: date
    scheduled_time: str = Field(..., description="24-hour format HH:MM")
    reminder_time: Optional[str] = Field(default=None, description="24-hour format HH:MM")
    note: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("scheduled_time")
    @classmethod
    def validate_scheduled_time(cls, value: str) -> str:
        return _validate_24h_time(value)

    @field_validator("reminder_time")
    @classmethod
    def validate_reminder_time(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return _validate_24h_time(value)


class PlannerEventResponse(BaseModel):
    id: int
    presentation_id: int
    presentation_title: str
    scheduled_date: date
    scheduled_time: str
    reminder_time: Optional[str]
    note: Optional[str]
    created_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


def _validate_24h_time(value: str) -> str:
    value = value.strip()
    parts = value.split(":")
    if len(parts) != 2:
        raise ValueError("Time must be in HH:MM format")

    try:
        hour = int(parts[0])
        minute = int(parts[1])
    except ValueError as exc:
        raise ValueError("Time must contain valid numbers") from exc

    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        raise ValueError("Time must be in 24-hour range")

    return f"{hour:02d}:{minute:02d}"
