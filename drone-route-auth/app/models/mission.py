"""
Модель миссии
"""
from sqlalchemy import Column, String, Float, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
import uuid
import enum

from app.database import Base


class MissionStatus(str, enum.Enum):
    """Статусы миссии"""
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Mission(Base):
    """Модель миссии пользователя"""
    
    __tablename__ = "missions"
    
    # Основные поля
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Информация о миссии
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        SQLEnum(MissionStatus, name="mission_status", create_type=False, values_callable=lambda x: [e.value for e in x]),
        default=MissionStatus.DRAFT,
        nullable=False,
        index=True
    )
    
    # Временные метки
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Параметры полёта
    flight_altitude = Column(Float, nullable=False)
    desired_overlap = Column(Float, nullable=False)  # 0.0 - 1.0
    forward_overlap = Column(Float, nullable=False)  # 0.0 - 1.0
    drone_model = Column(String(100), nullable=False)
    shooting_type = Column(String(100), nullable=True)
    enable_terrain_following = Column(Boolean, default=False)
    
    # Геопространственные данные
    territory = Column(Geometry(geometry_type='POLYGON', srid=4326), nullable=False)
    
    # GeoJSON маршрута
    route_geojson = Column(JSONB, nullable=False)
    
    # Relationship к пользователю
    user = relationship("User", back_populates="missions")
    
    def __repr__(self):
        return f"<Mission {self.name} ({self.status})>"

