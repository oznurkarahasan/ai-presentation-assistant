import os
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# 1. Set environment variables BEFORE any imports
os.environ["DATABASE_URL"] = "postgresql+asyncpg://user:pass@localhost/dbname"
os.environ["OPENAI_API_KEY"] = "sk-dummy-key-for-testing"
os.environ["TESTING"] = "True"
os.environ["ENABLE_LOGGING"] = "False"  # Disable logging in tests

# 2. Setup testing engine
DATABASE_URL = "sqlite+aiosqlite:///./test_temp.db"
engine = create_async_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False},
    echo=False
)
TestingSessionLocal = async_sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine, 
    class_=AsyncSession,
    expire_on_commit=False
)

# 3. Import app and dependencies AFTER environment setup
from main import app
from app.api.v1.auth import get_db
from app.core.database import Base

# Event loop fixture for session scope
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_database():
    """Setup and teardown database for each test"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(scope="function")
async def db_session():
    """Provide a database session for tests"""
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()  # Rollback any uncommitted changes
        await session.close()

@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    """Provide an HTTP client for tests"""
    async def override_get_db():
        yield db_session
    
    # Override all get_db dependencies
    app.dependency_overrides[get_db] = override_get_db
    
    try:
        from app.api.v1.presentations import get_db as pres_get_db
        from app.api.v1.chat import get_db as chat_get_db
        app.dependency_overrides[pres_get_db] = override_get_db
        app.dependency_overrides[chat_get_db] = override_get_db
    except ImportError:
        pass  # These modules might not exist yet

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def sync_client(db_session):
    """Provide a synchronous TestClient for WebSocket testing"""
    from fastapi.testclient import TestClient
    
    def override_get_db():
        # Note: TestClient is sync, but we want it to work with our async db session
        # This is tricky because TestClient will call dependencies in a thread/sync mode.
        # However, for WebSockets, the most important part is the connection.
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as tc:
        yield tc
    
    app.dependency_overrides.clear()

def pytest_sessionfinish(session, exitstatus):
    """Cleanup after all tests are done"""
    asyncio.run(engine.dispose())
