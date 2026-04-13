from typing import Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
	question: str = Field(
		...,
		min_length=1,
		max_length=500,
		description="Question about the presentation (max 500 characters)",
	)
	current_slide: Optional[int] = Field(
		None,
		description="The current slide being viewed",
	)


class ChatResponse(BaseModel):
	answer: str
	sources: list[int]
