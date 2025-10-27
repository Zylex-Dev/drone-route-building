"""
Модель пользователя
"""
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from passlib.context import CryptContext
import uuid

from app.database import Base

# Контекст для хэширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class User(Base):
    """Модель пользователя"""
    
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship к миссиям
    missions = relationship("Mission", back_populates="user", cascade="all, delete-orphan")
    
    def set_password(self, plain_password: str) -> None:
        """
        Хэширование и установка пароля
        
        Args:
            plain_password: Пароль в открытом виде
        """
        self.password_hash = pwd_context.hash(plain_password)
    
    def verify_password(self, plain_password: str) -> bool:
        """
        Проверка пароля
        
        Args:
            plain_password: Пароль для проверки
            
        Returns:
            bool: True если пароль корректный
        """
        return pwd_context.verify(plain_password, self.password_hash)
    
    def __repr__(self):
        return f"<User {self.email}>"

