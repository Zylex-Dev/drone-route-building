"""
Pydantic схемы для миссий
"""
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, Any, Dict, List
import uuid

from app.models.mission import MissionStatus


class MissionCreate(BaseModel):
    """Схема для создания миссии"""
    name: str = Field(..., min_length=1, max_length=255, description="Название миссии")
    description: Optional[str] = Field(None, description="Описание миссии")
    status: MissionStatus = Field(default=MissionStatus.DRAFT, description="Статус миссии")
    
    # Параметры полёта
    flight_altitude: float = Field(..., ge=5, le=400, description="Высота полёта (5-400м)")
    desired_overlap: float = Field(..., ge=0.1, le=0.95, description="Боковое перекрытие (0.1-0.95)")
    forward_overlap: float = Field(..., ge=0.5, le=0.95, description="Продольное перекрытие (0.5-0.95)")
    drone_model: str = Field(..., min_length=1, max_length=100, description="Модель дрона")
    shooting_type: Optional[str] = Field(None, max_length=100, description="Тип съёмки")
    enable_terrain_following: bool = Field(default=False, description="Учёт рельефа")
    
    # Геометрия (GeoJSON Polygon)
    territory: Dict[str, Any] = Field(..., description="Полигон территории (GeoJSON)")
    
    # Результаты расчёта (GeoJSON Feature)
    route_geojson: Dict[str, Any] = Field(..., description="GeoJSON маршрута")
    
    @field_validator('territory')
    @classmethod
    def validate_territory(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        """Валидация территории"""
        if v.get('type') != 'Polygon':
            raise ValueError('Territory должен быть Polygon')
        
        coordinates = v.get('coordinates', [])
        if not coordinates or len(coordinates) == 0:
            raise ValueError('Territory должен содержать координаты')
        
        # Проверка количества точек
        points = coordinates[0] if coordinates else []
        if len(points) < 4:  # Минимум 3 точки + замыкающая
            raise ValueError('Polygon должен содержать минимум 3 точки')
        if len(points) > 1001:  # 1000 + замыкающая
            raise ValueError('Polygon не может содержать более 1000 точек')
        
        return v
    
    @field_validator('route_geojson')
    @classmethod
    def validate_route_geojson(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        """Валидация GeoJSON маршрута"""
        if v.get('type') != 'Feature':
            raise ValueError('route_geojson должен быть GeoJSON Feature')
        
        geometry = v.get('geometry')
        if not geometry or geometry.get('type') != 'LineString':
            raise ValueError('Geometry должна быть LineString')
        
        return v


class MissionUpdate(BaseModel):
    """Схема для обновления миссии"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[MissionStatus] = None
    
    # Параметры (опциональные для обновления)
    flight_altitude: Optional[float] = Field(None, ge=5, le=400)
    desired_overlap: Optional[float] = Field(None, ge=0.1, le=0.95)
    forward_overlap: Optional[float] = Field(None, ge=0.5, le=0.95)
    drone_model: Optional[str] = Field(None, min_length=1, max_length=100)
    shooting_type: Optional[str] = Field(None, max_length=100)
    enable_terrain_following: Optional[bool] = None
    
    territory: Optional[Dict[str, Any]] = None
    route_geojson: Optional[Dict[str, Any]] = None


class MissionResponse(BaseModel):
    """Схема ответа с данными миссии"""
    id: uuid.UUID
    user_id: uuid.UUID
    
    # Основная информация
    name: str
    description: Optional[str]
    status: MissionStatus
    
    # Временные метки
    created_at: datetime
    updated_at: datetime
    
    # Параметры полёта
    flight_altitude: float
    desired_overlap: float
    forward_overlap: float
    drone_model: str
    shooting_type: Optional[str]
    enable_terrain_following: bool
    
    # Геометрия и маршрут
    territory: Dict[str, Any]
    route_geojson: Dict[str, Any]
    
    model_config = {"from_attributes": True}


class MissionListResponse(BaseModel):
    """Схема ответа со списком миссий"""
    total: int = Field(..., description="Общее количество миссий")
    missions: List[MissionResponse] = Field(..., description="Список миссий")

