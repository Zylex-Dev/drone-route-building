"""
Сервис авторизации и аутентификации
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.database import get_db
from app.config import settings

# OAuth2 схема для получения токена из заголовка Authorization
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def register_user(email: str, password: str, db: AsyncSession) -> User:
    """
    Регистрация нового пользователя
    
    Args:
        email: Email пользователя
        password: Пароль в открытом виде
        db: Сессия БД
        
    Returns:
        User: Созданный пользователь
        
    Raises:
        HTTPException: Если email уже зарегистрирован
    """
    # Проверка существования пользователя
    result = await db.execute(select(User).where(User.email == email))
    existing_user = result.scalars().first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже зарегистрирован"
        )
    
    # Создание нового пользователя
    user = User(email=email)
    user.set_password(password)
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user


async def authenticate_user(email: str, password: str, db: AsyncSession) -> Optional[User]:
    """
    Аутентификация пользователя
    
    Args:
        email: Email пользователя
        password: Пароль для проверки
        db: Сессия БД
        
    Returns:
        User | None: Пользователь если credentials корректны, иначе None
    """
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    
    if not user:
        return None
    
    if not user.verify_password(password):
        return None
    
    return user


def create_access_token(user_id: str) -> str:
    """
    Создание JWT токена
    
    Args:
        user_id: ID пользователя
        
    Returns:
        str: JWT токен
    """
    expire = datetime.utcnow() + timedelta(days=settings.JWT_EXPIRE_DAYS)
    
    to_encode = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.utcnow()
    }
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt


async def verify_token(token: str, db: AsyncSession) -> User:
    """
    Верификация JWT токена и получение пользователя
    
    Args:
        token: JWT токен
        db: Сессия БД
        
    Returns:
        User: Пользователь
        
    Raises:
        HTTPException: Если токен невалиден или пользователь не найден
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось валидировать токен",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    # Получение пользователя из БД
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency для получения текущего пользователя из токена
    Используется в защищённых endpoints
    
    Args:
        token: JWT токен из заголовка Authorization
        db: Сессия БД
        
    Returns:
        User: Текущий пользователь
    """
    return await verify_token(token, db)

