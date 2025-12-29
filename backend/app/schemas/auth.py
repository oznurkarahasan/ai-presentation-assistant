from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from datetime import date
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="User's full name")
    email: EmailStr = Field(..., description="Valid email address")
    birth_date: Optional[date] = Field(None, description="Birth date for age analysis")
    password: str = Field(..., min_length=8, description="Password with at least 8 characters")
    password_confirm: str = Field(..., description="Password confirmation field")

    @field_validator('password_confirm')
    @classmethod
    def passwords_match(cls, v: str, info):
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('Passwords do not match!')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    birth_date: Optional[date] = None
    is_active: bool = True
    
    model_config = ConfigDict(from_attributes=True)