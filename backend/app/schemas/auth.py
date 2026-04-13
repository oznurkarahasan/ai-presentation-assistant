from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict, model_validator
from datetime import date
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None


class MessageResponse(BaseModel):
    msg: str

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

class ForgotPassword(BaseModel):
    email: EmailStr


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    current_password: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)
    password_confirm: Optional[str] = None

    @model_validator(mode='after')
    def validate_password_update_requirements(self):
        if self.password and not self.current_password:
            raise ValueError('Current password is required!')
        return self

    @field_validator('password_confirm')
    @classmethod
    def passwords_match(cls, v: str | None, info):
        password = info.data.get('password')
        if password and not v:
            raise ValueError('Password confirmation is required!')
        if password and v != password:
            raise ValueError('Passwords do not match!')
        return v


class DeleteAccountRequest(BaseModel):
    password: str = Field(..., min_length=8)


class ResetPassword(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)
    new_password_confirm: str

    @field_validator('new_password_confirm')
    @classmethod
    def passwords_match(cls, v: str, info):
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('Passwords do not match!')
        return v