from pydantic import BaseModel, Field


class PresentationAnalysisRequest(BaseModel):
    language: str = Field(default="en", max_length=10)


class SlideFeedback(BaseModel):
    page_number: int
    strength: str
    improvement: str


class PresentationAnalysisResponse(BaseModel):
    overall_score: int = Field(..., ge=0, le=100)
    readability_score: int = Field(..., ge=0, le=100)
    structure_score: int = Field(..., ge=0, le=100)
    visual_balance_score: int = Field(..., ge=0, le=100)
    summary: str
    slide_feedback: list[SlideFeedback]
