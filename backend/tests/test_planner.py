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


@pytest.mark.asyncio
async def test_update_planner_event_success(client: AsyncClient, db_session):
    user = User(
        email="update-user@example.com",
        password_hash=security.get_password_hash("testpassword123"),
        full_name="Update User",
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
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_response = await client.post(
        "/api/v1/planner/events",
        json={
            "presentation_id": presentation.id,
            "scheduled_date": "2026-04-12",
            "scheduled_time": "14:30",
            "reminder_time": "14:00",
        },
        headers=headers,
    )
    assert create_response.status_code == 201
    event_id = create_response.json()["id"]

    update_response = await client.put(
        f"/api/v1/planner/events/{event_id}",
        json={
            "presentation_id": presentation.id,
            "scheduled_date": "2026-04-15",
            "scheduled_time": "09:00",
            "reminder_time": "08:30",
            "note": "Rescheduled",
        },
        headers=headers,
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["scheduled_date"] == "2026-04-15"
    assert updated["scheduled_time"] == "09:00"
    assert updated["reminder_time"] == "08:30"
    assert updated["note"] == "Rescheduled"

    list_response = await client.get("/api/v1/planner/events?date=2026-04-15", headers=headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1


@pytest.mark.asyncio
async def test_update_planner_event_other_user_gets_404(client: AsyncClient, db_session):
    owner = User(
        email="update-owner@example.com",
        password_hash=security.get_password_hash("testpassword123"),
        full_name="Owner",
    )
    attacker = User(
        email="update-attacker@example.com",
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
        title="Owner Deck",
        original_filename="deck.pdf",
        file_type=FileType.PDF,
        file_path="uploaded_files/deck.pdf",
        file_size_bytes=1024,
        slide_count=5,
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)

    owner_login = await client.post(
        "/api/v1/auth/login",
        data={"username": owner.email, "password": "testpassword123"},
    )
    owner_headers = {"Authorization": f"Bearer {owner_login.json()['access_token']}"}

    create_response = await client.post(
        "/api/v1/planner/events",
        json={
            "presentation_id": presentation.id,
            "scheduled_date": "2026-04-12",
            "scheduled_time": "14:30",
        },
        headers=owner_headers,
    )
    event_id = create_response.json()["id"]

    attacker_login = await client.post(
        "/api/v1/auth/login",
        data={"username": attacker.email, "password": "testpassword123"},
    )
    attacker_headers = {"Authorization": f"Bearer {attacker_login.json()['access_token']}"}

    update_response = await client.put(
        f"/api/v1/planner/events/{event_id}",
        json={
            "presentation_id": presentation.id,
            "scheduled_date": "2026-04-20",
            "scheduled_time": "10:00",
        },
        headers=attacker_headers,
    )
    assert update_response.status_code == 404
    assert update_response.json()["detail"] == "Planner event not found"


@pytest.mark.asyncio
async def test_update_planner_event_rejects_reassignment_to_unowned_presentation(client: AsyncClient, db_session):
    """A user must not be able to point their own event at a presentation they don't own."""
    owner = User(
        email="reassign-owner@example.com",
        password_hash=security.get_password_hash("testpassword123"),
        full_name="Owner",
    )
    other_user = User(
        email="reassign-other@example.com",
        password_hash=security.get_password_hash("testpassword123"),
        full_name="Other",
    )
    db_session.add(owner)
    db_session.add(other_user)
    await db_session.commit()
    await db_session.refresh(owner)
    await db_session.refresh(other_user)

    own_presentation = Presentation(
        user_id=owner.id,
        title="Own Deck",
        original_filename="own.pdf",
        file_type=FileType.PDF,
        file_path="uploaded_files/own.pdf",
        file_size_bytes=1024,
        slide_count=5,
    )
    other_presentation = Presentation(
        user_id=other_user.id,
        title="Someone Else's Deck",
        original_filename="other.pdf",
        file_type=FileType.PDF,
        file_path="uploaded_files/other.pdf",
        file_size_bytes=1024,
        slide_count=5,
    )
    db_session.add(own_presentation)
    db_session.add(other_presentation)
    await db_session.commit()
    await db_session.refresh(own_presentation)
    await db_session.refresh(other_presentation)

    login_response = await client.post(
        "/api/v1/auth/login",
        data={"username": owner.email, "password": "testpassword123"},
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    create_response = await client.post(
        "/api/v1/planner/events",
        json={
            "presentation_id": own_presentation.id,
            "scheduled_date": "2026-04-12",
            "scheduled_time": "14:30",
        },
        headers=headers,
    )
    event_id = create_response.json()["id"]

    update_response = await client.put(
        f"/api/v1/planner/events/{event_id}",
        json={
            "presentation_id": other_presentation.id,
            "scheduled_date": "2026-04-20",
            "scheduled_time": "10:00",
        },
        headers=headers,
    )
    assert update_response.status_code == 404
    assert update_response.json()["detail"] == "Presentation not found"


@pytest.mark.asyncio
async def test_delete_planner_event_reminder_success(client: AsyncClient, db_session):
    user = User(
        email="reminder-delete@example.com",
        password_hash=security.get_password_hash("testpassword123"),
        full_name="Reminder User",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    presentation = Presentation(
        user_id=user.id,
        title="Deck",
        original_filename="deck.pdf",
        file_type=FileType.PDF,
        file_path="uploaded_files/deck.pdf",
        file_size_bytes=1024,
        slide_count=5,
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)

    login_response = await client.post(
        "/api/v1/auth/login",
        data={"username": user.email, "password": "testpassword123"},
    )
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    create_response = await client.post(
        "/api/v1/planner/events",
        json={
            "presentation_id": presentation.id,
            "scheduled_date": "2026-04-12",
            "scheduled_time": "14:30",
            "reminder_time": "14:00",
        },
        headers=headers,
    )
    event_id = create_response.json()["id"]
    assert create_response.json()["reminder_time"] == "14:00"

    delete_reminder_response = await client.delete(
        f"/api/v1/planner/events/{event_id}/reminder", headers=headers
    )
    assert delete_reminder_response.status_code == 204

    list_response = await client.get("/api/v1/planner/events?date=2026-04-12", headers=headers)
    events = list_response.json()
    assert len(events) == 1
    assert events[0]["reminder_time"] is None


@pytest.mark.asyncio
async def test_delete_planner_event_reminder_other_user_gets_404(client: AsyncClient, db_session):
    owner = User(
        email="reminder-idor-owner@example.com",
        password_hash=security.get_password_hash("testpassword123"),
        full_name="Owner",
    )
    attacker = User(
        email="reminder-idor-attacker@example.com",
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
        title="Deck",
        original_filename="deck.pdf",
        file_type=FileType.PDF,
        file_path="uploaded_files/deck.pdf",
        file_size_bytes=1024,
        slide_count=5,
    )
    db_session.add(presentation)
    await db_session.commit()
    await db_session.refresh(presentation)

    owner_login = await client.post(
        "/api/v1/auth/login",
        data={"username": owner.email, "password": "testpassword123"},
    )
    owner_headers = {"Authorization": f"Bearer {owner_login.json()['access_token']}"}

    create_response = await client.post(
        "/api/v1/planner/events",
        json={
            "presentation_id": presentation.id,
            "scheduled_date": "2026-04-12",
            "scheduled_time": "14:30",
            "reminder_time": "14:00",
        },
        headers=owner_headers,
    )
    event_id = create_response.json()["id"]

    attacker_login = await client.post(
        "/api/v1/auth/login",
        data={"username": attacker.email, "password": "testpassword123"},
    )
    attacker_headers = {"Authorization": f"Bearer {attacker_login.json()['access_token']}"}

    delete_response = await client.delete(
        f"/api/v1/planner/events/{event_id}/reminder", headers=attacker_headers
    )
    assert delete_response.status_code == 404
