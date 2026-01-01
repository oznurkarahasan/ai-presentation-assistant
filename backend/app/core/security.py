from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")
# Password hashing context using bcrypt algorithm.
def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    """
    Generates a time-based JWT Token with the user ID (subject). 
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Compares the password entered by the user (plain) with the hash in the database.
    Returns True if correct, False if incorrect.
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    It takes the user's password and hashes it (encrypts it) to store it in the database.
    """
    return pwd_context.hash(password)