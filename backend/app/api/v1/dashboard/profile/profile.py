from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.v1 import auth
from app.core import security
from app.models.presentation import User
from app.models import presentation as models
from app.schemas import auth as schemas

router = APIRouter()


@router.get("/me", response_model=schemas.UserResponse)
async def get_me(
    current_user: User = Depends(auth.get_current_user),
) -> Any:
    return current_user


@router.patch("/me", response_model=schemas.UserResponse)
async def update_me(
    payload: schemas.UserUpdate,
    current_user: User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(auth.get_db),
) -> Any:
    if payload.email and payload.email != current_user.email:
        result = await db.execute(select(models.User).where(models.User.email == payload.email))
        existing_user = result.scalar_one_or_none()
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=400, detail="This email is already registered.")

    if payload.full_name is not None:
        normalized_full_name = payload.full_name.strip()
        if not normalized_full_name:
            raise HTTPException(status_code=400, detail="Full name cannot be empty.")
        current_user.full_name = normalized_full_name

    if payload.email is not None:
        current_user.email = payload.email

    if payload.password:
        if not payload.current_password or not security.verify_password(payload.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect.",
            )
        current_user.password_hash = security.get_password_hash(payload.password)

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return current_user


@router.delete("/me", response_model=schemas.MessageResponse)
async def delete_me(
    payload: schemas.DeleteAccountRequest,
    current_user: User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(auth.get_db),
) -> Any:
    if not security.verify_password(payload.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong password.",
        )

    await db.delete(current_user)
    await db.commit()

    return {"msg": "Account deleted successfully."}
