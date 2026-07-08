"""
Unit + integration tests for JWT token handling and password hashing
(app.core.security), plus the get_current_user auth dependency.

These are the primitives every protected endpoint relies on, so bugs here
compromise every route in the API at once.
"""
import pytest
from datetime import timedelta
from jose import jwt
from httpx import AsyncClient

from app.core import security
from app.core.config import settings
from app.models.presentation import User


# --- Password hashing --------------------------------------------------

def test_password_hash_is_not_plaintext():
    hashed = security.get_password_hash("mypassword123")
    assert hashed != "mypassword123"
    assert hashed.startswith("$2b$")  # bcrypt prefix


def test_password_hash_verifies_correct_password():
    hashed = security.get_password_hash("mypassword123")
    assert security.verify_password("mypassword123", hashed) is True


def test_password_hash_rejects_wrong_password():
    hashed = security.get_password_hash("mypassword123")
    assert security.verify_password("wrongpassword", hashed) is False


def test_password_hash_uses_random_salt():
    """Same password hashed twice must produce different hashes (salted)."""
    hash1 = security.get_password_hash("samepassword")
    hash2 = security.get_password_hash("samepassword")
    assert hash1 != hash2
    assert security.verify_password("samepassword", hash1)
    assert security.verify_password("samepassword", hash2)


# --- JWT token creation --------------------------------------------------

def test_create_access_token_contains_subject_and_expiry():
    token = security.create_access_token(subject=42)
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == "42"
    assert "exp" in payload


def test_create_access_token_respects_custom_expiry():
    token = security.create_access_token(subject=1, expires_delta=timedelta(minutes=5))
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert "exp" in payload


def test_token_signed_with_wrong_key_is_rejected():
    token = jwt.encode({"sub": "1"}, "a-completely-different-secret", algorithm=settings.ALGORITHM)
    with pytest.raises(jwt.JWTError):
        jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


# --- get_current_user dependency (via protected endpoint) ---------------

@pytest.mark.asyncio
async def test_protected_endpoint_without_token_returns_401(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_with_garbage_token_returns_401(client: AsyncClient):
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_with_expired_token_returns_401(client: AsyncClient, db_session):
    user = User(
        email="expired-token@example.com",
        password_hash=security.get_password_hash("testpassword123"),
        full_name="Expired Token User",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    expired_token = security.create_access_token(subject=user.id, expires_delta=timedelta(seconds=-1))

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_token_for_deleted_user_returns_401(client: AsyncClient, db_session):
    user = User(
        email="soon-deleted@example.com",
        password_hash=security.get_password_hash("testpassword123"),
        full_name="Soon Deleted",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = security.create_access_token(subject=user.id)

    await db_session.delete(user)
    await db_session.commit()

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_with_token_missing_subject_returns_401(client: AsyncClient):
    token = jwt.encode({"foo": "bar"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
