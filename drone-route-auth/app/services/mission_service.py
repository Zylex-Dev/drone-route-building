"""
Сервис управления миссиями
"""
from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from geoalchemy2.shape import from_shape
from shapely.geometry import shape

from app.models.mission import Mission, MissionStatus
from app.schemas.mission import MissionCreate, MissionUpdate


async def create_mission(
    user_id: UUID,
    mission_data: MissionCreate,
    db: AsyncSession
) -> Mission:
    """
    Создание новой миссии
    
    Args:
        user_id: ID пользователя
        mission_data: Данные миссии
        db: Сессия БД
        
    Returns:
        Mission: Созданная миссия
    """
    # Конвертация GeoJSON territory в Geometry
    territory_geom = from_shape(shape(mission_data.territory), srid=4326)
    
    mission = Mission(
        user_id=user_id,
        name=mission_data.name,
        description=mission_data.description,
        status=mission_data.status,
        flight_altitude=mission_data.flight_altitude,
        desired_overlap=mission_data.desired_overlap,
        forward_overlap=mission_data.forward_overlap,
        drone_model=mission_data.drone_model,
        shooting_type=mission_data.shooting_type,
        enable_terrain_following=mission_data.enable_terrain_following,
        territory=territory_geom,
        route_geojson=mission_data.route_geojson
    )
    
    db.add(mission)
    await db.commit()
    await db.refresh(mission)
    
    return mission


async def get_user_missions(
    user_id: UUID,
    db: AsyncSession,
    limit: int = 10,
    offset: int = 0
) -> tuple[List[Mission], int]:
    """
    Получение списка миссий пользователя с пагинацией
    
    Args:
        user_id: ID пользователя
        db: Сессия БД
        limit: Количество миссий на странице
        offset: Смещение
        
    Returns:
        tuple: (список миссий, общее количество)
    """
    # Запрос миссий
    query = (
        select(Mission)
        .where(Mission.user_id == user_id)
        .order_by(Mission.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(query)
    missions = result.scalars().all()
    
    # Подсчёт общего количества
    count_query = select(func.count()).select_from(Mission).where(Mission.user_id == user_id)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    return list(missions), total


async def get_mission_by_id(
    mission_id: UUID,
    user_id: UUID,
    db: AsyncSession
) -> Mission:
    """
    Получение миссии по ID
    
    Args:
        mission_id: ID миссии
        user_id: ID пользователя (для проверки владельца)
        db: Сессия БД
        
    Returns:
        Mission: Миссия
        
    Raises:
        HTTPException: Если миссия не найдена или не принадлежит пользователю
    """
    result = await db.execute(
        select(Mission).where(
            Mission.id == mission_id,
            Mission.user_id == user_id
        )
    )
    mission = result.scalars().first()
    
    if not mission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Миссия не найдена"
        )
    
    return mission


async def update_mission(
    mission_id: UUID,
    user_id: UUID,
    update_data: MissionUpdate,
    db: AsyncSession
) -> Mission:
    """
    Обновление миссии
    
    Args:
        mission_id: ID миссии
        user_id: ID пользователя
        update_data: Данные для обновления
        db: Сессия БД
        
    Returns:
        Mission: Обновлённая миссия
    """
    # Получение миссии
    mission = await get_mission_by_id(mission_id, user_id, db)
    
    # Обновление полей
    update_dict = update_data.model_dump(exclude_unset=True)
    
    for field, value in update_dict.items():
        if field == "territory" and value is not None:
            # Конвертация GeoJSON в Geometry
            value = from_shape(shape(value), srid=4326)
        setattr(mission, field, value)
    
    await db.commit()
    await db.refresh(mission)
    
    return mission


async def delete_mission(
    mission_id: UUID,
    user_id: UUID,
    db: AsyncSession
) -> None:
    """
    Удаление миссии
    
    Args:
        mission_id: ID миссии
        user_id: ID пользователя
        db: Сессия БД
        
    Raises:
        HTTPException: Если миссия не найдена
    """
    # Проверка существования и владельца
    await get_mission_by_id(mission_id, user_id, db)
    
    # Удаление
    await db.execute(
        delete(Mission).where(
            Mission.id == mission_id,
            Mission.user_id == user_id
        )
    )
    await db.commit()

