"""
Pydantic схемы для пользователей
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional
import uuid


class UserCreate(BaseModel):
    """Схема для создания пользователя (регистрация)"""
    email: EmailStr = Field(..., description="Email пользователя")
    password: str = Field(..., min_length=8, max_length=100, description="Пароль (минимум 8 символов)")
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Валидация пароля"""
        if len(v) < 8:
            raise ValueError('Пароль должен содержать минимум 8 символов')
        if not any(c.isdigit() for c in v):
            raise ValueError('Пароль должен содержать хотя бы одну цифру')
        if not any(c.isalpha() for c in v):
            raise ValueError('Пароль должен содержать хотя бы одну букву')
        return v


class UserLogin(BaseModel):
    """Схема для входа пользователя"""
    email: EmailStr = Field(..., description="Email пользователя")
    password: str = Field(..., description="Пароль")


class UserResponse(BaseModel):
    """Схема ответа с данными пользователя"""
    id: uuid.UUID
    email: str
    created_at: datetime
    
    model_config = {"from_attributes": True}


class Token(BaseModel):
    """Схема JWT токена"""
    access_token: str = Field(..., description="JWT токен доступа")
    token_type: str = Field(default="bearer", description="Тип токена")
    user: UserResponse = Field(..., description="Данные пользователя")

