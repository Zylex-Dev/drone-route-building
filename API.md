# API Documentation

## Обзор

Проект использует два API сервиса:

1. **Auth Service** (порт 8000) - регистрация, авторизация, управление миссиями
2. **Route Service** (порт 3000) - расчёт маршрутов полёта

---

## Auth Service API

### Base URL
```
http://localhost:8000/api
```

### Автоматическая документация
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

### Авторизация

#### POST /auth/register
Регистрация нового пользователя

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (201):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2025-10-27T12:00:00Z"
  }
}
```

---

#### POST /auth/login
Вход в систему

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2025-10-27T12:00:00Z"
  }
}
```

---

#### GET /auth/me
Получение данных текущего пользователя

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "created_at": "2025-10-27T12:00:00Z"
}
```

---

### Управление миссиями

#### POST /missions
Создание новой миссии

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Съёмка центра Коломны",
  "description": "Аэрофотосъёмка исторического центра",
  "status": "active",
  "flight_altitude": 50.0,
  "desired_overlap": 0.3,
  "forward_overlap": 0.7,
  "drone_model": "DJI Matrice 30T",
  "shooting_type": "Панорамная съемка",
  "enable_terrain_following": true,
  "territory": {
    "type": "Polygon",
    "coordinates": [[[lng, lat], [lng, lat], ...]]
  },
  "route_geojson": {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [[lng, lat], ...]
    },
    "properties": { ... }
  }
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Съёмка центра Коломны",
  "description": "Аэрофотосъёмка исторического центра",
  "status": "active",
  "created_at": "2025-10-27T12:00:00Z",
  "updated_at": "2025-10-27T12:00:00Z",
  "flight_altitude": 50.0,
  "desired_overlap": 0.3,
  "forward_overlap": 0.7,
  "drone_model": "DJI Matrice 30T",
  "shooting_type": "Панорамная съемка",
  "enable_terrain_following": true,
  "territory": { ... },
  "route_geojson": { ... }
}
```

---

#### GET /missions
Получение списка миссий пользователя

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `limit` (optional): количество миссий (1-100, default: 10)
- `offset` (optional): смещение для пагинации (default: 0)

**Response (200):**
```json
{
  "total": 15,
  "missions": [
    {
      "id": "uuid",
      "name": "Миссия 1",
      ...
    },
    ...
  ]
}
```

---

#### GET /missions/{mission_id}
Получение конкретной миссии

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Съёмка центра Коломны",
  ...
}
```

---

#### PUT /missions/{mission_id}
Обновление миссии

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body (все поля опциональны):**
```json
{
  "name": "Новое название",
  "description": "Новое описание",
  "status": "completed"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Новое название",
  ...
}
```

---

#### DELETE /missions/{mission_id}
Удаление миссии

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (204):**
No content

---

## Route Service API

### Base URL
```
http://localhost:3000/api
```

---

### POST /calculate-route
Расчёт маршрута полёта

**Request Body:**
```json
{
  "territory": [
    { "lat": 55.08, "lng": 38.75 },
    { "lat": 55.08, "lng": 38.76 },
    { "lat": 55.09, "lng": 38.76 },
    { "lat": 55.09, "lng": 38.75 }
  ],
  "flightAltitude": 50,
  "desiredOverlap": 0.3,
  "forwardOverlap": 0.7,
  "droneModel": "DJI Matrice 30T",
  "shootingType": "Панорамная съемка",
  "enableTerrainFollowing": true
}
```

**Response (200):**
```json
{
  "success": true,
  "route": {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [[lng, lat], ...]
    },
    "properties": {
      "droneModel": "DJI Matrice 30T",
      "flightAltitude": 50,
      "effectiveSpacingMeters": "123.45",
      "forwardSpacingMeters": "45.67",
      "groundWidth": "250.00",
      "groundLength": "180.00",
      "desiredOverlap": "30",
      "forwardOverlap": "70",
      "numberOfLines": 15,
      "totalWaypoints": 450,
      "segments": [...],
      "missionStats": {
        "coverageAreaKm2": 2.5,
        "totalFlightDistanceKm": 12.3,
        "estimatedFlightTimeMin": 25.5,
        "estimatedPhotos": 450,
        "estimatedStorageGB": 9.0,
        "batteryUsagePercent": 65,
        "gsdCmPerPixel": 1.5,
        "cruiseSpeed": 15
      },
      "terrainData": {
        "enabled": true,
        "maxTerrainElevation": 150.5,
        "minTerrainElevation": 120.0,
        "absoluteFlightAltitude": 200.5,
        ...
      }
    }
  }
}
```

---

## Коды ошибок

### HTTP Status Codes

- `200 OK` - Успешный запрос
- `201 Created` - Ресурс создан
- `204 No Content` - Успешное удаление
- `400 Bad Request` - Неверные данные
- `401 Unauthorized` - Требуется авторизация / неверный токен
- `403 Forbidden` - Доступ запрещён
- `404 Not Found` - Ресурс не найден
- `422 Unprocessable Entity` - Ошибка валидации
- `500 Internal Server Error` - Ошибка сервера

### Формат ошибки

```json
{
  "detail": "Описание ошибки",
  "errors": ["Детали ошибки 1", "Детали ошибки 2"]
}
```

---

## JWT Authentication

Все защищённые endpoints требуют JWT токен в заголовке:

```
Authorization: Bearer {access_token}
```

**Срок действия токена:** 7 дней

При истечении токена необходимо повторно войти в систему.

