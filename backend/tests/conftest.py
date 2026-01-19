import os
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# 1. Set environment variables
os.environ["DATABASE_URL"] = "postgresql+asyncpg://user:pass@localhost/dbname"
os.environ["OPENAI_API_KEY"] = "sk-dummy-key-for-testing"
os.environ["TESTING"] = "True"

# 2. Setup testing engine
DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)

# 3. Import app and dependencies
from main import app
from app.api.v1.auth import get_db
from app.core.database import Base

@pytest_asyncio.fixture(scope="function")
async def db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestingSessionLocal() as session:
        yield session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(scope="function")
async def client(db):
    async def override_get_db():
        yield db
    
    app.dependency_overrides[get_db] = override_get_db
    
    from app.api.v1.presentations import get_db as pres_get_db
    from app.api.v1.chat import get_db as chat_get_db
    app.dependency_overrides[pres_get_db] = override_get_db
    app.dependency_overrides[chat_get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
