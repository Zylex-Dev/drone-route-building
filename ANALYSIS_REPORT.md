# Всесторонний анализ проекта "Планировщик маршрутов полёта дронов"

**Дата анализа:** 14 октября 2025  
**Версия проекта:** 1.0.0  
**Аналитик:** AI Senior Architect

---

## 1. Краткое описание проекта

**Drone Flight Route Planner** — веб-приложение для автоматизированного построения оптимизированных маршрутов полёта беспилотников на основе пользовательских параметров. Проект ориентирован на аэрофотосъёмку и обеспечивает полное покрытие заданной территории с учётом требуемого перекрытия кадров.

**Текущее состояние:**  
Проект находится на стадии MVP (минимально жизнеспособный продукт) с базовой функциональностью. Реализован простой алгоритм "газонокосилки" (lawnmower/boustrophedon) для построения маршрута вертикальными полосами. Интерфейс современный, с поддержкой тёмной темы и интерактивной картой. Развёртывание реализовано через Docker Compose, что упрощает запуск.

**Цель:**  
Создать профессиональный инструмент для планирования миссий дронов, который может использоваться операторами БПЛА для аэрофотосъёмки, картографирования, инспекций инфраструктуры и других задач, требующих систематического покрытия территории.

**Технологический стек:**
- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Bootstrap 5, Leaflet.js, Leaflet.draw
- **Backend:** Node.js 16, Express.js, Turf.js
- **Инфраструктура:** Docker (nginx + node), OpenStreetMap
- **Алгоритмы:** Геопространственные вычисления (Turf.js), тригонометрия для расчёта FOV

---

## 2. Технический анализ

### 2.1. Сильные стороны

✅ **Простота развёртывания**  
Docker Compose с двумя контейнерами (клиент на nginx, сервер на node) обеспечивает быстрый запуск проекта одной командой. Это снижает барьер входа для пользователей и разработчиков.

✅ **Чистая архитектура**  
Чёткое разделение клиента и сервера. RESTful API с единственным endpoint `/api/calculate-route` — понятная и расширяемая структура.

✅ **Современный UI**  
Использование glassmorphism-эффектов, поддержка тёмной темы, адаптивный дизайн на Bootstrap. Интерфейс выглядит профессионально и привлекательно.

✅ **Геопространственная библиотека**  
Turf.js — мощный и проверенный инструмент для геометрических операций, что упрощает работу с координатами, пересечениями и полигонами.

✅ **Валидация входных данных**  
Реализована базовая проверка корректности параметров (высота 10-500м, перекрытие 0-99%), что предотвращает очевидные ошибки пользователей.

✅ **Математическая точность**  
Корректное применение тригонометрии для расчёта угла обзора камеры и земной ширины кадра на основе фокусного расстояния и размера матрицы.

---

### 2.2. Слабые стороны и рекомендации

#### **CRITICAL** 🔴

**1. Hardcoded параметры камеры**  
📍 **Файл:** `drone-route-server/index.js:38-40`  
📝 **Проблема:** Фокусное расстояние (4.5мм) и ширина матрицы (7.6мм) жестко заданы для DJI Matrice 30T. Для других дронов или камер расчёт будет неверным.  
💡 **Решение:** Создать конфигурацию камер и моделей дронов.

```javascript
// drone-route-server/config/cameras.js
module.exports = {
  'DJI Matrice 30T': {
    focalLength: 4.5,
    sensorWidth: 7.6,
    sensorHeight: 5.7,
    imageWidth: 8000,
    imageHeight: 6000
  },
  'DJI Mavic 3': {
    focalLength: 24,
    sensorWidth: 17.3,
    sensorHeight: 13.0,
    imageWidth: 5280,
    imageHeight: 3956
  },
  'DJI Phantom 4 Pro': {
    focalLength: 8.8,
    sensorWidth: 13.2,
    sensorHeight: 8.8,
    imageWidth: 5472,
    imageHeight: 3648
  }
};
```

**2. Отсутствие обработки продольного перекрытия (forward overlap)**  
📍 **Файл:** `drone-route-server/index.js:64-85`  
📝 **Проблема:** Учитывается только боковое перекрытие (sidelap), но не продольное перекрытие между последовательными снимками вдоль полосы. Это критично для фотограмметрии и 3D-реконструкции.  
💡 **Решение:** Добавить расчёт интервалов между точками съёмки.

```javascript
// Расчёт продольного перекрытия
const forwardOverlap = Number(req.body.forwardOverlap) || 0.7; // 70%
const groundLength = 2 * flightAltitude * Math.tan(verticalFOV / 2);
const forwardSpacingMeters = groundLength * (1 - forwardOverlap);

// При генерации маршрута добавляем waypoints с интервалом forwardSpacingMeters
```

**3. Хардкод API endpoint в клиенте**  
📍 **Файл:** `drone-route-client/js/main.js:141`  
📝 **Проблема:** URL `http://localhost:3000` жестко прописан, что делает невозможным развёртывание в production без изменения кода.  
💡 **Решение:** Использовать переменные окружения или конфигурационный файл.

```javascript
// drone-route-client/js/config.js
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://api.yourdomail.com';

// main.js
fetch(`${API_BASE_URL}/api/calculate-route`, {...})
```

---

#### **HIGH** 🟠

**4. Отсутствие тестов**  
📍 **Файл:** `drone-route-server/package.json:6`  
📝 **Проблема:** В package.json есть placeholder для тестов, но реальных тестов нет. Это делает рефакторинг рискованным.  
💡 **Решение:** Внедрить unit и integration тесты.

```bash
npm install --save-dev jest supertest
```

```javascript
// drone-route-server/tests/route.test.js
const request = require('supertest');
const app = require('../index'); // экспортировать app

describe('POST /api/calculate-route', () => {
  it('should calculate route for valid polygon', async () => {
    const response = await request(app)
      .post('/api/calculate-route')
      .send({
        territory: [
          {lat: 55.09, lng: 38.76},
          {lat: 55.10, lng: 38.76},
          {lat: 55.10, lng: 38.77},
          {lat: 55.09, lng: 38.77}
        ],
        flightAltitude: 50,
        desiredOverlap: 0.3
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.route.geometry.type).toBe('LineString');
  });
});
```

**5. Неточность преобразования метров в градусы**  
📍 **Файл:** `drone-route-server/index.js:54`  
📝 **Проблема:** Используется константа 111320 м/градус, но это верно только для широты. Для долготы значение зависит от широты: `metersPerDegree = 111320 * cos(latitude)`.  
💡 **Решение:** Использовать корректное преобразование или функции Turf.js.

```javascript
// Правильный расчёт с учётом широты
const centerLat = (bbox[1] + bbox[3]) / 2;
const metersPerDegreeLng = 111320 * Math.cos(centerLat * Math.PI / 180);
const effectiveSpacingDegrees = effectiveSpacingMeters / metersPerDegreeLng;
```

**6. Отсутствие логирования**  
📍 **Файл:** `drone-route-server/index.js`  
📝 **Проблема:** Используются только console.log. Нет структурированного логирования, уровней логов, логирования ошибок в файл.  
💡 **Решение:** Внедрить winston или pino.

```bash
npm install winston
```

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

logger.info('Server started', { port: PORT });
logger.error('Route calculation failed', { error: err.message });
```

**7. Устаревший образ Node.js**  
📍 **Файл:** `drone-route-server/Dockerfile.server:1`  
📝 **Проблема:** Используется Node.js 16, который достигнет end-of-life в 2024. Текущая LTS — Node.js 20.  
💡 **Решение:** Обновить на актуальную версию.

```dockerfile
FROM node:20-alpine
```

---

#### **MEDIUM** 🟡

**8. Отсутствие валидации на стороне сервера**  
📍 **Файл:** `drone-route-server/index.js:12-23`  
📝 **Проблема:** Проверяется только наличие территории, но не валидируются параметры высоты и перекрытия, не проверяется размер полигона.  
💡 **Решение:** Добавить комплексную валидацию с использованием библиотеки типа Joi или express-validator.

```javascript
const Joi = require('joi');

const routeSchema = Joi.object({
  territory: Joi.array().items(
    Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required()
    })
  ).min(3).max(1000).required(),
  flightAltitude: Joi.number().min(10).max(500).required(),
  desiredOverlap: Joi.number().min(0).max(0.99).required(),
  forwardOverlap: Joi.number().min(0).max(0.99).optional(),
  droneModel: Joi.string().valid('DJI Matrice 30T', 'DJI Mavic 3').required()
});
```

**9. Нет обработки больших территорий**  
📍 **Файл:** `drone-route-server/index.js:68`  
📝 **Проблема:** Для больших территорий или малого шага между полосами может генерироваться огромное количество линий, что приведёт к timeout или падению сервера.  
💡 **Решение:** Добавить ограничение на количество линий и время выполнения.

```javascript
const MAX_FLIGHT_LINES = 1000;
const MAX_EXECUTION_TIME = 30000; // 30 секунд

let lineCount = 0;
const startTime = Date.now();

for (let x = bbox[0]; x <= bbox[2]; x += effectiveSpacingDegrees) {
  if (++lineCount > MAX_FLIGHT_LINES) {
    return res.status(400).json({ 
      success: false, 
      message: 'Территория слишком велика или шаг слишком мал. Уменьшите площадь или увеличьте высоту полёта.' 
    });
  }
  
  if (Date.now() - startTime > MAX_EXECUTION_TIME) {
    return res.status(408).json({ 
      success: false, 
      message: 'Время расчёта превышено. Попробуйте упростить задачу.' 
    });
  }
  // ... остальная логика
}
```

**10. Дублирование кода расчёта параметров**  
📍 **Файлы:** `drone-route-client/js/main.js:163-166` и `drone-route-server/index.js:46-62`  
📝 **Проблема:** Расчёт FOV и groundWidth дублируется на клиенте и сервере. Это нарушает DRY и может привести к рассинхронизации.  
💡 **Решение:** Сервер должен возвращать все рассчитанные параметры, клиент только отображает.

```javascript
// Сервер возвращает
return res.json({
  success: true,
  route: routeGeoJSON,
  parameters: {
    horizontalFOV,
    groundWidth,
    effectiveSpacingMeters,
    flightAltitude,
    focalLength,
    sensorWidth
  }
});

// Клиент использует
document.getElementById('fovInfo').textContent = 
  'Горизонтальный угол обзора (rad): ' + data.parameters.horizontalFOV.toFixed(4);
```

**11. Отсутствие пагинации/оптимизации маршрута**  
📍 **Файл:** `drone-route-server/index.js:99-111`  
📝 **Проблема:** Зигзагообразный маршрут строится простым переворотом координат, но не оптимизируется время перелёта между полосами.  
💡 **Решение:** Добавить оптимизацию начальной точки и направления полос.

```javascript
// Определяем оптимальную стартовую точку (ближайшую к home point)
const homePoint = req.body.homePoint || [bbox[0], bbox[1]];
const firstLineStart = turf.point(flightLines[0].geometry.coordinates[0]);
const firstLineEnd = turf.point(flightLines[0].geometry.coordinates[1]);

if (turf.distance(homePoint, firstLineEnd) < turf.distance(homePoint, firstLineStart)) {
  // Если конец первой линии ближе к дому, начинаем с него
  flightLines[0].geometry.coordinates.reverse();
}
```

**12. Нет экспорта маршрута**  
📍 **Файл:** `drone-route-client/js/main.js`  
📝 **Проблема:** Построенный маршрут нельзя экспортировать в форматы, используемые автопилотами (KML, KMZ, Waypoints CSV, Litchi Mission).  
💡 **Решение:** Добавить функционал экспорта в стандартные форматы.

```javascript
// Экспорт в KML
function exportToKML(route) {
  const coords = route.geometry.coordinates.map(coord => 
    `${coord[0]},${coord[1]},${route.properties.flightAltitude}`
  ).join(' ');
  
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Drone Route</name>
      <LineString>
        <coordinates>${coords}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
  
  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'drone_route.kml';
  a.click();
}
```

---

#### **LOW** ⚪

**13. Отсутствие robots.txt и SEO-оптимизации**  
📝 **Проблема:** Нет мета-тегов, OpenGraph, robots.txt для индексации.  
💡 **Решение:** Добавить базовую SEO-оптимизацию.

**14. Отсутствие favicon**  
📝 **Проблема:** В браузере нет иконки приложения.  
💡 **Решение:** Добавить favicon.ico и apple-touch-icon.

**15. Нет мобильной адаптации карты**  
📝 **Проблема:** На мобильных устройствах управление картой может быть неудобным.  
💡 **Решение:** Добавить touch-friendly элементы управления.

**16. Отсутствие .dockerignore**  
📝 **Проблема:** В Docker-образы могут попасть лишние файлы (node_modules, .git, README).  
💡 **Решение:** Создать `.dockerignore`.

```
node_modules
.git
.gitignore
README.md
*.log
.env
```

**17. Опечатка в CSS**  
📍 **Файл:** `drone-route-client/css/styles.css:76`  
📝 **Проблема:** `border-radius: 16p;` — потеряна буква "x".  
💡 **Решение:** `border-radius: 16px;`

---

## 3. Алгоритмы маршрута

### 3.1. Текущая реализация

**Алгоритм:** Lawnmower (газонокосилка) / Boustrophedon  
**Описание:** Территория покрывается вертикальными полосами (параллельными линиями долготы) с зигзагообразным движением.

**Этапы алгоритма:**
1. Вычисление bounding box полигона территории
2. Расчёт ширины полосы на основе FOV камеры, высоты и перекрытия
3. Генерация вертикальных линий через bbox с интервалом = ширина полосы
4. Поиск пересечений каждой линии с полигоном (получение входа/выхода в зону)
5. Сортировка сегментов по X-координате
6. Объединение в зигзаг (чётные полосы снизу вверх, нечётные сверху вниз)

**Плюсы:**
- ✅ Простая и понятная логика
- ✅ Гарантированное покрытие территории
- ✅ Минимум разворотов

**Минусы:**
- ❌ Не оптимален для сложных форм (может быть много холостых пролётов)
- ❌ Не учитывает препятствия
- ❌ Направление полос всегда вертикальное (не учитывает ветер, форму территории)
- ❌ Нет адаптации к рельефу
- ❌ Не оптимизируется время полёта

---

### 3.2. Возможности улучшения алгоритмов

#### **Улучшение 1: Адаптивное направление полос**

**Проблема:** Вертикальные полосы могут быть неоптимальны для вытянутых территорий.

**Решение:** Определить ориентацию минимального ограничивающего прямоугольника (minimum bounding rectangle) и строить полосы вдоль длинной стороны.

```javascript
const turfHelpers = require('@turf/helpers');
const turfBbox = require('@turf/bbox');
const turfCenter = require('@turf/center');

// Вычисляем oriented bounding box
function getOrientedBBox(polygon) {
  // Простое приближение: находим длинную сторону выпуклой оболочки
  const convexHull = turf.convex(polygon);
  const coords = convexHull.geometry.coordinates[0];
  
  let maxDistance = 0;
  let bestAngle = 0;
  
  for (let i = 0; i < coords.length - 1; i++) {
    const dist = turf.distance(coords[i], coords[i + 1]);
    if (dist > maxDistance) {
      maxDistance = dist;
      const bearing = turf.bearing(coords[i], coords[i + 1]);
      bestAngle = bearing;
    }
  }
  
  return { angle: bestAngle, rotationNeeded: Math.abs(bestAngle) > 10 };
}

// Применяем:
const orientation = getOrientedBBox(polygon);
if (orientation.rotationNeeded) {
  // Поворачиваем полигон на угол, строим маршрут, поворачиваем обратно
  const rotatedPolygon = turf.transformRotate(polygon, -orientation.angle);
  // ... строим маршрут ...
  const rotatedRoute = turf.transformRotate(route, orientation.angle);
}
```

**Библиотека:** [Turf.js transformRotate](https://turfjs.org/docs/#transformRotate)

---

#### **Улучшение 2: Учёт рельефа (Terrain Following)**

**Проблема:** Постоянная высота полёта над уровнем моря приводит к изменению расстояния до земли на холмистой местности.

**Решение:** Интеграция с Digital Elevation Model (DEM) для адаптации высоты полёта.

**API для получения высот:**
- **Open-Elevation API:** https://open-elevation.com
- **Mapbox Terrain API:** https://docs.mapbox.com/api/maps/tilequery/
- **Google Elevation API:** https://developers.google.com/maps/documentation/elevation

```javascript
const axios = require('axios');

async function getElevation(lat, lng) {
  const response = await axios.get('https://api.open-elevation.com/api/v1/lookup', {
    params: { locations: `${lat},${lng}` }
  });
  return response.data.results[0].elevation;
}

// Для каждой точки маршрута:
async function addTerrainFollowing(routeCoordinates, baseAltitude) {
  const promises = routeCoordinates.map(async ([lng, lat]) => {
    const groundElevation = await getElevation(lat, lng);
    return [lng, lat, groundElevation + baseAltitude]; // AGL (Above Ground Level)
  });
  return Promise.all(promises);
}
```

**Оптимизация:** Запрашивать высоты батчами, кешировать для областей, использовать локальный DEM-тайлсервер.

---

#### **Улучшение 3: Coverage Path Planning с препятствиями**

**Проблема:** Текущий алгоритм не учитывает no-fly zones, здания, деревья.

**Решение:** Внедрение алгоритмов покрытия с препятствиями (polygon decomposition + graph-based planning).

**Алгоритмы:**
- **Trapezoidal Decomposition** — разбиение сложного полигона на трапеции
- **Morse Decomposition** — разбиение на выпуклые области
- **Voronoi-based planning** — использование диаграммы Вороного для навигации между препятствиями

**Библиотеки:**
- [CGAL (Computational Geometry Algorithms Library)](https://www.cgal.org/) — C++, но есть JS-порты
- [polygon-clipping](https://www.npmjs.com/package/polygon-clipping) — булевы операции над полигонами

```javascript
const polygonClipping = require('polygon-clipping');

// Вычитаем no-fly zones из территории
const territoryPolygon = [[coords...]];
const noFlyZone1 = [[obstacleCoords...]];
const noFlyZone2 = [[obstacleCoords...]];

const allowedArea = polygonClipping.difference(
  territoryPolygon, 
  noFlyZone1, 
  noFlyZone2
);

// Теперь строим маршрут только внутри allowedArea
```

---

#### **Улучшение 4: TSP-оптимизация для множественных областей**

**Проблема:** Если территория состоит из нескольких разрозненных полигонов, порядок их облёта не оптимизирован.

**Решение:** Решение задачи коммивояжёра (TSP) для определения последовательности облёта областей.

**Библиотеки:**
- [node-tspsolver](https://www.npmjs.com/package/node-tspsolver)
- [or-tools](https://developers.google.com/optimization) от Google

```javascript
const TSP = require('node-tspsolver');

// Находим центры всех областей
const areas = multiPolygon.map(poly => turf.centroid(poly));

// Создаём матрицу расстояний
const distanceMatrix = areas.map(a => 
  areas.map(b => turf.distance(a, b))
);

// Решаем TSP
const tour = TSP.solveTsp(distanceMatrix);

// Облетаем области в оптимальном порядке
tour.tour.forEach(index => {
  const route = buildRouteForPolygon(multiPolygon[index]);
  // ... добавляем в общий маршрут
});
```

---

#### **Улучшение 5: Учёт параметров дрона (ограничения по батарее)**

**Проблема:** Маршрут может быть слишком длинным для одного полёта.

**Решение:** Разбиение маршрута на сегменты с учётом времени полёта и автономности дрона.

```javascript
const droneSpecs = {
  'DJI Matrice 30T': {
    maxFlightTime: 41, // минут
    cruiseSpeed: 23, // м/с
    maxDistance: 32000, // м (при оптимальных условиях)
    batteryCapacity: 400 // Wh
  }
};

function splitRouteByBattery(routeCoordinates, droneModel, flightSpeed) {
  const specs = droneSpecs[droneModel];
  const maxFlightDistance = specs.cruiseSpeed * (specs.maxFlightTime * 60) * 0.8; // 80% запаса
  
  let totalDistance = 0;
  let segments = [];
  let currentSegment = [routeCoordinates[0]];
  
  for (let i = 1; i < routeCoordinates.length; i++) {
    const segmentDist = turf.distance(
      turf.point(routeCoordinates[i-1]), 
      turf.point(routeCoordinates[i])
    ) * 1000; // км -> м
    
    if (totalDistance + segmentDist > maxFlightDistance) {
      // Начинаем новый сегмент
      segments.push(currentSegment);
      currentSegment = [routeCoordinates[i]];
      totalDistance = 0;
    } else {
      currentSegment.push(routeCoordinates[i]);
      totalDistance += segmentDist;
    }
  }
  
  segments.push(currentSegment);
  return segments;
}
```

---

#### **Улучшение 6: Интеграция ML для оптимизации**

**Идея:** Использовать машинное обучение для предсказания оптимальных параметров на основе исторических данных миссий.

**Применение ML:**

1. **Предсказание времени полёта:**  
   Обучить модель на данных о территориях, погоде, типе дрона → предсказывать реальное время полёта и расход батареи.

2. **Оптимизация высоты:**  
   ML-модель может предлагать оптимальную высоту полёта на основе типа местности, целей съёмки (детализация vs площадь).

3. **Адаптивное перекрытие:**  
   Модель определяет, где нужно больше перекрытия (сложный рельеф, важные объекты), а где можно снизить.

**Библиотеки:**
- [TensorFlow.js](https://www.tensorflow.org/js) — ML в браузере и Node.js
- [scikit-learn](https://scikit-learn.org/) (Python) — для обучения моделей, затем экспорт в ONNX для использования в JS

**Простой пример (концептуально):**

```javascript
const tf = require('@tensorflow/tfjs-node');

// Загружаем обученную модель
const model = await tf.loadLayersModel('file://./models/flight_optimizer/model.json');

// Входные данные: площадь территории, количество полос, высота, тип местности
const input = tf.tensor2d([[
  territoryArea,      // км²
  numberOfStrips,     // шт
  flightAltitude,     // м
  terrainComplexity   // 0-1 (flat to mountainous)
]]);

// Предсказание: оптимальная высота, скорость, перекрытие
const prediction = model.predict(input);
const [optimalAltitude, optimalSpeed, optimalOverlap] = await prediction.data();

console.log(`ML рекомендует: высота ${optimalAltitude}м, скорость ${optimalSpeed}м/с, перекрытие ${optimalOverlap}%`);
```

---

#### **Улучшение 7: Алгоритм Spiral для точечных объектов**

**Применение:** Инспекция вышек, труб, зданий — объекты, которые нужно облететь по спирали.

```javascript
function generateSpiralPath(centerPoint, radius, altitude, turns, pointsPerTurn) {
  const coords = [];
  const totalPoints = turns * pointsPerTurn;
  
  for (let i = 0; i <= totalPoints; i++) {
    const angle = (i / pointsPerTurn) * 2 * Math.PI;
    const currentRadius = (i / totalPoints) * radius;
    const currentAltitude = altitude + (i / totalPoints) * altitude * 0.5; // подъём
    
    const point = turf.destination(
      centerPoint, 
      currentRadius / 1000, // м -> км
      angle * (180 / Math.PI)
    );
    
    coords.push([point.geometry.coordinates[0], point.geometry.coordinates[1], currentAltitude]);
  }
  
  return coords;
}
```

---

### 3.3. Рекомендуемые библиотеки и ресурсы

**Геопространственные библиотеки:**
- [Turf.js](https://turfjs.org/) — уже используется, отлично
- [JSTS](https://github.com/bjornharrtell/jsts) — топологические операции (buffer, union, intersection)
- [geodesy](https://www.npmjs.com/package/geodesy) — точные геодезические вычисления

**Алгоритмы планирования пути:**
- [PathFinding.js](https://github.com/qiao/PathFinding.js) — A*, Dijkstra, Jump Point Search
- [ngraph.path](https://github.com/anvaka/ngraph.path) — графовые алгоритмы поиска пути

**Работа с высотами:**
- [elevation-service](https://github.com/Jorl17/open-elevation) — self-hosted DEM сервер
- [maptiler-terrain](https://www.maptiler.com/terrain/) — коммерческий Terrain API

**Оптимизация:**
- [Google OR-Tools](https://developers.google.com/optimization) — vehicle routing, TSP
- [genetic-js](https://www.npmjs.com/package/genetic-js) — генетические алгоритмы для оптимизации

---

## 4. Новые идеи и функции

### 4.1. Функциональные улучшения

#### **Идея 1: Мульти-батарейные миссии (Multi-battery missions)**

**Описание:** Автоматическое разбиение больших маршрутов на несколько полётов с RTH (Return to Home) и сменой батареи.

**Реализация:**
- Расчёт времени полёта и автономности для каждого сегмента
- Определение точек возврата домой (RTH waypoints)
- Визуализация на карте: разными цветами показать сегменты разных полётов
- Экспорт каждого сегмента отдельным файлом миссии

**UI:** Индикатор "Требуется 3 полёта", кнопки "Скачать миссию 1/2/3"

---

#### **Идея 2: Профили съёмки (Mission Presets)**

**Описание:** Предустановленные конфигурации для разных задач.

**Профили:**
- **Быстрое картографирование** — минимальное перекрытие (20%), высокая высота, быстрый пролёт
- **Фотограмметрия** — высокое перекрытие (70% боковое, 80% продольное), оптимальная высота для детализации
- **3D-моделирование** — облёт "сеткой" (grid) + наклонные снимки (oblique imagery)
- **Инспекция линейных объектов** — следование по линии (трубопровод, ЛЭП) с двусторонней съёмкой
- **Тепловизионная инспекция** — медленный пролёт, низкая высота, максимальное перекрытие

**Реализация:**
```javascript
const missionPresets = {
  'fast_mapping': {
    sidelapOverlap: 0.2,
    forwardOverlap: 0.5,
    altitudeMultiplier: 1.5,
    speed: 'fast'
  },
  'photogrammetry': {
    sidelapOverlap: 0.7,
    forwardOverlap: 0.8,
    altitudeMultiplier: 1.0,
    speed: 'moderate',
    captureMode: 'timelapse_2s'
  },
  '3d_modeling': {
    sidelapOverlap: 0.75,
    forwardOverlap: 0.85,
    altitudeMultiplier: 1.0,
    obliqueAngles: [30, 45], // наклон камеры
    multiplePassRequired: true
  }
};
```

**UI:** Dropdown "Тип миссии", автоматическое заполнение параметров.

---

#### **Идея 3: Интеграция погоды и ветра**

**Описание:** Учёт погодных условий при планировании маршрута.

**Функции:**
- Получение прогноза ветра из OpenWeatherMap API
- Рекомендация оптимального направления полос (параллельно ветру для минимизации дрифта)
- Предупреждения о неблагоприятных условиях (сильный ветер, дождь, низкая видимость)
- Коррекция скорости полёта с учётом встречного/попутного ветра

**API:**
- [OpenWeatherMap](https://openweathermap.org/api) — текущая погода и прогноз
- [Windy API](https://api.windy.com/) — детальные ветровые карты

```javascript
const axios = require('axios');

async function getWindData(lat, lng) {
  const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
    params: {
      lat,
      lon: lng,
      appid: process.env.OPENWEATHER_API_KEY,
      units: 'metric'
    }
  });
  
  const windSpeed = response.data.wind.speed; // м/с
  const windDirection = response.data.wind.deg; // градусы
  
  return { speed: windSpeed, direction: windDirection };
}

// Оптимизация направления полос
function optimizeStripDirection(polygon, windDirection) {
  // Если ветер сильный (>5 м/с), ориентируем полосы вдоль ветра
  const optimalDirection = windDirection; // градусы от севера
  return optimalDirection;
}
```

**UI:** Виджет погоды в боковой панели, иконка направления ветра на карте.

---

#### **Идея 4: No-Fly Zones и геозоны**

**Описание:** Автоматическая загрузка и учёт запрещённых для полётов зон.

**Источники данных:**
- [OpenAIP](https://www.openaip.net/) — аэропорты, воздушное пространство
- [AirMap API](https://www.airmap.com/) — no-fly zones, ограничения
- Локальные законы (можно задавать вручную)

**Функции:**
- Автоматическое выделение no-fly zones на карте красным цветом
- Предупреждение при попытке построить маршрут в запрещённой зоне
- Автоматическое исключение запрещённых зон из маршрута

```javascript
const noFlyZones = await fetchNoFlyZones(bbox);

noFlyZones.forEach(zone => {
  L.polygon(zone.coordinates, { color: 'red', fillOpacity: 0.3 })
    .addTo(map)
    .bindPopup(`No-Fly Zone: ${zone.name}`);
});

// При построении маршрута вычитаем no-fly zones
const allowedTerritory = polygonClipping.difference(territory, ...noFlyZones);
```

---

#### **Идея 5: Симуляция полёта (Flight Preview)**

**Описание:** Анимированная симуляция полёта по построенному маршруту.

**Функции:**
- Анимация движения дрона по маршруту на карте
- Отображение покрытия камеры (footprint) в каждой точке
- Таймлайн с текущим временем полёта / оставшейся батареей
- Возможность поставить на паузу, перемотать

**Реализация:**
```javascript
let simulationMarker = null;
let simulationInterval = null;
let currentWaypointIndex = 0;

function startFlightSimulation(route, speed) {
  const waypoints = route.geometry.coordinates;
  currentWaypointIndex = 0;
  
  simulationMarker = L.marker(
    [waypoints[0][1], waypoints[0][0]], 
    { icon: droneIcon }
  ).addTo(map);
  
  simulationInterval = setInterval(() => {
    if (currentWaypointIndex >= waypoints.length) {
      stopFlightSimulation();
      return;
    }
    
    const [lng, lat] = waypoints[currentWaypointIndex];
    simulationMarker.setLatLng([lat, lng]);
    
    // Отображаем footprint камеры
    const footprint = calculateCameraFootprint(lat, lng, flightAltitude, horizontalFOV);
    L.rectangle(footprint, { color: 'blue', fillOpacity: 0.2 }).addTo(map);
    
    // Обновляем UI
    document.getElementById('simulationProgress').textContent = 
      `Точка ${currentWaypointIndex}/${waypoints.length}`;
    
    currentWaypointIndex++;
  }, 1000 / speed); // speed = множитель скорости симуляции
}
```

**UI:** Кнопки "▶ Симуляция", "⏸ Пауза", "⏹ Стоп", слайдер скорости (1x, 5x, 10x).

---

#### **Идея 6: Совместная работа и облачное хранилище**

**Описание:** Возможность сохранения миссий в облаке, совместного доступа и версионирования.

**Функции:**
- Регистрация и авторизация пользователей (Auth0, Firebase Auth)
- Сохранение миссий на сервер с метаданными (название, дата, территория)
- Шаринг миссий по ссылке
- История изменений, версионирование
- Библиотека шаблонов миссий

**Технологии:**
- Backend: PostgreSQL + PostGIS для хранения геопространственных данных
- Auth: Firebase Authentication или Auth0
- Storage: AWS S3 или MinIO для хранения экспортированных файлов

```sql
-- Схема БД
CREATE TABLE missions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  territory GEOMETRY(Polygon, 4326),
  route GEOMETRY(LineString, 4326),
  parameters JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_missions_territory ON missions USING GIST(territory);
```

---

#### **Идея 7: Расширенная аналитика**

**Описание:** Детальная статистика и отчёты по миссии.

**Показатели:**
- Площадь покрытия (км²)
- Общая длина маршрута (км)
- Расчётное время полёта (мин)
- Количество снимков
- Требуемый объём памяти SD-карты (ГБ)
- GSD (Ground Sample Distance) — разрешение на местности (см/пиксель)
- Расход батареи (%)
- Стоимость миссии (по тарифу оператора)

**Формулы:**
```javascript
// GSD (см/пиксель)
const GSD = (sensorWidth * flightAltitude * 100) / (focalLength * imageWidth);

// Количество снимков
const frameRate = droneSpeed / (groundLength * (1 - forwardOverlap));
const totalTime = totalDistance / droneSpeed;
const totalPhotos = frameRate * totalTime;

// Объём данных (для RAW 20 МБ на фото)
const storageGB = (totalPhotos * 20) / 1024;
```

**UI:** Панель "Статистика миссии" с иконками и диаграммами.

---

#### **Идея 8: Экспорт в популярные форматы**

**Описание:** Поддержка экспорта маршрута во все стандартные форматы автопилотов.

**Форматы:**
- **KML/KMZ** — Google Earth, DJI Pilot
- **Litchi CSV** — приложение Litchi
- **Waypoints (CSV)** — универсальный формат
- **MAVLink Mission** — ArduPilot, PX4
- **DJI Pilot 2 WPML** — DJI Enterprise
- **GeoJSON** — для анализа в GIS

**Библиотеки:**
- [tokml](https://www.npmjs.com/package/tokml) — GeoJSON → KML
- [csv-writer](https://www.npmjs.com/package/csv-writer) — генерация CSV

```javascript
function exportToLitchiCSV(route, parameters) {
  const waypoints = route.geometry.coordinates.map((coord, index) => ({
    latitude: coord[1],
    longitude: coord[0],
    altitude: parameters.flightAltitude,
    heading: index < route.geometry.coordinates.length - 1 
      ? turf.bearing(coord, route.geometry.coordinates[index + 1]) 
      : 0,
    curvesize: 0,
    rotationdir: 0,
    gimbalmode: 0,
    gimbalpitchangle: -90,
    actiontype1: 1, // take photo
    actionparam1: 0
  }));
  
  // Конвертируем в CSV
  const csv = Papa.unparse(waypoints);
  return csv;
}
```

---

#### **Идея 9: Поддержка различных типов камер и сенсоров**

**Описание:** Возможность выбора камеры отдельно от дрона.

**Камеры:**
- Визуальные камеры (RGB)
- Тепловизоры (FLIR)
- Мультиспектральные (для сельского хозяйства)
- LiDAR
- Гиперспектральные

**Параметры:**
- FOV (горизонтальный и вертикальный)
- Разрешение (мегапиксели, разрешение тепловизора)
- Минимальное/максимальное расстояние до объекта
- Угол наклона (gimbal pitch)

**UI:** Dropdown "Тип камеры", автоматическая подстройка параметров.

---

#### **Идея 10: Интеграция с Ground Control Points (GCP)**

**Описание:** Возможность задать наземные опорные точки для повышения точности фотограмметрии.

**Функции:**
- Размещение GCP на карте (маркеры)
- Автоматическое добавление waypoints для детальной съёмки каждого GCP
- Экспорт координат GCP в файл для дальнейшей обработки в Pix4D, Agisoft Metashape

```javascript
let gcpMarkers = [];

map.on('click', function(e) {
  if (gcpPlacementMode) {
    const marker = L.marker(e.latlng, { icon: gcpIcon, draggable: true })
      .addTo(map)
      .bindPopup('GCP ' + (gcpMarkers.length + 1));
    
    gcpMarkers.push({ lat: e.latlng.lat, lng: e.latlng.lng });
  }
});

// Добавляем в маршрут детальные облёты GCP
function addGCPDetailPasses(route, gcpMarkers, detailAltitude) {
  gcpMarkers.forEach(gcp => {
    const orbitPath = generateOrbitPath(gcp, radius=10, altitude=detailAltitude, points=8);
    route.geometry.coordinates = route.geometry.coordinates.concat(orbitPath);
  });
}
```

---

### 4.2. Интеграция с внешними системами

#### **OpenDroneMap**
Автоматическая отправка снимков с дрона на обработку в OpenDroneMap (self-hosted или WebODM).

```javascript
// После завершения полёта
async function uploadToWebODM(missionId, photos) {
  const formData = new FormData();
  photos.forEach(photo => formData.append('images', photo));
  
  await axios.post('https://webodm.example.com/api/projects/1/tasks/', formData, {
    headers: { 'Authorization': 'Bearer ' + odm_token }
  });
}
```

#### **QGroundControl / Mission Planner**
Экспорт миссий в формате, совместимом с QGroundControl и Mission Planner.

#### **Mapbox / Google Maps**
Переключение тайлов карты для лучшего контекста (спутник, гибрид, рельеф).

---

### 4.3. Улучшения UX/UI

#### **1. Мастер создания миссии (Wizard)**
Пошаговый процесс:
1. Выбор области на карте
2. Выбор дрона и камеры
3. Выбор типа миссии (preset)
4. Настройка параметров
5. Предпросмотр и экспорт

#### **2. Drag-and-Drop для KML/SHP импорта**
Возможность загрузить существующий полигон территории из файла.

```javascript
// Leaflet-Dropzone plugin
const dropzone = L.dropzone({
  accept: ['.kml', '.kmz', '.geojson', '.shp'],
  onDrop: function(file) {
    // Парсим файл и добавляем полигон на карту
  }
}).addTo(map);
```

#### **3. Сравнение миссий (Side-by-side)**
Возможность открыть две миссии рядом для сравнения параметров.

#### **4. Горячие клавиши**
- `Ctrl+Z` — отменить последнее действие
- `Del` — удалить выбранный полигон
- `Space` — начать/остановить симуляцию

#### **5. Мини-карта**
Мини-карта в углу для быстрой навигации по большим территориям.

```javascript
const miniMap = new L.Control.MiniMap(lightTileLayer, {
  toggleDisplay: true,
  minimized: false
}).addTo(map);
```

#### **6. Измерительные инструменты**
- Измерение расстояний
- Измерение площадей
- Измерение высот (при интеграции с DEM)

#### **7. Слои на карте**
- Слой маршрута (можно скрыть/показать)
- Слой территории
- Слой GCP
- Слой no-fly zones
- Слой высот (heatmap)

---

## 5. Быстрые улучшения (Quick Wins)

### 1. Исправить опечатку в CSS ⚡
**Файл:** `drone-route-client/css/styles.css:76`  
**Изменить:** `border-radius: 16p;` → `border-radius: 16px;`  
**Время:** 1 минута  
**Эффект:** Корректное отображение закруглённых углов карточек.

### 2. Добавить .dockerignore ⚡
**Файл:** Создать `/.dockerignore`  
**Время:** 2 минуты  
**Эффект:** Уменьшение размера Docker-образов, ускорение сборки.

### 3. Обновить Node.js до 20 ⚡
**Файл:** `drone-route-server/Dockerfile.server:1`  
**Изменить:** `FROM node:16-alpine` → `FROM node:20-alpine`  
**Время:** 5 минут (пересборка образа)  
**Эффект:** Безопасность, актуальные зависимости.

### 4. Экспорт маршрута в GeoJSON ⚡
**Файл:** `drone-route-client/js/main.js`  
**Добавить:** Кнопку "Скачать GeoJSON" с простым экспортом `data.route`.  
**Время:** 15 минут  
**Эффект:** Пользователи смогут сохранять и анализировать маршруты.

```javascript
document.getElementById('exportGeoJSON').addEventListener('click', () => {
  const dataStr = "data:text/json;charset=utf-8," + 
    encodeURIComponent(JSON.stringify(currentRoute));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "drone_route.geojson");
  downloadAnchor.click();
});
```

### 5. Добавить favicon ⚡
**Файл:** Создать `/drone-route-client/favicon.ico`  
**Время:** 10 минут (найти/создать иконку, добавить в HTML)  
**Эффект:** Более профессиональный вид в браузере.

### 6. Вынести API_URL в конфиг ⚡
**Файл:** Создать `drone-route-client/js/config.js`  
**Время:** 10 минут  
**Эффект:** Упрощение развёртывания в production.

```javascript
// config.js
window.APP_CONFIG = {
  API_BASE_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://api.yourproject.com'
};

// main.js
fetch(`${APP_CONFIG.API_BASE_URL}/api/calculate-route`, {...})
```

### 7. Добавить индикатор загрузки ⚡
**Файл:** `drone-route-client/js/main.js`  
**Добавить:** Спиннер во время вычисления маршрута.  
**Время:** 15 минут  
**Эффект:** Улучшение UX — пользователь понимает, что процесс идёт.

```javascript
const loadingSpinner = document.getElementById('loadingSpinner');

// Перед fetch
loadingSpinner.style.display = 'block';

// После получения ответа
.finally(() => {
  loadingSpinner.style.display = 'none';
});
```

---

## 6. Долгосрочная стратегия развития

### **Направление 1: Продвинутые алгоритмы планирования** 🔬
**Цель:** Внедрить адаптивные, оптимизированные и интеллектуальные алгоритмы построения маршрутов.

**Этапы:**
1. **Фаза 1 (1-2 месяца):** Адаптивное направление полос, оптимизация начальной точки
2. **Фаза 2 (2-3 месяца):** Terrain following с интеграцией DEM API
3. **Фаза 3 (3-4 месяца):** Поддержка no-fly zones, polygon decomposition
4. **Фаза 4 (6+ месяцев):** ML-оптимизация параметров, предиктивные модели

**Сложность:** High  
**Ожидаемый эффект:** Значительное улучшение качества и эффективности маршрутов, конкурентное преимущество

---

### **Направление 2: Экосистема миссий** 🌐
**Цель:** Создать полноценную платформу для управления миссиями дронов от планирования до постобработки.

**Функции:**
- Облачное хранилище миссий
- Библиотека шаблонов
- Совместная работа команд
- Интеграция с ODM для постобработки
- Мобильное приложение для управления в поле
- Синхронизация с контроллером дрона

**Технологии:**
- Backend: Node.js + PostgreSQL/PostGIS
- Mobile: React Native или Flutter
- Sync: WebSocket для real-time обновлений

**Сложность:** High  
**Ожидаемый эффект:** Переход от инструмента к платформе, повышение retention пользователей

---

### **Направление 3: Поддержка различных сценариев использования** 🎯
**Цель:** Адаптировать приложение под специфические задачи различных индустрий.

**Вертикали:**
- **Сельское хозяйство:** Мультиспектральная съёмка, индексы NDVI, зоны полива
- **Строительство:** Мониторинг прогресса, инспекции, 3D-модели
- **Энергетика:** Инспекция ЛЭП, солнечных панелей, ветряков
- **Спасательные операции:** Быстрый поиск, тепловизионная съёмка

**Для каждой вертикали:**
- Специализированные presets
- Кастомные алгоритмы (например, следование по ЛЭП)
- Специфичная аналитика

**Сложность:** Medium-High  
**Ожидаемый эффект:** Расширение целевой аудитории, возможность монетизации через отраслевые решения

---

### **Направление 4: Интеграция с IoT и автоматизация** 🤖
**Цель:** Полная автоматизация процесса от планирования до выполнения миссии.

**Функции:**
- Автоматическая загрузка миссии на дрон через API
- Мониторинг полёта в реальном времени (телеметрия)
- Автоматический возврат при низком заряде
- Автоматическая отправка снимков на обработку после посадки
- Интеграция с системами управления флотом дронов

**Технологии:**
- DroneKit (Python) — управление дроном
- MAVLink — протокол телеметрии
- MQTT — обмен сообщениями
- WebSocket — real-time обновления

**Сложность:** Very High  
**Ожидаемый эффект:** Enterprise-level решение, возможность автоматизации масштабных операций

---

### **Направление 5: AI-ассистент для планирования** 🧠
**Цель:** Интеллектуальный помощник, который подсказывает оптимальные параметры и предупреждает о проблемах.

**Возможности:**
- "Эта территория слишком велика для одной батареи — рекомендуем разбить на 3 полёта"
- "При текущем ветре (15 м/с восток) рекомендуем ориентировать полосы на 90°"
- "Для фотограмметрии рекомендуем увеличить перекрытие до 70%"
- "Обнаружена no-fly zone в 200м от маршрута — проверьте правила"
- "На основе 127 аналогичных миссий рекомендуемая высота — 65м"

**Технологии:**
- NLP для обработки пользовательских запросов
- ML-модели для рекомендаций
- База знаний (правила, best practices)

**Сложность:** Very High  
**Ожидаемый эффект:** Снижение порога входа для новичков, повышение качества миссий

---

### **Направление 6: Монетизация и бизнес-модель** 💰
**Цель:** Превратить проект в коммерчески успешный продукт.

**Модели:**

1. **Freemium:**
   - Бесплатно: До 10 миссий в месяц, базовые алгоритмы, экспорт в GeoJSON
   - Pro ($19/мес): Неограниченные миссии, продвинутые алгоритмы, все форматы экспорта
   - Enterprise ($99/мес): Облачное хранилище, командная работа, API access, приоритетная поддержка

2. **Pay-per-use:**
   - Плата за каждую сгенерированную миссию ($0.50-$2 в зависимости от сложности)

3. **White-label решения:**
   - Продажа лицензий компаниям, предоставляющим услуги дронов
   - Кастомизация под брендинг заказчика

4. **Marketplace:**
   - Продажа готовых шаблонов миссий
   - Комиссия с продаж

**Сложность:** Medium (бизнес) + High (техническая реализация платёжных систем)  
**Ожидаемый эффект:** Устойчивый доход, возможность развития проекта

---

## 7. Итоговое резюме

### Что проект делает хорошо ✅

1. **Простая и понятная концепция** — чёткая цель, минималистичный MVP
2. **Современные технологии** — актуальный стек, Docker, геопространственные библиотеки
3. **Качественный UI** — приятный дизайн, тёмная тема, адаптивность
4. **Корректная математика** — правильные расчёты FOV, покрытия, перекрытия
5. **Низкий порог входа** — Docker Compose позволяет запустить проект за минуту

### Основные точки роста 📈

1. **Алгоритмическая база** — текущий алгоритм слишком прост, требуется:
   - Адаптивность (рельеф, препятствия, ветер)
   - Оптимизация (время полёта, батарея, порядок облёта)
   - Специализация (разные типы миссий)

2. **Конфигурируемость** — жёсткие параметры камеры и дрона должны стать гибкими

3. **Экспорт и интеграция** — критично для практического применения:
   - Поддержка всех популярных форматов (Litchi, DJI, MAVLink)
   - Интеграция с автопилотами и flight planning софтом

4. **Учёт реальных ограничений** — батарея, время полёта, no-fly zones, погода

5. **Аналитика и валидация** — пользователь должен видеть:
   - Будет ли достаточно батареи
   - Сколько времени займёт миссия
   - Какое качество получится (GSD)
   - Где потенциальные проблемы

6. **Архитектурное масштабирование**:
   - Тесты (unit, integration, e2e)
   - Логирование и мониторинг
   - Обработка ошибок
   - Валидация данных
   - Производительность для больших территорий

### Как вывести проект на следующий уровень 🚀

**Краткосрочно (1-3 месяца):**
1. Устранить все CRITICAL и HIGH приоритетные проблемы
2. Внедрить Quick Wins для быстрого улучшения UX
3. Добавить экспорт в KML/KMZ и Litchi CSV (самые популярные форматы)
4. Реализовать конфигурацию дронов и камер
5. Добавить продольное перекрытие и waypoints вдоль полос
6. Написать тесты для критичной логики

**Среднесрочно (3-6 месяцев):**
1. Внедрить адаптивное направление полос и оптимизацию
2. Реализовать профили миссий (presets)
3. Добавить учёт батареи и разбиение на мульти-полёты
4. Интегрировать погоду и ветер
5. Реализовать terrain following (базовый уровень)
6. Создать backend с БД для хранения миссий
7. Добавить аналитику и детальную статистику миссий

**Долгосрочно (6-12 месяцев):**
1. Внедрить no-fly zones и сложные алгоритмы обхода препятствий
2. Реализовать ML-оптимизацию и AI-ассистента
3. Создать мобильное приложение
4. Интегрироваться с DroneKit/MAVLink для автоматического выполнения
5. Построить экосистему с marketplace шаблонов
6. Запустить коммерческую версию с подписками

**Ключевая рекомендация:**  
Сосредоточьтесь на **практической применимости** — возможности экспортировать миссию и реально её выполнить. Это критично для перехода от "красивого демо" к "полезному инструменту". Параллельно развивайте алгоритмическую базу — именно она будет вашим конкурентным преимуществом.

**Целевые сегменты для MVP+:**
- Операторы дронов-фрилансеры (аэрофотосъёмка, картографирование)
- Малые компании, предоставляющие услуги съёмки
- Студенты и энтузиасты дронов

**Ключевая метрика успеха:**  
Количество реально выполненных миссий, созданных с помощью вашего инструмента.

---

## Приложение: Полезные ресурсы

### Документация и стандарты
- [MAVLink Protocol](https://mavlink.io/en/) — протокол обмена данными с автопилотами
- [QGroundControl](http://qgroundcontrol.com/) — open-source ground control station
- [ArduPilot](https://ardupilot.org/) — open-source автопилот

### Библиотеки и инструменты
- [Turf.js](https://turfjs.org/) — геопространственный анализ
- [Leaflet](https://leafletjs.com/) — карты
- [JSTS](https://github.com/bjornharrtell/jsts) — топологические операции
- [DroneKit](https://dronekit.io/) — Python SDK для управления дронами

### API и данные
- [OpenAIP](https://www.openaip.net/) — аэронавигационные данные
- [Open-Elevation](https://open-elevation.com/) — DEM данные
- [OpenWeatherMap](https://openweathermap.org/) — погода
- [Mapbox](https://www.mapbox.com/) — карты и terrain

### Коммерческие аналоги (для анализа)
- [DroneDeploy](https://www.dronedeploy.com/) — лидер рынка, акцент на строительстве
- [Pix4D](https://www.pix4d.com/) — фотограмметрия и mapping
- [Litchi](https://flylitchi.com/) — популярное приложение для mission planning
- [DJI Pilot 2](https://www.dji.com/dji-pilot) — официальное ПО DJI
- [UgCS](https://www.ugcs.com/) — профессиональный flight planning software

---

**Конец отчёта**  
*Составлен 14 октября 2025*

