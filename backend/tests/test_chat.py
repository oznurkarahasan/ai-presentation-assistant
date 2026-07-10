"""
Tests for POST /api/v1/chat/{presentation_id} (RAG chat over a presentation).

Follows the same ownership-check pattern as presentations.py: a user must
never be able to chat against a presentation they don't own.
"""
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.core import security
from app.models.presentation import FileType, Presentation, User


async def _create_user_and_token(db_session, client: AsyncClient, email: str) -> tuple[User, str]:
    user = User(
        email=email,
        password_hash=security.get_password_hash("testpassword123"),
        full_name="Test User",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    login_response = await client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": "testpassword123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    return user, token


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _create_presentation(db_session, user_id: int, title: str = "Deck") -> Presentation:
    presentation = Presentation(
        user_id=user_id,
        title=title,
        original_filename="deck.pdf",
        file_type=FileType.PDF,
        file_path="uploaded_files/deck.pdf",
        file_size_bytes=1024,
        slide_count=5,
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)
    return presentation


@pytest.mark.asyncio
async def test_chat_requires_authentication(client: AsyncClient):
    response = await client.post(
        "/api/v1/chat/1",
        json={"question": "What is slide 2 about?"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_chat_success(client: AsyncClient, db_session):
    owner, token = await _create_user_and_token(db_session, client, "chat-owner@example.com")
    presentation = await _create_presentation(db_session, owner.id)

    mock_response = {"answer": "Slide 2 covers the market opportunity.", "sources": [2]}
    with patch(
        "app.services.rag_service.ask_question",
        AsyncMock(return_value=mock_response),
    ):
        response = await client.post(
            f"/api/v1/chat/{presentation.id}",
            json={"question": "What is slide 2 about?", "current_slide": 2},
            headers=_auth_headers(token),
        )

    assert response.status_code == 200
    data = response.json()
    assert data["answer"] == mock_response["answer"]
    assert data["sources"] == [2]


@pytest.mark.asyncio
async def test_chat_nonexistent_presentation_returns_404(client: AsyncClient, db_session):
    _, token = await _create_user_and_token(db_session, client, "chat-missing@example.com")
    response = await client.post(
        "/api/v1/chat/999999",
        json={"question": "Anything?"},
        headers=_auth_headers(token),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_chat_other_user_presentation_returns_404(client: AsyncClient, db_session):
    """IDOR check: a user must not be able to chat against another user's presentation."""
    owner, _ = await _create_user_and_token(db_session, client, "chat-idor-owner@example.com")
    _, attacker_token = await _create_user_and_token(db_session, client, "chat-idor-attacker@example.com")
    presentation = await _create_presentation(db_session, owner.id, title="Private Deck")

    with patch(
        "app.services.rag_service.ask_question",
        AsyncMock(return_value={"answer": "leaked", "sources": []}),
    ) as mock_ask:
        response = await client.post(
            f"/api/v1/chat/{presentation.id}",
            json={"question": "What is this about?"},
            headers=_auth_headers(attacker_token),
        )

    assert response.status_code == 404
    mock_ask.assert_not_called()


@pytest.mark.asyncio
async def test_chat_rejects_blank_question(client: AsyncClient, db_session):
    owner, token = await _create_user_and_token(db_session, client, "chat-blank@example.com")
    presentation = await _create_presentation(db_session, owner.id)

    response = await client.post(
        f"/api/v1/chat/{presentation.id}",
        json={"question": ""},
        headers=_auth_headers(token),
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_service_error_returns_500(client: AsyncClient, db_session):
    owner, token = await _create_user_and_token(db_session, client, "chat-error@example.com")
    presentation = await _create_presentation(db_session, owner.id)

    with patch(
        "app.services.rag_service.ask_question",
        AsyncMock(side_effect=RuntimeError("OpenAI blew up")),
    ):
        response = await client.post(
            f"/api/v1/chat/{presentation.id}",
            json={"question": "What is slide 2 about?"},
            headers=_auth_headers(token),
        )

    assert response.status_code == 500
