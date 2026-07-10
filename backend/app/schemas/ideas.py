from pydantic import BaseModel, Field


class TopicIdeasRequest(BaseModel):
    context: str = Field(..., min_length=2, max_length=300)
    audience: str = Field(..., min_length=2, max_length=200)
    purpose: str = Field(..., min_length=2, max_length=200)
    num_ideas: int = Field(default=5, ge=1, le=10)
    language: str = Field(default="en", max_length=10)


class TopicIdea(BaseModel):
    title: str
    description: str
    angle: str


class TopicIdeasResponse(BaseModel):
    ideas: list[TopicIdea]


class ChatMessageItem(BaseModel):
    role: str
    content: str


class TopicChatRequest(BaseModel):
    topic: TopicIdea
    messages: list[ChatMessageItem] = Field(default_factory=list)
    context: str = ""
    audience: str = ""
    purpose: str = ""
    language: str = "en"


class TopicChatResponse(BaseModel):
    message: str
