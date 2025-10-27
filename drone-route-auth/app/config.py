"""
Конфигурация приложения
Загрузка переменных окружения и настройки
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Настройки приложения"""
    
    # Database
    DATABASE_URL: str
    
    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 7
    
    # Application
    APP_NAME: str = "Drone Route Auth Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost", "http://localhost:80", "http://localhost:3000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Создаём глобальный экземпляр настроек
settings = Settings()

