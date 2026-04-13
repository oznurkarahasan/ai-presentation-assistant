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
