import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    """Test user registration"""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "testpassword123",
            "password_confirm": "testpassword123",
            "full_name": "Test User",
            "birth_date": "1990-01-01"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data

@pytest.mark.asyncio
async def test_login_user(client: AsyncClient):
    """Test user login after registration"""
    # First register
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "login@example.com",
            "password": "testpassword123",
            "password_confirm": "testpassword123",
            "full_name": "Login User",
            "birth_date": "1990-01-01"
        }
    )
    
    # Then login
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "login@example.com",
            "password": "testpassword123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    """Test login with invalid credentials"""
    response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "nonexistent@example.com",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Wrong email or password."


@pytest.mark.asyncio
async def test_update_me(client: AsyncClient):
    """Test updating current user profile fields"""
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "profile@example.com",
            "password": "testpassword123",
            "password_confirm": "testpassword123",
            "full_name": "Profile User",
            "birth_date": "1990-01-01"
        }
    )

    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "profile@example.com",
            "password": "testpassword123"
        }
    )
    token = login_response.json()["access_token"]

    update_response = await client.patch(
        "/api/v1/auth/me",
        json={
            "full_name": "Updated User",
            "email": "updated@example.com",
            "current_password": "testpassword123",
            "password": "newpassword123",
            "password_confirm": "newpassword123"
        },
        headers={"Authorization": f"Bearer {token}"}
    )

    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["full_name"] == "Updated User"
    assert updated["email"] == "updated@example.com"

    relogin_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "updated@example.com",
            "password": "newpassword123"
        }
    )
    assert relogin_response.status_code == 200


@pytest.mark.asyncio
async def test_update_me_wrong_current_password(client: AsyncClient):
    """Test password update fails when current password is wrong"""
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "profile-wrong-current@example.com",
            "password": "testpassword123",
            "password_confirm": "testpassword123",
            "full_name": "Profile Wrong Current",
            "birth_date": "1990-01-01"
        }
    )

    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "profile-wrong-current@example.com",
            "password": "testpassword123"
        }
    )
    token = login_response.json()["access_token"]

    update_response = await client.patch(
        "/api/v1/auth/me",
        json={
            "current_password": "wrongpassword123",
            "password": "newpassword123",
            "password_confirm": "newpassword123"
        },
        headers={"Authorization": f"Bearer {token}"}
    )

    assert update_response.status_code == 401
    assert update_response.json()["detail"] == "Current password is incorrect."

    relogin_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "profile-wrong-current@example.com",
            "password": "testpassword123"
        }
    )
    assert relogin_response.status_code == 200


@pytest.mark.asyncio
async def test_delete_me_success(client: AsyncClient):
    """Test deleting current user account with correct password"""
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "delete-success@example.com",
            "password": "testpassword123",
            "password_confirm": "testpassword123",
            "full_name": "Delete Success",
            "birth_date": "1990-01-01"
        }
    )

    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "delete-success@example.com",
            "password": "testpassword123"
        }
    )
    token = login_response.json()["access_token"]

    delete_response = await client.request(
        "DELETE",
        "/api/v1/auth/me",
        json={"password": "testpassword123"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert delete_response.status_code == 200

    relogin_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "delete-success@example.com",
            "password": "testpassword123"
        }
    )
    assert relogin_response.status_code == 401


@pytest.mark.asyncio
async def test_delete_me_wrong_password(client: AsyncClient):
    """Test deleting current user account with wrong password"""
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "delete-fail@example.com",
            "password": "testpassword123",
            "password_confirm": "testpassword123",
            "full_name": "Delete Fail",
            "birth_date": "1990-01-01"
        }
    )

    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "delete-fail@example.com",
            "password": "testpassword123"
        }
    )
    token = login_response.json()["access_token"]

    delete_response = await client.request(
        "DELETE",
        "/api/v1/auth/me",
        json={"password": "wrongpassword123"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert delete_response.status_code == 401


@pytest.mark.asyncio
async def test_email_change_verification_flow(client: AsyncClient, monkeypatch):
    """Test requesting and confirming email change via verification code."""
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "email-change@example.com",
            "password": "testpassword123",
            "password_confirm": "testpassword123",
            "full_name": "Email Change User",
            "birth_date": "1990-01-01"
        }
    )

    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "email-change@example.com",
            "password": "testpassword123"
        }
    )
    token = login_response.json()["access_token"]

    captured = {}

    async def fake_send_email_code(to_email: str, code: str) -> bool:
        captured["to_email"] = to_email
        captured["code"] = code
        return True

    monkeypatch.setattr(
        "app.services.email_service.send_email_change_verification_code",
        fake_send_email_code
    )

    request_response = await client.post(
        "/api/v1/auth/me/email-change/request-code",
        json={"new_email": "updated-by-code@example.com"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert request_response.status_code == 200
    assert captured["to_email"] == "updated-by-code@example.com"
    assert len(captured["code"]) == 6

    confirm_response = await client.post(
        "/api/v1/auth/me/email-change/confirm",
        json={
            "new_email": "updated-by-code@example.com",
            "code": captured["code"]
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert confirm_response.status_code == 200
    assert confirm_response.json()["email"] == "updated-by-code@example.com"


@pytest.mark.asyncio
async def test_email_change_wrong_code(client: AsyncClient, monkeypatch):
    """Test email change confirmation fails when verification code is wrong."""
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "email-change-fail@example.com",
            "password": "testpassword123",
            "password_confirm": "testpassword123",
            "full_name": "Email Change Fail",
            "birth_date": "1990-01-01"
        }
    )

    login_response = await client.post(
        "/api/v1/auth/login",
        data={
            "username": "email-change-fail@example.com",
            "password": "testpassword123"
        }
    )
    token = login_response.json()["access_token"]

    async def fake_send_email_code(to_email: str, code: str) -> bool:
        return True

    monkeypatch.setattr(
        "app.services.email_service.send_email_change_verification_code",
        fake_send_email_code
    )

    request_response = await client.post(
        "/api/v1/auth/me/email-change/request-code",
        json={"new_email": "will-not-update@example.com"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert request_response.status_code == 200

    confirm_response = await client.post(
        "/api/v1/auth/me/email-change/confirm",
        json={
            "new_email": "will-not-update@example.com",
            "code": "999999"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert confirm_response.status_code == 400

    me_response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "email-change-fail@example.com"
