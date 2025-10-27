-- ============================================================================
-- Seed данные для тестирования
-- ============================================================================

-- Создание тестового пользователя
-- Email: test@example.com
-- Password: password123
-- Hash: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.4qKzxS

INSERT INTO users (email, password_hash) VALUES 
('test@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.4qKzxS')
ON CONFLICT (email) DO NOTHING;

-- Получаем ID тестового пользователя
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    SELECT id INTO test_user_id FROM users WHERE email = 'test@example.com';
    
    -- Примеры миссий
    INSERT INTO missions (
        user_id, 
        name, 
        description, 
        status,
        flight_altitude, 
        desired_overlap, 
        forward_overlap,
        drone_model,
        shooting_type,
        enable_terrain_following,
        territory,
        route_geojson
    ) VALUES 
    (
        test_user_id,
        'Тестовая миссия Коломна',
        'Аэрофотосъёмка центральной части города',
        'active',
        50.0,
        0.3,
        0.7,
        'DJI Matrice 30T',
        'Панорамная съемка',
        false,
        ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[38.75,55.08],[38.76,55.08],[38.76,55.09],[38.75,55.09],[38.75,55.08]]]}'),
        '{"type":"Feature","geometry":{"type":"LineString","coordinates":[[38.75,55.08],[38.76,55.09]]},"properties":{"droneModel":"DJI Matrice 30T","flightAltitude":50}}'::jsonb
    )
    ON CONFLICT DO NOTHING;
    
END $$;

