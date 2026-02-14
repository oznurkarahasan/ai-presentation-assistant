from typing import Any
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import jwt, JWTError
from app.models.presentation import User
from app.core.database import AsyncSessionLocal
from app.core import security
from app.services import email_service
from app.schemas.auth import ForgotPassword, ResetPassword
from app.core.logger import logger
from app.models import presentation as models
from app.schemas import auth as schemas
from app.core.config import settings
# Define the API router login register endpoints
router = APIRouter()
#async database dependency
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def get_current_user(
    token: str = Depends(security.oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
        
    return user
@router.post("/register", response_model=schemas.UserResponse)
async def register(
    user_in: schemas.UserCreate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    New user registration with email and password.
    """
    result = await db.execute(select(models.User).where(models.User.email == user_in.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="This email is already registered."
        )

    user = models.User(
        email=user_in.email,
        password_hash=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        birth_date=user_in.birth_date
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user

@router.post("/login", response_model=schemas.Token)
# Oauth2PasswordRequestForm has 'username' and 'password' fields
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Email and password used for user authentication.
    Note: OAuth2PasswordRequestForm has 'username' field for email.
    """
    result = await db.execute(select(models.User).where(models.User.email == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = security.create_access_token(subject=user.id)
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=schemas.UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get current user profile information.
    """
    return current_user


@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPassword,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Generates a password-reset token and sends a reset link to the given email.
    Returns a generic success message regardless of whether the email exists.
    """
    result = await db.execute(select(models.User).where(models.User.email == payload.email))
    user = result.scalar_one_or_none()

    if user:
        expires = timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
        token = security.create_access_token(subject=user.id, expires_delta=expires)
        background_tasks.add_task(email_service.send_password_reset_email, user.email, token)
    else:
        logger.warning(f"Password reset requested for unknown email: {payload.email}")

    return {"msg": "If that email exists, a password reset link has been sent."}


@router.post("/reset-password")
async def reset_password(
    payload: ResetPassword,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Resets the user's password using a valid token and new password."""
    try:
        data = jwt.decode(payload.token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = data.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")

    result = await db.execute(select(models.User).where(models.User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = security.get_password_hash(payload.new_password)
    db.add(user)
    await db.commit()

    return {"msg": "Password has been reset successfully."}