"""
Integration tests for the /api/v1/presentations endpoints.

Focus areas (previously untested):
- Upload validation: extension spoofing, oversized/empty files, magic-byte
  mismatch, path-traversal filenames.
- Authorization: every presentation-scoped endpoint must 404 (not leak
  existence via 403) when accessed by a user who doesn't own the resource.
- AI-state / export-pptx: only apply to AI-generated presentations.
"""
import os
import tempfile
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


def _valid_ai_state(title: str = "My AI Deck") -> dict:
    return {
        "metadata": {
            "title": title,
            "theme": "modern",
            "primary_color": "#111111",
            "accent_color": "#f97316",
            "font_family": "Inter",
        },
        "slides": [
            {
                "title": "Introduction",
                "content_type": "bullet",
                "items": ["Point one", "Point two"],
                "image": None,
                "speaker_note": "Say hello",
            }
        ],
    }


# --- Upload validation ------------------------------------------------------

@pytest.mark.asyncio
async def test_upload_rejects_invalid_extension(client: AsyncClient, db_session):
    _, token = await _create_user_and_token(db_session, client, "upload-ext@example.com")
    response = await client.post(
        "/api/v1/presentations/upload",
        files={"file": ("resume.txt", b"hello world", "text/plain")},
        headers=_auth_headers(token),
    )
    assert response.status_code == 400
    assert "Only PDF and PPTX" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_rejects_empty_file(client: AsyncClient, db_session):
    _, token = await _create_user_and_token(db_session, client, "upload-empty@example.com")
    response = await client.post(
        "/api/v1/presentations/upload",
        files={"file": ("deck.pdf", b"", "application/pdf")},
        headers=_auth_headers(token),
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_upload_rejects_oversized_file(client: AsyncClient, db_session, monkeypatch):
    _, token = await _create_user_and_token(db_session, client, "upload-oversized@example.com")
    monkeypatch.setattr("app.api.v1.presentations.MAX_FILE_SIZE", 10)

    content = b"%PDF-1.4\n" + b"x" * 100
    response = await client.post(
        "/api/v1/presentations/upload",
        files={"file": ("deck.pdf", content, "application/pdf")},
        headers=_auth_headers(token),
    )
    assert response.status_code == 400
    assert "exceeds limit" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_rejects_content_that_does_not_match_extension(client: AsyncClient, db_session):
    """A `.pdf` filename whose bytes are not actually a PDF (extension spoofing)
    must be rejected by magic-byte inspection, not just the extension check."""
    _, token = await _create_user_and_token(db_session, client, "upload-spoof@example.com")
    response = await client.post(
        "/api/v1/presentations/upload",
        files={"file": ("deck.pdf", b"just plain text pretending to be a pdf", "application/pdf")},
        headers=_auth_headers(token),
    )
    assert response.status_code == 400
    assert "Invalid file type" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_requires_authentication(client: AsyncClient):
    response = await client.post(
        "/api/v1/presentations/upload",
        files={"file": ("deck.pdf", b"%PDF-1.4\n", "application/pdf")},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_upload_pdf_success(client: AsyncClient, db_session, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    _, token = await _create_user_and_token(db_session, client, "upload-success@example.com")
    content = b"%PDF-1.4\n%fake-but-magic-bytes-valid\n" + b"filler" * 50

    with patch(
        "app.services.pdf_service.extract_text_from_pdf",
        AsyncMock(return_value=(["Slide 1 text", "Slide 2 text"], "landscape", 1.777)),
    ), patch(
        "app.services.embedding_service.create_embeddings_batch",
        AsyncMock(return_value=[[0.0] * 1536, [0.0] * 1536]),
    ):
        response = await client.post(
            "/api/v1/presentations/upload",
            files={"file": ("deck.pdf", content, "application/pdf")},
            headers=_auth_headers(token),
        )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "success"
    assert data["pages"] == 2
    assert "id" in data


@pytest.mark.asyncio
async def test_upload_sanitizes_path_traversal_filename(client: AsyncClient, db_session, tmp_path, monkeypatch):
    """A malicious filename must never let the saved file escape uploaded_files/."""
    monkeypatch.chdir(tmp_path)
    _, token = await _create_user_and_token(db_session, client, "upload-traversal@example.com")
    content = b"%PDF-1.4\n" + b"filler" * 20

    with patch(
        "app.services.pdf_service.extract_text_from_pdf",
        AsyncMock(return_value=(["Slide 1"], "landscape", 1.777)),
    ), patch(
        "app.services.embedding_service.create_embeddings_batch",
        AsyncMock(return_value=[[0.0] * 1536]),
    ):
        response = await client.post(
            "/api/v1/presentations/upload",
            files={"file": ("../../../../etc/passwd.pdf", content, "application/pdf")},
            headers=_auth_headers(token),
        )

    assert response.status_code == 201
    presentation_id = response.json()["id"]

    from sqlalchemy import select
    stmt = select(Presentation).where(Presentation.id == presentation_id)
    result = await db_session.execute(stmt)
    presentation = result.scalar_one()

    assert ".." not in presentation.file_path
    normalized = os.path.normpath(presentation.file_path)
    assert normalized.startswith("uploaded_files" + os.sep) or normalized == "uploaded_files"
    assert os.path.exists(presentation.file_path)

    os.remove(presentation.file_path)


# --- Ownership / IDOR checks --------------------------------------------

@pytest.mark.asyncio
async def test_get_presentation_owner_can_access(client: AsyncClient, db_session):
    owner, token = await _create_user_and_token(db_session, client, "get-owner@example.com")
    presentation = Presentation(
        user_id=owner.id,
        title="Owner Deck",
        original_filename="deck.pdf",
        file_type=FileType.PDF,
        file_path="uploaded_files/owner-deck.pdf",
        file_size_bytes=1024,
        slide_count=3,
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)

    response = await client.get(
        f"/api/v1/presentations/{presentation.id}", headers=_auth_headers(token)
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Owner Deck"


@pytest.mark.asyncio
async def test_get_presentation_other_user_gets_404(client: AsyncClient, db_session):
    owner, _ = await _create_user_and_token(db_session, client, "idor-owner@example.com")
    _, attacker_token = await _create_user_and_token(db_session, client, "idor-attacker@example.com")

    presentation = Presentation(
        user_id=owner.id,
        title="Private Deck",
        original_filename="private.pdf",
        file_type=FileType.PDF,
        file_path="uploaded_files/private.pdf",
        file_size_bytes=1024,
        slide_count=3,
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)

    response = await client.get(
        f"/api/v1/presentations/{presentation.id}", headers=_auth_headers(attacker_token)
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_title_success(client: AsyncClient, db_session):
    owner, token = await _create_user_and_token(db_session, client, "title-owner@example.com")
    presentation = Presentation(
        user_id=owner.id,
        title="Old Title",
        original_filename="deck.pdf",
        file_type=FileType.PDF,
        file_path="uploaded_files/deck.pdf",
        file_size_bytes=1024,
        slide_count=3,
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)

    response = await client.patch(
        f"/api/v1/presentations/{presentation.id}",
        json={"title": "New Title"},
        headers=_auth_headers(token),
    )
    assert response.status_code == 200
    assert response.json()["title"] == "New Title"


@pytest.mark.asyncio
async def test_update_title_rejects_blank_title(client: AsyncClient, db_session):
    owner, token = await _create_user_and_token(db_session, client, "title-blank@example.com")
    presentation = Presentation(
        user_id=owner.id,
        title="Old Title",
        original_filename="deck.pdf",
        file_type=FileType.PDF,
        file_path="uploaded_files/deck.pdf",
        file_size_bytes=1024,
        slide_count=3,
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)

    response = await client.patch(
        f"/api/v1/presentations/{presentation.id}",
        json={"title": "   "},
        headers=_auth_headers(token),
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_update_title_other_user_gets_404(client: AsyncClient, db_session):
    owner, _ = await _create_user_and_token(db_session, client, "title-idor-owner@example.com")
    _, attacker_token = await _create_user_and_token(db_session, client, "title-idor-attacker@example.com")

    presentation = Presentation(
        user_id=owner.id,
        title="Old Title",
        original_filename="deck.pdf",
        file_type=FileType.PDF,
        file_path="uploaded_files/deck.pdf",
        file_size_bytes=1024,
        slide_count=3,
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)

    response = await client.patch(
        f"/api/v1/presentations/{presentation.id}",
        json={"title": "Hijacked Title"},
        headers=_auth_headers(attacker_token),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_presentation_removes_row_and_file(client: AsyncClient, db_session):
    owner, token = await _create_user_and_token(db_session, client, "delete-owner@example.com")

    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp_file.write(b"%PDF-1.4\n")
    tmp_file.close()

    presentation = Presentation(
        user_id=owner.id,
        title="To Delete",
        original_filename="delete.pdf",
        file_type=FileType.PDF,
        file_path=tmp_file.name,
        file_size_bytes=1024,
        slide_count=1,
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)

    response = await client.delete(
        f"/api/v1/presentations/{presentation.id}", headers=_auth_headers(token)
    )
    assert response.status_code == 204
    assert not os.path.exists(tmp_file.name)

    get_response = await client.get(
        f"/api/v1/presentations/{presentation.id}", headers=_auth_headers(token)
    )
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_delete_presentation_other_user_gets_404(client: AsyncClient, db_session):
    owner, _ = await _create_user_and_token(db_session, client, "delete-idor-owner@example.com")
    _, attacker_token = await _create_user_and_token(db_session, client, "delete-idor-attacker@example.com")

    presentation = Presentation(
        user_id=owner.id,
        title="Not Yours",
        original_filename="deck.pdf",
        file_type=FileType.PDF,
        file_path="uploaded_files/not-yours.pdf",
        file_size_bytes=1024,
        slide_count=1,
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)

    response = await client.delete(
        f"/api/v1/presentations/{presentation.id}", headers=_auth_headers(attacker_token)
    )
    assert response.status_code == 404


# --- AI-state endpoints ------------------------------------------------

@pytest.mark.asyncio
async def test_ai_state_roundtrip(client: AsyncClient, db_session):
    owner, token = await _create_user_and_token(db_session, client, "ai-state-owner@example.com")
    state = _valid_ai_state()
    presentation = Presentation(
        user_id=owner.id,
        title=state["metadata"]["title"],
        original_filename="ai-deck.json",
        file_type=FileType.AI,
        file_path="generated/ai/deck.json",
        file_size_bytes=0,
        slide_count=1,
        is_ai_generated=True,
        ai_content_json=state,
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)

    get_response = await client.get(
        f"/api/v1/presentations/{presentation.id}/ai-state", headers=_auth_headers(token)
    )
    assert get_response.status_code == 200
    assert get_response.json()["metadata"]["title"] == state["metadata"]["title"]

    updated_state = _valid_ai_state(title="Updated Title")
    put_response = await client.put(
        f"/api/v1/presentations/{presentation.id}/ai-state",
        json=updated_state,
        headers=_auth_headers(token),
    )
    assert put_response.status_code == 200
    assert put_response.json()["metadata"]["title"] == "Updated Title"

    await db_session.refresh(presentation)
    assert presentation.title == "Updated Title"


@pytest.mark.asyncio
async def test_ai_state_not_available_for_regular_upload(client: AsyncClient, db_session):
    owner, token = await _create_user_and_token(db_session, client, "ai-state-regular@example.com")
    presentation = Presentation(
        user_id=owner.id,
        title="Regular Deck",
        original_filename="deck.pdf",
        file_type=FileType.PDF,
        file_path="uploaded_files/deck.pdf",
        file_size_bytes=1024,
        slide_count=3,
        is_ai_generated=False,
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)

    response = await client.get(
        f"/api/v1/presentations/{presentation.id}/ai-state", headers=_auth_headers(token)
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_ai_state_other_user_gets_404(client: AsyncClient, db_session):
    owner, _ = await _create_user_and_token(db_session, client, "ai-state-idor-owner@example.com")
    _, attacker_token = await _create_user_and_token(db_session, client, "ai-state-idor-attacker@example.com")

    state = _valid_ai_state()
    presentation = Presentation(
        user_id=owner.id,
        title=state["metadata"]["title"],
        original_filename="ai-deck.json",
        file_type=FileType.AI,
        file_path="generated/ai/deck.json",
        file_size_bytes=0,
        slide_count=1,
        is_ai_generated=True,
        ai_content_json=state,
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)

    response = await client.get(
        f"/api/v1/presentations/{presentation.id}/ai-state", headers=_auth_headers(attacker_token)
    )
    assert response.status_code == 404


# --- Export PPTX ---------------------------------------------------------

@pytest.mark.asyncio
async def test_export_pptx_success_sanitizes_unicode_filename(client: AsyncClient, db_session):
    owner, token = await _create_user_and_token(db_session, client, "export-owner@example.com")
    state = _valid_ai_state(title="Türkçe Başlık Örneği")
    presentation = Presentation(
        user_id=owner.id,
        title=state["metadata"]["title"],
        original_filename="ai-deck.json",
        file_type=FileType.AI,
        file_path="generated/ai/deck.json",
        file_size_bytes=0,
        slide_count=1,
        is_ai_generated=True,
        ai_content_json=state,
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)

    with patch(
        "app.services.pptx_service.generate_pptx_from_state",
        lambda state: b"FAKE_PPTX_BYTES",
    ):
        response = await client.get(
            f"/api/v1/presentations/{presentation.id}/export-pptx", headers=_auth_headers(token)
        )

    assert response.status_code == 200
    assert response.content == b"FAKE_PPTX_BYTES"
    content_disposition = response.headers["content-disposition"]
    assert content_disposition.isascii()
    assert "filename*=UTF-8''" in content_disposition


@pytest.mark.asyncio
async def test_export_pptx_not_available_for_regular_upload(client: AsyncClient, db_session):
    owner, token = await _create_user_and_token(db_session, client, "export-regular@example.com")
    presentation = Presentation(
        user_id=owner.id,
        title="Regular Deck",
        original_filename="deck.pdf",
        file_type=FileType.PDF,
        file_path="uploaded_files/deck.pdf",
        file_size_bytes=1024,
        slide_count=3,
        is_ai_generated=False,
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)

    response = await client.get(
        f"/api/v1/presentations/{presentation.id}/export-pptx", headers=_auth_headers(token)
    )
    assert response.status_code == 404


# --- Auth required across the board -------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", [
    ("GET", "/api/v1/presentations/"),
    ("GET", "/api/v1/presentations/1"),
    ("PATCH", "/api/v1/presentations/1"),
    ("DELETE", "/api/v1/presentations/1"),
    ("GET", "/api/v1/presentations/1/ai-state"),
    ("GET", "/api/v1/presentations/1/export-pptx"),
])
async def test_presentation_endpoints_require_authentication(client: AsyncClient, method, path):
    response = await client.request(method, path, json={"title": "x"} if method == "PATCH" else None)
    assert response.status_code == 401
