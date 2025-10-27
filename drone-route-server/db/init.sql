-- ============================================================================
-- Инициализация базы данных для Drone Route Planner
-- ============================================================================

-- Включение расширения PostGIS для работы с геопространственными данными
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Таблица пользователей
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для быстрого поиска по email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- Таблица миссий
-- ============================================================================

-- Создание ENUM для статуса миссии
DO $$ BEGIN
    CREATE TYPE mission_status AS ENUM ('draft', 'active', 'completed', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Основная информация
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status mission_status DEFAULT 'draft',
    
    -- Временные метки
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Параметры миссии
    flight_altitude FLOAT NOT NULL,
    desired_overlap FLOAT NOT NULL CHECK (desired_overlap >= 0 AND desired_overlap <= 1),
    forward_overlap FLOAT NOT NULL CHECK (forward_overlap >= 0 AND forward_overlap <= 1),
    drone_model VARCHAR(100) NOT NULL,
    shooting_type VARCHAR(100),
    enable_terrain_following BOOLEAN DEFAULT FALSE,
    
    -- Геопространственные данные
    territory GEOMETRY(POLYGON, 4326) NOT NULL,
    
    -- Результаты расчёта маршрута (GeoJSON)
    route_geojson JSONB NOT NULL
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_missions_user_id ON missions(user_id);
CREATE INDEX IF NOT EXISTS idx_missions_created_at ON missions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);

-- Spatial index для территории (быстрый поиск пересечений)
CREATE INDEX IF NOT EXISTS idx_missions_territory ON missions USING GIST(territory);

-- ============================================================================
-- Триггер для автоматического обновления updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON missions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Комментарии к таблицам и полям
-- ============================================================================

COMMENT ON TABLE users IS 'Таблица зарегистрированных пользователей';
COMMENT ON COLUMN users.email IS 'Email пользователя (уникальный)';
COMMENT ON COLUMN users.password_hash IS 'Хеш пароля (bcrypt)';

COMMENT ON TABLE missions IS 'Таблица миссий пользователей';
COMMENT ON COLUMN missions.territory IS 'Полигон территории съёмки (WGS84)';
COMMENT ON COLUMN missions.route_geojson IS 'Полный GeoJSON маршрута с метаданными';
COMMENT ON COLUMN missions.desired_overlap IS 'Боковое перекрытие (0.0-1.0)';
COMMENT ON COLUMN missions.forward_overlap IS 'Продольное перекрытие (0.0-1.0)';

