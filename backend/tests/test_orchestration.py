import pytest
import json
import asyncio
from unittest.mock import AsyncMock, patch
from app.api.v1.orchestration import manager
from app.services.intent_service import IntentType, IntentResult
from app.models.presentation import Presentation, PresentationSession, FileType, SessionType
from sqlalchemy import select

@pytest.fixture
async def test_presentation(db_session):
    """Create a dummy presentation for testing"""
    presentation = Presentation(
        title="Test Presentation",
        original_filename="test.pdf",
        file_type=FileType.PDF,
        file_path="/tmp/test.pdf",
        file_size_bytes=1024,
        slide_count=5
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)
    return presentation

@pytest.fixture
async def test_session(db_session, test_presentation):
    """Create an active presentation session"""
    session = PresentationSession(
        session_uuid="test-uuid-123",
        presentation_id=test_presentation.id,
        session_type=SessionType.LIVE,
        current_slide_index=1
    )
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)
    return session

@pytest.mark.asyncio
async def test_websocket_connection(sync_client, test_presentation):
    """Test that we can connect to the orchestration WebSocket"""
    with sync_client.websocket_connect(f"/api/v1/orchestration/ws/presentation/{test_presentation.id}") as websocket:
        # If we reached here without error, connection was successful
        assert websocket is not None

@pytest.mark.asyncio
async def test_websocket_broadcast_transcript(sync_client, test_presentation):
    """Test that transcripts are broadcasted to all connections"""
    with sync_client.websocket_connect(f"/api/v1/orchestration/ws/presentation/{test_presentation.id}") as ws1:
        with sync_client.websocket_connect(f"/api/v1/orchestration/ws/presentation/{test_presentation.id}") as ws2:
            # Send an interim transcript from ws1
            ws1.send_text(json.dumps({
                "transcript": "Hello world",
                "is_final": False,
                "current_page": 1,
                "total_pages": 5
            }))
            
            # ws2 should receive the transcript broadcast
            data = ws2.receive_json()
            assert data["type"] == "TRANSCRIPT"
            assert data["payload"]["transcript"] == "Hello world"
            assert data["payload"]["is_final"] is False

@pytest.mark.asyncio
@pytest.mark.timeout(10)
async def test_websocket_intent_persistence(sync_client, test_presentation, test_session, db_session):
    """Test intent analysis and slide state persistence"""
    # Mock result for intent analysis
    mock_result = IntentResult(
        intent=IntentType.NEXT_SLIDE,
        confidence=0.95,
        slide_number=2,
        original_text="go to the next slide"
    )
    
    from tests.conftest import TestingSessionLocal
    
    with patch("app.services.intent_service.analyze_intent", AsyncMock(return_value=mock_result)):
        with patch("app.api.v1.orchestration.AsyncSessionLocal", TestingSessionLocal):
            with sync_client.websocket_connect(f"/api/v1/orchestration/ws/presentation/{test_presentation.id}") as websocket:
                # Send a final transcript
                websocket.send_text(json.dumps({
                    "transcript": "go to the next slide",
                    "is_final": True,
                    "current_page": 1,
                    "total_pages": 5
                }))
                
                # Receive the command broadcast
                data = websocket.receive_json()
                assert data["type"] == "COMMAND"
                
                # Close websocket explicitly to ensure background task completes or at least stops interfering
                websocket.close()
            
            # small delay for background persistence
            await asyncio.sleep(0.5)
            
            # Use query to verify DB changes
            async with TestingSessionLocal() as session:
                stmt = select(PresentationSession).where(PresentationSession.id == test_session.id)
                result = await session.execute(stmt)
                updated_session = result.scalar_one()
                assert updated_session.current_slide_index == 1

@pytest.mark.asyncio
async def test_websocket_jump_intent(sync_client, test_presentation, test_session):
    """Test jump to slide command"""
    mock_result = IntentResult(
        intent=IntentType.JUMP_TO_SLIDE,
        confidence=0.99,
        slide_number=4,
        original_text="jump to slide four"
    )
    
    with patch("app.services.intent_service.analyze_intent", AsyncMock(return_value=mock_result)):
        with sync_client.websocket_connect(f"/api/v1/orchestration/ws/presentation/{test_presentation.id}") as websocket:
            websocket.send_text(json.dumps({
                "transcript": "jump to slide four",
                "is_final": True,
                "current_page": 1,
                "total_pages": 5
            }))
            
            data = websocket.receive_json()
            assert data["type"] == "COMMAND"
            assert data["payload"]["intent"] == "JUMP_TO_SLIDE"
            assert data["payload"]["slide_number"] == 4
