"""
Главный файл FastAPI приложения
Инициализация и настройка сервиса авторизации
"""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db
from app.routes import auth_router, missions_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events для инициализации и завершения
    """
    # Startup
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} starting...")
    await init_db()
    print("✅ Database initialized")
    
    yield
    
    # Shutdown
    print("👋 Shutting down...")


# Создание FastAPI приложения
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API для регистрации, авторизации и управления миссиями дронов",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(auth_router)
app.include_router(missions_router)


# Обработчик ошибок валидации
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Кастомный обработчик ошибок валидации Pydantic
    """
    errors = []
    for error in exc.errors():
        field = " -> ".join([str(loc) for loc in error["loc"]])
        message = error["msg"]
        errors.append(f"{field}: {message}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Ошибка валидации данных",
            "errors": errors
        }
    )


# Обработчик общих ошибок
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Обработчик неперехваченных исключений
    """
    if settings.DEBUG:
        # В режиме отладки показываем полную ошибку
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Внутренняя ошибка сервера",
                "error": str(exc),
                "type": type(exc).__name__
            }
        )
    else:
        # В production скрываем детали
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Внутренняя ошибка сервера"}
        )


# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """
    Корневой endpoint для проверки работоспособности
    """
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs"
    }


# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check():
    """
    Health check для мониторинга
    """
    return {
        "status": "healthy",
        "service": settings.APP_NAME
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )

