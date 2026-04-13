import pytest
from httpx import AsyncClient

from app.models.presentation import FileType, Presentation, User
from app.core import security


@pytest.mark.asyncio
async def test_create_list_delete_planner_event(client: AsyncClient, db_session):
    user = User(
        email="planner-user@example.com",
        password_hash=security.get_password_hash("testpassword123"),
        full_name="Planner User",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    presentation = Presentation(
        user_id=user.id,
        title="Roadmap Q2",
        original_filename="roadmap.pdf",
        file_type=FileType.PDF,
        file_path="uploaded_files/roadmap.pdf",
        file_size_bytes=1024,
        slide_count=12,
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)

    login_response = await client.post(
        "/api/v1/auth/login",
        data={"username": user.email, "password": "testpassword123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_response = await client.post(
        "/api/v1/planner/events",
        json={
            "presentation_id": presentation.id,
            "scheduled_date": "2026-04-12",
            "scheduled_time": "14:30",
            "reminder_time": "14:00",
            "note": "Dry run before live presentation",
        },
        headers=headers,
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["presentation_id"] == presentation.id
    assert created["scheduled_time"] == "14:30"
    assert created["reminder_time"] == "14:00"

    list_response = await client.get("/api/v1/planner/events?date=2026-04-12", headers=headers)
    assert list_response.status_code == 200
    events = list_response.json()
    assert len(events) == 1
    assert events[0]["presentation_title"] == "Roadmap Q2"

    event_id = created["id"]
    delete_response = await client.delete(f"/api/v1/planner/events/{event_id}", headers=headers)
    assert delete_response.status_code == 204

    list_after_delete = await client.get("/api/v1/planner/events?date=2026-04-12", headers=headers)
    assert list_after_delete.status_code == 200
    assert list_after_delete.json() == []


@pytest.mark.asyncio
async def test_create_planner_event_requires_owned_presentation(client: AsyncClient, db_session):
    owner = User(
        email="owner@example.com",
        password_hash=security.get_password_hash("testpassword123"),
        full_name="Owner",
    )
    attacker = User(
        email="attacker@example.com",
        password_hash=security.get_password_hash("testpassword123"),
        full_name="Attacker",
    )
    db_session.add(owner)
    db_session.add(attacker)
    await db_session.commit()
    await db_session.refresh(owner)
    await db_session.refresh(attacker)

    presentation = Presentation(
        user_id=owner.id,
        title="Private Deck",
        original_filename="private.pdf",
        file_type=FileType.PDF,
        file_path="uploaded_files/private.pdf",
        file_size_bytes=2048,
        slide_count=8,
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)

    login_response = await client.post(
        "/api/v1/auth/login",
        data={"username": attacker.email, "password": "testpassword123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_response = await client.post(
        "/api/v1/planner/events",
        json={
            "presentation_id": presentation.id,
            "scheduled_date": "2026-04-13",
            "scheduled_time": "10:00",
        },
        headers=headers,
    )
    assert create_response.status_code == 404
    assert create_response.json()["detail"] == "Presentation not found"
