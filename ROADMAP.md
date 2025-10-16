# Roadmap развития проекта "Drone Flight Route Planner"

**Версия:** 1.0  
**Дата создания:** 14 октября 2025  
**Основа:** ANALYSIS_REPORT.md

---

## 🔥 Уровень 1: Немедленно (критические исправления и quick wins)

### ✅ Шаг 1.1: Исправление критических багов
**Приоритет:** High  
**Зависимости:** Нет  
**Срок:** 30 минут

**Что делать:**
- Исправить опечатку в `drone-route-client/css/styles.css:76` (`16p` → `16px`)
- Обновить Node.js с 16 до 20 в `drone-route-server/Dockerfile.server`
- Создать `.dockerignore` в корне проекта

**Файлы:**
- `drone-route-client/css/styles.css`
- `drone-route-server/Dockerfile.server`
- `.dockerignore` (новый файл)

---

### ✅ Шаг 1.2: Вынос конфигурации API
**Приоритет:** High  
**Зависимости:** Нет  
**Срок:** 15 минут

**Что делать:**
- Создать `drone-route-client/js/config.js` с определением `API_BASE_URL`
- Заменить хардкод `http://localhost:3000` в `main.js` на использование конфига
- Поддержать автоопределение окружения (localhost vs production)

**Файлы:**
- `drone-route-client/js/config.js` (новый)
- `drone-route-client/js/main.js` (изменить строку 141)

---

### ✅ Шаг 1.3: Конфигурация камер и дронов
**Приоритет:** High  
**Зависимости:** Нет  
**Срок:** 2 часа

**Что делать:**
- Создать `drone-route-server/config/cameras.js` с параметрами камер (DJI Matrice 30T, Mavic 3, Phantom 4 Pro)
- Обновить `index.js` для использования конфига вместо хардкода (строки 38-40)
- Добавить выбор модели дрона на клиенте (dropdown в UI)

**Файлы:**
- `drone-route-server/config/cameras.js` (новый)
- `drone-route-server/index.js` (рефакторинг расчётов)
- `drone-route-client/index.html` (добавить dropdown)
- `drone-route-client/js/main.js` (передавать выбранную модель)

---

### ✅ Шаг 1.4: Исправление расчёта метры/градусы
**Приоритет:** High  
**Зависимости:** Нет  
**Срок:** 30 минут

**Что делать:**
- Исправить преобразование метров в градусы с учётом широты в `drone-route-server/index.js:54`
- Использовать формулу `metersPerDegreeLng = 111320 * cos(centerLat * PI / 180)`
- Добавить комментарий с объяснением формулы

**Файлы:**
- `drone-route-server/index.js` (строка 54)

---

### ✅ Шаг 1.5: Добавление базовой валидации на сервере
**Приоритет:** High  
**Зависимости:** Нет  
**Срок:** 1 час

**Что делать:**
- Установить `joi`: `npm install joi`
- Создать схему валидации для `/api/calculate-route`
- Добавить проверку параметров (altitude 10-500, overlap 0-0.99, polygon 3-1000 точек)

**Файлы:**
- `drone-route-server/package.json`
- `drone-route-server/index.js` (добавить валидацию перед обработкой)

---

### ✅ Шаг 1.6: Защита от больших территорий
**Приоритет:** High  
**Зависимости:** Нет  
**Срок:** 45 минут

**Что делать:**
- Добавить ограничение `MAX_FLIGHT_LINES = 1000` и `MAX_EXECUTION_TIME = 30000ms`
- Проверять лимиты в цикле генерации полос (строка 68)
- Возвращать понятную ошибку при превышении

**Файлы:**
- `drone-route-server/index.js` (цикл for, строка 68)

---

## 📦 Уровень 2: Короткий срок (MVP+ функциональность)

### ✅ Шаг 2.1: Продольное перекрытие (forward overlap)
**Приоритет:** High  
**Зависимости:** Шаг 1.3 (конфиг камер)  
**Срок:** 3 часа

**Что делать:**
- Добавить расчёт вертикального FOV на основе параметров камеры
- Рассчитать `groundLength` и `forwardSpacingMeters`
- Генерировать waypoints вдоль каждой полосы с интервалом `forwardSpacingMeters`
- Добавить поле "Продольное перекрытие (%)" в UI

**Файлы:**
- `drone-route-server/config/cameras.js` (добавить sensorHeight, imageHeight)
- `drone-route-server/index.js` (логика генерации waypoints)
- `drone-route-client/index.html` (поле ввода)
- `drone-route-client/js/main.js` (передача параметра)

---

### Шаг 2.2: Экспорт в GeoJSON
**Приоритет:** High  
**Зависимости:** Нет  
**Срок:** 30 минут

**Что делать:**
- Добавить кнопку "Экспорт GeoJSON" в UI
- Реализовать функцию `exportToGeoJSON()` с созданием blob и download
- Сохранять текущий маршрут в глобальную переменную `currentRoute`

**Файлы:**
- `drone-route-client/index.html` (кнопка)
- `drone-route-client/js/main.js` (функция экспорта)

---

### Шаг 2.3: Экспорт в KML/KMZ
**Приоритет:** High  
**Зависимости:** Шаг 2.2  
**Срок:** 2 часа

**Что делать:**
- Установить библиотеку `tokml` на клиенте или реализовать генерацию KML вручную
- Добавить кнопку "Экспорт KML"
- Генерировать корректный KML с высотой полёта для каждой точки

**Файлы:**
- `drone-route-client/index.html` (кнопка)
- `drone-route-client/js/main.js` (функция `exportToKML()`)

---

### Шаг 2.4: Экспорт в Litchi CSV
**Приоритет:** High  
**Зависимости:** Шаг 2.1 (waypoints)  
**Срок:** 2 часа

**Что делать:**
- Изучить формат Litchi CSV (latitude, longitude, altitude, heading, gimbal, actions)
- Реализовать функцию генерации CSV с правильными заголовками
- Рассчитать heading (азимут) между последовательными waypoints
- Добавить кнопку "Экспорт Litchi CSV"

**Файлы:**
- `drone-route-client/js/main.js` (функция `exportToLitchiCSV()`)
- `drone-route-client/index.html` (кнопка)

---

### Шаг 2.5: Возврат всех параметров с сервера
**Приоритет:** Medium  
**Зависимости:** Шаг 1.3  
**Срок:** 1 час

**Что делать:**
- Сервер возвращает объект `parameters` со всеми рассчитанными значениями (FOV, groundWidth, spacing и т.д.)
- Удалить дублирование расчётов на клиенте (строки 163-166 в main.js)
- Клиент использует данные из `data.parameters` для отображения

**Файлы:**
- `drone-route-server/index.js` (расширить response)
- `drone-route-client/js/main.js` (убрать дублирующие расчёты)

---

### Шаг 2.6: Структурированное логирование
**Приоритет:** Medium  
**Зависимости:** Нет  
**Срок:** 1.5 часа

**Что делать:**
- Установить `winston`: `npm install winston`
- Настроить транспорты (console, error.log, combined.log)
- Заменить все `console.log` на `logger.info/error/warn`

**Файлы:**
- `drone-route-server/package.json`
- `drone-route-server/logger.js` (новый файл с конфигом)
- `drone-route-server/index.js` (использовать logger)

---

### Шаг 2.7: Unit тесты для расчёта маршрута
**Приоритет:** Medium  
**Зависимости:** Шаг 2.5  
**Срок:** 3 часа

**Что делать:**
- Установить `jest` и `supertest`: `npm install --save-dev jest supertest`
- Экспортировать `app` из `index.js` для тестирования
- Написать тесты: валидный полигон, невалидный полигон, граничные значения параметров
- Настроить `npm test` в `package.json`

**Файлы:**
- `drone-route-server/package.json`
- `drone-route-server/tests/route.test.js` (новый)
- `drone-route-server/index.js` (экспорт app)

---

### Шаг 2.8: Расширенная аналитика миссии
**Приоритет:** Medium  
**Зависимости:** Шаг 2.1, 2.5  
**Срок:** 2 часа

**Что делать:**
- Рассчитать на сервере: общую длину маршрута, время полёта, GSD, количество снимков
- Добавить новую карточку "Аналитика миссии" в UI
- Отображать: площадь (км²), длину (км), время (мин), кол-во фото, GSD (см/px)

**Файлы:**
- `drone-route-server/index.js` (функции расчёта аналитики)
- `drone-route-client/index.html` (новая карточка)
- `drone-route-client/js/main.js` (отображение данных)
- `drone-route-client/css/styles.css` (стили карточки)

---

### Шаг 2.9: Оптимизация начальной точки маршрута
**Приоритет:** Medium  
**Зависимости:** Нет  
**Срок:** 1.5 часа

**Что делать:**
- Добавить опциональный параметр `homePoint` в запросе
- Определить, с какого конца первой полосы начинать (ближайший к home)
- Реверсировать координаты полос для оптимального порядка

**Файлы:**
- `drone-route-server/index.js` (логика оптимизации)
- `drone-route-client/js/main.js` (передача homePoint, если задан)

---

### Шаг 2.10: Профили миссий (presets)
**Приоритет:** Medium  
**Зависимости:** Шаг 2.1  
**Срок:** 2.5 часа

**Что делать:**
- Создать конфиг `mission-presets.js` с профилями (быстрое картографирование, фотограмметрия, 3D)
- Добавить dropdown "Тип миссии" в UI
- При выборе preset автоматически заполнять параметры (overlap, altitude)

**Файлы:**
- `drone-route-server/config/mission-presets.js` (новый)
- `drone-route-client/index.html` (dropdown)
- `drone-route-client/js/main.js` (применение preset)

---

## 🚀 Уровень 3: Средний/долгий срок (advanced features)

### Шаг 3.1: Учёт параметров батареи дрона
**Приоритет:** High  
**Зависимости:** Шаг 1.3, 2.8  
**Срок:** 4 часа

**Что делать:**
- Добавить характеристики дронов в конфиг (maxFlightTime, cruiseSpeed, maxDistance)
- Реализовать функцию `splitRouteByBattery()` для разбиения маршрута на сегменты
- Отображать в UI: "Требуется X полётов", визуализировать сегменты разными цветами
- Кнопки экспорта для каждого сегмента

**Файлы:**
- `drone-route-server/config/cameras.js` (расширить спецификацию дронов)
- `drone-route-server/index.js` (функция разбиения)
- `drone-route-client/js/main.js` (отображение мульти-полётов)

---

### Шаг 3.2: Адаптивное направление полос
**Приоритет:** High  
**Зависимости:** Нет  
**Срок:** 5 часов

**Что делать:**
- Реализовать функцию `getOrientedBBox()` для определения оптимальной ориентации
- Использовать Turf.js `convex()` и `bearing()` для расчёта угла
- Применить `transformRotate()` для поворота полигона перед построением маршрута
- Добавить опцию "Адаптивное направление" в UI

**Файлы:**
- `drone-route-server/index.js` (новая логика ориентации)
- `drone-route-client/index.html` (checkbox опции)

---

### Шаг 3.3: Интеграция погоды (OpenWeatherMap)
**Приоритет:** Medium  
**Зависимости:** Нет  
**Срок:** 3 часа

**Что делать:**
- Зарегистрироваться на OpenWeatherMap, получить API key
- Установить `axios` для запросов к API
- Получать данные о ветре (скорость, направление) для центра территории
- Отображать виджет погоды в боковой панели, предупреждения о неблагоприятных условиях

**Файлы:**
- `drone-route-server/.env` (хранить API_KEY)
- `drone-route-server/index.js` (функция `getWindData()`)
- `drone-route-client/index.html` (виджет погоды)
- `drone-route-client/js/main.js` (отображение данных)

---

### Шаг 3.4: Terrain Following (базовый уровень)
**Приоритет:** Medium  
**Зависимости:** Шаг 2.1  
**Срок:** 6 часов

**Что делать:**
- Интегрировать Open-Elevation API для получения высот точек
- Реализовать функцию `addTerrainFollowing()` для добавления z-координат
- Оптимизировать: батчить запросы, кешировать результаты
- Добавить checkbox "Следовать рельефу" в UI

**Файлы:**
- `drone-route-server/index.js` (интеграция с DEM API)
- `drone-route-client/index.html` (опция)

---

### Шаг 3.5: Симуляция полёта (Flight Preview)
**Приоритет:** Medium  
**Зависимости:** Шаг 2.1  
**Срок:** 4 часа

**Что делать:**
- Реализовать функцию `startFlightSimulation()` с анимацией маркера дрона
- Отображать footprint камеры в каждой точке
- Добавить элементы управления: ▶ Старт, ⏸ Пауза, ⏹ Стоп, слайдер скорости
- Timeline с прогрессом (текущая точка / всего точек)

**Файлы:**
- `drone-route-client/js/main.js` (функции симуляции)
- `drone-route-client/index.html` (элементы управления)
- `drone-route-client/css/styles.css` (стили timeline)

---

### Шаг 3.6: Backend с БД для хранения миссий
**Приоритет:** Medium  
**Зависимости:** Нет  
**Срок:** 8 часов

**Что делать:**
- Установить PostgreSQL + PostGIS
- Создать схему БД (таблица missions с GEOMETRY полями)
- Добавить API endpoints: `POST /missions`, `GET /missions/:id`, `GET /missions`
- Реализовать сохранение/загрузку миссий на клиенте

**Файлы:**
- `drone-route-server/db/schema.sql` (новый)
- `drone-route-server/db/connection.js` (новый)
- `drone-route-server/routes/missions.js` (новый)
- `drone-route-server/index.js` (подключить роуты)
- `drone-route-client/js/main.js` (функции save/load)

---

### Шаг 3.7: No-Fly Zones (базовая реализация)
**Приоритет:** Medium  
**Зависимости:** Нет  
**Срок:** 6 часов

**Что делать:**
- Установить `polygon-clipping` для булевых операций
- Реализовать ручное задание no-fly zones на карте (рисование полигонов)
- Вычитать no-fly zones из территории при построении маршрута
- Визуализировать no-fly zones красным цветом

**Файлы:**
- `drone-route-server/package.json` (добавить polygon-clipping)
- `drone-route-server/index.js` (обработка no-fly zones)
- `drone-route-client/js/main.js` (рисование и передача no-fly zones)

---

### Шаг 3.8: Drag-and-Drop импорт KML/GeoJSON
**Приоритет:** Low  
**Зависимости:** Нет  
**Срок:** 3 часа

**Что делать:**
- Добавить область для drag-and-drop файлов на карту
- Парсить KML/KMZ/GeoJSON файлы на клиенте
- Извлекать полигоны и отображать их на карте
- Автоматически строить маршрут для загруженного полигона

**Файлы:**
- `drone-route-client/js/main.js` (обработка drop events, парсинг)
- `drone-route-client/index.html` (dropzone UI)

---

### Шаг 3.9: Интеграция Ground Control Points (GCP)
**Приоритет:** Low  
**Зависимости:** Шаг 2.1  
**Срок:** 4 часа

**Что делать:**
- Добавить режим размещения GCP (клик по карте)
- Генерировать orbit paths вокруг каждого GCP
- Экспортировать координаты GCP в отдельный файл (CSV)
- Визуализировать GCP особыми маркерами

**Файлы:**
- `drone-route-client/js/main.js` (режим GCP, генерация orbit)
- `drone-route-client/index.html` (кнопка "Режим GCP")

---

### Шаг 3.10: ML-оптимизация параметров (концепт)
**Приоритет:** Low  
**Зависимости:** Шаг 3.6 (нужна история миссий)  
**Срок:** 20+ часов

**Что делать:**
- Собрать датасет выполненных миссий (параметры + результаты)
- Обучить модель предсказания оптимальных параметров (Python + scikit-learn или TensorFlow)
- Экспортировать модель в ONNX или TensorFlow.js формат
- Интегрировать в backend для предложения рекомендаций

**Файлы:**
- `ml/train_model.py` (новый, Python)
- `ml/model_export.py` (новый)
- `drone-route-server/ml/model.json` (экспортированная модель)
- `drone-route-server/index.js` (интеграция предсказаний)

---

### Шаг 3.11: Автоматизация через DroneKit/MAVLink
**Приоритет:** Low  
**Зависимости:** Шаги 2.3, 2.4 (экспорт форматов)  
**Срок:** 15+ часов

**Что делать:**
- Изучить DroneKit (Python SDK) и MAVLink протокол
- Реализовать Python-сервис для загрузки миссий на дрон
- Получение телеметрии в реальном времени через WebSocket
- Отображение live-позиции дрона на карте

**Файлы:**
- `automation/dronekit_service.py` (новый, Python)
- `drone-route-server/websocket.js` (новый, WebSocket server)
- `drone-route-client/js/telemetry.js` (новый, live updates)

---
