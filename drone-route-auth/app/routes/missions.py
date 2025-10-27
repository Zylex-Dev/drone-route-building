"""
API endpoints для управления миссиями
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping

from app.database import get_db
from app.schemas.mission import (
    MissionCreate,
    MissionUpdate,
    MissionResponse,
    MissionListResponse
)
from app.services.auth_service import get_current_user
from app.services.mission_service import (
    create_mission,
    get_user_missions,
    get_mission_by_id,
    update_mission,
    delete_mission
)
from app.models.user import User

router = APIRouter(prefix="/api/missions", tags=["missions"])


def mission_to_response(mission) -> MissionResponse:
    """
    Конвертация Mission модели в MissionResponse схему
    Преобразование Geometry в GeoJSON
    """
    # Конвертация territory из Geometry в GeoJSON
    territory_shape = to_shape(mission.territory)
    territory_geojson = mapping(territory_shape)
    
    return MissionResponse(
        id=mission.id,
        user_id=mission.user_id,
        name=mission.name,
        description=mission.description,
        status=mission.status,
        created_at=mission.created_at,
        updated_at=mission.updated_at,
        flight_altitude=mission.flight_altitude,
        desired_overlap=mission.desired_overlap,
        forward_overlap=mission.forward_overlap,
        drone_model=mission.drone_model,
        shooting_type=mission.shooting_type,
        enable_terrain_following=mission.enable_terrain_following,
        territory=territory_geojson,
        route_geojson=mission.route_geojson
    )


@router.post("", response_model=MissionResponse, status_code=status.HTTP_201_CREATED)
async def create_new_mission(
    mission_data: MissionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Создание новой миссии
    
    Требует JWT токен в заголовке Authorization: Bearer <token>
    
    - **name**: Название миссии (обязательно)
    - **description**: Описание миссии (опционально)
    - **territory**: GeoJSON Polygon территории съёмки
    - **route_geojson**: Полный GeoJSON маршрута с метаданными
    - **flight_altitude**: Высота полёта (5-400м)
    - **desired_overlap**: Боковое перекрытие (0.1-0.95)
    - **forward_overlap**: Продольное перекрытие (0.5-0.95)
    - **drone_model**: Модель дрона
    - **enable_terrain_following**: Учёт рельефа
    
    Returns:
        MissionResponse: Созданная миссия
    """
    mission = await create_mission(current_user.id, mission_data, db)
    return mission_to_response(mission)


@router.get("", response_model=MissionListResponse)
async def get_missions(
    limit: int = Query(10, ge=1, le=100, description="Количество миссий на странице"),
    offset: int = Query(0, ge=0, description="Смещение для пагинации"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получение списка миссий текущего пользователя
    
    Требует JWT токен в заголовке Authorization: Bearer <token>
    
    - **limit**: Количество миссий на странице (1-100, по умолчанию 10)
    - **offset**: Смещение для пагинации (по умолчанию 0)
    
    Returns:
        MissionListResponse: Список миссий и общее количество
    """
    missions, total = await get_user_missions(current_user.id, db, limit, offset)
    
    return MissionListResponse(
        total=total,
        missions=[mission_to_response(m) for m in missions]
    )


@router.get("/{mission_id}", response_model=MissionResponse)
async def get_mission(
    mission_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получение конкретной миссии по ID
    
    Требует JWT токен в заголовке Authorization: Bearer <token>
    
    - **mission_id**: UUID миссии
    
    Returns:
        MissionResponse: Данные миссии
    """
    mission = await get_mission_by_id(mission_id, current_user.id, db)
    return mission_to_response(mission)


@router.put("/{mission_id}", response_model=MissionResponse)
async def update_existing_mission(
    mission_id: UUID,
    update_data: MissionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Обновление миссии
    
    Требует JWT токен в заголовке Authorization: Bearer <token>
    
    - **mission_id**: UUID миссии
    - Все поля опциональны, обновляются только переданные
    
    Returns:
        MissionResponse: Обновлённая миссия
    """
    mission = await update_mission(mission_id, current_user.id, update_data, db)
    return mission_to_response(mission)


@router.delete("/{mission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_mission(
    mission_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Удаление миссии
    
    Требует JWT токен в заголовке Authorization: Bearer <token>
    
    - **mission_id**: UUID миссии
    
    Returns:
        204 No Content при успешном удалении
    """
    await delete_mission(mission_id, current_user.id, db)
    return None

