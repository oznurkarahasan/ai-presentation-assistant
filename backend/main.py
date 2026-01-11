from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text  

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import auth, presentations, chat

# Lifespan event to create tables and extensions
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        # Ensure the vector extension is created
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

app.add_middleware(
    #cors settings
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Adjust as needed for your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_STR + "/auth", tags=["Authentication"]) # Authentication routes modules seperated
app.include_router(presentations.router, prefix=settings.API_V1_STR + "/presentations", tags=["Presentations"])
app.include_router(chat.router, prefix=settings.API_V1_STR + "/chat", tags=["Chat"])
@app.get("/")
async def root():
    return {"message": "AI Presentation Assistant API is running successfully."}