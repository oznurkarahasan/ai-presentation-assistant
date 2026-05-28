from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field, model_validator


class PresentationGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    topic: str = Field(..., min_length=2, max_length=200)
    language: str = Field(..., min_length=2, max_length=12)
    theme: Optional[str] = Field(None, max_length=80)


class SlideImage(BaseModel):
    """Schema for image guidance returned by the LLM."""
    model_config = ConfigDict(extra="ignore")  # Ignore any extra keys from the LLM.

    prompt: str = Field(..., min_length=1, max_length=500)
    style: Optional[str] = Field("modern", max_length=100)
    alt: Optional[str] = Field(None, max_length=200)


class PresentationMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=1, max_length=200)
    theme: str = Field(..., min_length=1, max_length=80)
    primary_color: str = Field(..., min_length=1, max_length=20)
    accent_color: str = Field(..., min_length=1, max_length=20)
    font_family: str = Field(..., min_length=1, max_length=80)


class PresentationSlide(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Always override any LLM-provided id with a backend-generated UUID.
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = Field(..., min_length=1, max_length=200)
    content_type: str = Field(..., min_length=1, max_length=40)
    
    # Keep list[str] to stay compatible with the current prompt structure.
    items: list[str] = Field(default_factory=list)
    
    image: Optional[SlideImage] = None
    speaker_note: Optional[str] = Field(None, max_length=800)

    @model_validator(mode="before")
    @classmethod
    def force_uuid_id(cls, data: object) -> object:
        if isinstance(data, dict):
            data = dict(data)
            data["id"] = str(uuid.uuid4())
            return data
        return data


class PresentationState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    metadata: PresentationMetadata
    slides: list[PresentationSlide] = Field(default_factory=list)


class PresentationGenerateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    presentation_id: int
    state: PresentationState