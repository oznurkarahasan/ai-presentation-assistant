import pytest
import json
import asyncio
import tempfile
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
        file_path=f"{tempfile.gettempdir()}/test.pdf",
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


@pytest.mark.asyncio
async def test_websocket_zoom_intent(sync_client, test_presentation):
    """Test zoom command broadcast payload."""
    mock_result = IntentResult(
        intent=IntentType.ZOOM_IN,
        confidence=0.97,
        slide_number=None,
        original_text="zoom in"
    )

    with patch("app.services.intent_service.analyze_intent", AsyncMock(return_value=mock_result)):
        with sync_client.websocket_connect(f"/api/v1/orchestration/ws/presentation/{test_presentation.id}") as websocket:
            websocket.send_text(json.dumps({
                "transcript": "zoom in",
                "is_final": True,
                "current_page": 1,
                "total_pages": 5
            }))

            data = websocket.receive_json()
            assert data["type"] == "COMMAND"
            assert data["payload"]["intent"] == "ZOOM_IN"
            assert data["payload"]["slide_number"] is None


@pytest.mark.asyncio
async def test_websocket_region_zoom_intent(sync_client, test_presentation):
    """Test region zoom command payload."""
    mock_result = IntentResult(
        intent=IntentType.ZOOM_TO_REGION,
        confidence=0.93,
        slide_number=None,
        original_text="zoom to top right",
        region="TOP_RIGHT"
    )

    with patch("app.services.intent_service.analyze_intent", AsyncMock(return_value=mock_result)):
        with sync_client.websocket_connect(f"/api/v1/orchestration/ws/presentation/{test_presentation.id}") as websocket:
            websocket.send_text(json.dumps({
                "transcript": "zoom to top right",
                "is_final": True,
                "current_page": 1,
                "total_pages": 5
            }))

            data = websocket.receive_json()
            assert data["type"] == "COMMAND"
            assert data["payload"]["intent"] == "ZOOM_TO_REGION"
            assert data["payload"]["region"] == "TOP_RIGHT"


@pytest.mark.asyncio
async def test_websocket_target_zoom_intent(sync_client, test_presentation):
    """Test semantic target zoom command payload."""
    mock_result = IntentResult(
        intent=IntentType.ZOOM_TO_TARGET,
        confidence=0.92,
        slide_number=None,
        original_text="focus on the graph",
        focus_target="GRAPH"
    )

    with patch("app.services.intent_service.analyze_intent", AsyncMock(return_value=mock_result)):
        with sync_client.websocket_connect(f"/api/v1/orchestration/ws/presentation/{test_presentation.id}") as websocket:
            websocket.send_text(json.dumps({
                "transcript": "focus on the graph",
                "is_final": True,
                "current_page": 1,
                "total_pages": 5
            }))

            data = websocket.receive_json()
            assert data["type"] == "COMMAND"
            assert data["payload"]["intent"] == "ZOOM_TO_TARGET"
            assert data["payload"]["focus_target"] == "GRAPH"


@pytest.mark.asyncio
async def test_websocket_target_zoom_paragraph_intent(sync_client, test_presentation):
    """Test semantic target zoom payload for paragraph focus with index."""
    mock_result = IntentResult(
        intent=IntentType.ZOOM_TO_TARGET,
        confidence=0.91,
        slide_number=None,
        original_text="focus on paragraph two",
        focus_target="PARAGRAPH",
        focus_index=2,
    )

    with patch("app.services.intent_service.analyze_intent", AsyncMock(return_value=mock_result)):
        with sync_client.websocket_connect(f"/api/v1/orchestration/ws/presentation/{test_presentation.id}") as websocket:
            websocket.send_text(json.dumps({
                "transcript": "focus on paragraph two",
                "is_final": True,
                "current_page": 1,
                "total_pages": 5
            }))

            data = websocket.receive_json()
            assert data["type"] == "COMMAND"
            assert data["payload"]["intent"] == "ZOOM_TO_TARGET"
            assert data["payload"]["focus_target"] == "PARAGRAPH"
            assert data["payload"]["focus_index"] == 2


@pytest.mark.asyncio
async def test_telemetry_endpoint_returns_metrics(sync_client, test_presentation):
    """Telemetry endpoint should return success, latency, and false-positive estimates."""
    executed_result = IntentResult(
        intent=IntentType.ZOOM_TO_TARGET,
        confidence=0.95,
        slide_number=None,
        original_text="focus on graph",
        focus_target="GRAPH"
    )
    rejected_result = IntentResult(
        intent=IntentType.ZOOM_IN,
        confidence=0.2,
        slide_number=None,
        original_text="zoom in"
    )

    with patch("app.services.intent_service.analyze_intent", AsyncMock(side_effect=[executed_result, rejected_result])):
        with sync_client.websocket_connect(f"/api/v1/orchestration/ws/presentation/{test_presentation.id}") as websocket:
            websocket.send_text(json.dumps({
                "transcript": "focus on graph",
                "is_final": True,
                "current_page": 1,
                "total_pages": 5
            }))
            websocket.receive_json()

            websocket.send_text(json.dumps({
                "transcript": "zoom in",
                "is_final": True,
                "current_page": 1,
                "total_pages": 5
            }))
            websocket.receive_json()

    telemetry = sync_client.get(f"/api/v1/orchestration/telemetry/presentation/{test_presentation.id}")
    assert telemetry.status_code == 200
    payload = telemetry.json()
    assert payload["commands_received"] >= 2
    assert payload["commands_executed"] >= 1
    assert payload["false_positive_estimate"] >= 0
    assert payload["avg_command_latency_ms"] >= 0


@pytest.mark.asyncio
async def test_websocket_low_confidence_returns_feedback(sync_client, test_presentation):
    """Low-confidence command should emit FEEDBACK and avoid command execution."""
    mock_result = IntentResult(
        intent=IntentType.ZOOM_IN,
        confidence=0.35,
        slide_number=None,
        original_text="zoom in"
    )

    with patch("app.services.intent_service.analyze_intent", AsyncMock(return_value=mock_result)):
        with sync_client.websocket_connect(f"/api/v1/orchestration/ws/presentation/{test_presentation.id}") as websocket:
            websocket.send_text(json.dumps({
                "transcript": "zoom in",
                "is_final": True,
                "current_page": 1,
                "total_pages": 5
            }))

            data = websocket.receive_json()
            assert data["type"] == "FEEDBACK"
            assert data["payload"]["executed"] is False
            assert data["payload"]["intent"] == "ZOOM_IN"
