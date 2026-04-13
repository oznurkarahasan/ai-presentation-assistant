from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PresentationTitleUpdateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)


class PresentationListItemResponse(BaseModel):
    id: int
    title: str
    file_name: str
    file_path: str
    file_type: str
    slide_count: Optional[int]
    status: Optional[str]
    created_at: Optional[datetime]


class PresentationSlideResponse(BaseModel):
    page_number: int
    content_text: str


class PresentationDetailResponse(BaseModel):
    id: int
    title: str
    file_path: str
    file_type: str
    pdf_preview_path: Optional[str]
    slide_count: Optional[int]
    total_pages: Optional[int]
    status: Optional[str]
    orientation: str
    aspect_ratio: float
    slides: Optional[list[PresentationSlideResponse]] = None


class PresentationUploadResponse(BaseModel):
    id: int
    title: str
    pages: int
    status: str
    pdf_preview_path: Optional[str]


class SessionPresentationSummaryResponse(BaseModel):
    id: int
    title: str
    slide_count: Optional[int]


class RecentSessionItemResponse(BaseModel):
    id: int
    session_type: str
    duration_seconds: int
    duration_minutes: int
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    presentation: SessionPresentationSummaryResponse
