"""
API endpoints для авторизации
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.services.auth_service import (
    register_user,
    authenticate_user,
    create_access_token,
    get_current_user
)
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Регистрация нового пользователя
    
    - **email**: Email пользователя (уникальный)
    - **password**: Пароль (минимум 8 символов, должен содержать буквы и цифры)
    
    Returns:
        Token: JWT токен и данные пользователя
    """
    # Создание пользователя
    user = await register_user(user_data.email, user_data.password, db)
    
    # Генерация токена
    access_token = create_access_token(user.id)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Вход в систему
    
    - **email**: Email пользователя
    - **password**: Пароль
    
    Returns:
        Token: JWT токен и данные пользователя
    """
    # Аутентификация
    user = await authenticate_user(credentials.email, credentials.password, db)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Генерация токена
    access_token = create_access_token(user.id)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Получение данных текущего пользователя
    
    Требует JWT токен в заголовке Authorization: Bearer <token>
    
    Returns:
        UserResponse: Данные текущего пользователя
    """
    return UserResponse.model_validate(current_user)

