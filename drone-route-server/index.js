const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Joi = require('joi');
const turf = require('@turf/turf'); // Подключаем Turf.js для геометрических операций
const { getDroneConfig, isValidModel, getAvailableModels } = require('./config/cameras');
const elevationService = require('./services/elevation-service');

// Подключаем систему логирования
const { app: logger, calculation: calcLogger } = require('./utils/logger');
const { requestLogger, errorLogger, unhandledErrorHandler } = require('./middleware/logging-middleware');
const clientLogsRouter = require('./routes/client-logs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для парсинга и CORS
app.use(bodyParser.json());
app.use(cors());

// Middleware для логирования HTTP запросов
app.use(requestLogger);

// Роут для приёма клиентских логов
app.use('/api/logs', clientLogsRouter);

// Схема валидации для запроса на расчёт маршрута
const calculateRouteSchema = Joi.object({
  territory: Joi.array()
    .items(
      Joi.object({
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required()
      })
    )
    .min(3)
    .max(1000)
    .required()
    .messages({
      'array.min': 'Территория должна содержать минимум 3 точки',
      'array.max': 'Территория не может содержать более 1000 точек',
      'any.required': 'Территория съёмки обязательна'
    }),
  
  shootingType: Joi.string()
    .optional()
    .max(100),
  
  droneModel: Joi.string()
    .optional()
    .max(100),
  
  flightAltitude: Joi.number()
    .min(5)
    .max(400)
    .required()
    .messages({
      'number.min': 'Высота полёта должна быть не менее 5 метров',
      'number.max': 'Высота полёта не может превышать 400 метров',
      'any.required': 'Высота полёта обязательна'
    }),
  
  desiredOverlap: Joi.number()
    .min(0.10)
    .max(0.95)
    .required()
    .messages({
      'number.min': 'Боковое перекрытие должно быть не менее 10%',
      'number.max': 'Боковое перекрытие не может превышать 95%',
      'any.required': 'Боковое перекрытие обязательно'
    }),
  
  forwardOverlap: Joi.number()
    .min(0.50)
    .max(0.95)
    .optional()
    .default(0.7)
    .messages({
      'number.min': 'Продольное перекрытие должно быть не менее 50%',
      'number.max': 'Продольное перекрытие не может превышать 95%'
    }),
  
  enableTerrainFollowing: Joi.boolean()
    .optional()
    .default(false)
});

app.post('/api/calculate-route', async (req, res) => {
  const requestId = req.requestId;
  const startTime = Date.now();
  
  calcLogger.info('Начало обработки запроса на расчёт маршрута', { requestId });
  
  // Валидация входных данных с помощью Joi
  const { error, value } = calculateRouteSchema.validate(req.body, { 
    abortEarly: false, // Вернуть все ошибки, а не только первую
    stripUnknown: true // Удалить неизвестные поля
  });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message).join('; ');
    calcLogger.error('Ошибка валидации входных данных', { 
      requestId,
      errors: errorMessages,
      receivedFields: Object.keys(req.body)
    });
    return res.status(400).json({ 
      success: false, 
      message: 'Ошибка валидации данных', 
      errors: errorMessages 
    });
  }

  const { territory, shootingType, droneModel, enableTerrainFollowing } = value;

  calcLogger.info('Валидация пройдена успешно', { 
    requestId,
    territoryPoints: territory.length,
    shootingType,
    droneModel: droneModel || 'DJI Matrice 30T (по умолчанию)',
    enableTerrainFollowing: enableTerrainFollowing || false
  });
  
  calcLogger.debug('Детали территории', { 
    requestId,
    territoryCoordinates: territory.slice(0, 5), // Первые 5 точек для экономии места
    totalPoints: territory.length
  });

  // Преобразуем массив точек в массив координат для GeoJSON (формат: [lng, lat])
  let coordinates = territory.map(pt => [pt.lng, pt.lat]);
  // Если первый и последний элементы не совпадают, замыкаем полигон
  if (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
      coordinates[0][1] !== coordinates[coordinates.length - 1][1]) {
    coordinates.push(coordinates[0]);
  }
  const polygon = turf.polygon([coordinates]);

  // Вычисляем bounding box полигона: [minX, minY, maxX, maxY]
  const bbox = turf.bbox(polygon);
  
  // Проверяем размер территории
  const territoryArea = turf.area(polygon); // площадь в м²
  const MIN_TERRITORY_AREA = 100; // минимум 100 м² (примерно 10м x 10м)
  const MAX_TERRITORY_AREA = 10000000; // максимум 10 км² (10 млн м²)
  
  calcLogger.debug('Проверка размера территории', {
    requestId,
    territoryArea: `${territoryArea.toFixed(2)} м²`,
    minAllowed: `${MIN_TERRITORY_AREA} м²`,
    maxAllowed: `${(MAX_TERRITORY_AREA/1000000).toFixed(2)} км²`
  });
  
  if (territoryArea < MIN_TERRITORY_AREA) {
    calcLogger.warn('Территория слишком мала', {
      requestId,
      territoryArea: `${territoryArea.toFixed(2)} м²`,
      minRequired: `${MIN_TERRITORY_AREA} м²`
    });
    return res.status(400).json({ 
      success: false, 
      message: `Территория слишком мала для построения маршрута. Минимальная площадь: ${MIN_TERRITORY_AREA} м² (~10×10 м, текущая: ${territoryArea.toFixed(2)} м²). Пожалуйста, выберите большую область.` 
    });
  }
  
  if (territoryArea > MAX_TERRITORY_AREA) {
    const currentAreaKm2 = (territoryArea / 1000000).toFixed(2);
    const maxAreaKm2 = (MAX_TERRITORY_AREA / 1000000).toFixed(2);
    calcLogger.warn('Территория слишком велика', {
      requestId,
      territoryArea: `${currentAreaKm2} км²`,
      maxAllowed: `${maxAreaKm2} км²`
    });
    return res.status(400).json({ 
      success: false, 
      message: `Территория слишком велика для построения маршрута. Максимальная площадь: ${maxAreaKm2} км² (текущая: ${currentAreaKm2} км²). Для больших территорий рекомендуется разбить на несколько миссий.` 
    });
  }
  
  calcLogger.info('Размер территории валиден', {
    requestId,
    territoryArea: `${(territoryArea/1000000).toFixed(4)} км²`
  });

  // --- Интеграция технических параметров дрона и пользовательских параметров ---
  // Получаем модель дрона (по умолчанию DJI Matrice 30T)
  const selectedDroneModel = droneModel || 'DJI Matrice 30T';
  
  // Проверяем, что модель дрона существует
  if (!isValidModel(selectedDroneModel)) {
    calcLogger.error('Неизвестная модель дрона', {
      requestId,
      requestedModel: selectedDroneModel,
      availableModels: getAvailableModels()
    });
    return res.status(400).json({ 
      success: false, 
      message: `Неизвестная модель дрона: ${selectedDroneModel}. Доступные модели: ${getAvailableModels().join(', ')}` 
    });
  }
  
  // Получаем конфигурацию выбранного дрона
  const droneConfig = getDroneConfig(selectedDroneModel);
  const { focalLength, sensorWidth, sensorHeight } = droneConfig.camera;
  
  calcLogger.info('Конфигурация дрона загружена', {
    requestId,
    droneModel: selectedDroneModel,
    camera: {
      focalLength: `${focalLength} мм`,
      sensorWidth: `${sensorWidth} мм`,
      sensorHeight: `${sensorHeight} мм`
    }
  });
  
  // Получаем параметры из запроса (если они не указаны, устанавливаем значения по умолчанию)
  const flightAltitude = Number(value.flightAltitude) || 50;    // м
  const desiredOverlap = Number(value.desiredOverlap) || 0.3;     // доля (0.3 = 30%)
  const forwardOverlap = Number(value.forwardOverlap) || 0.7;     // доля (0.7 = 70%)
  
  calcLogger.debug('Параметры полёта', {
    requestId,
    flightAltitude: `${flightAltitude} м`,
    desiredOverlap: `${(desiredOverlap * 100).toFixed(0)}%`,
    forwardOverlap: `${(forwardOverlap * 100).toFixed(0)}%`
  });

  // Вычисляем горизонтальный угол обзора (в радианах)
  const horizontalFOV = 2 * Math.atan(sensorWidth / (2 * focalLength));
  // Вычисляем вертикальный угол обзора (в радианах)
  const verticalFOV = 2 * Math.atan(sensorHeight / (2 * focalLength));
  
  // Вычисляем ширину области, охватываемой камерой на заданной высоте (в метрах)
  const groundWidth = 2 * flightAltitude * Math.tan(horizontalFOV / 2);
  // Вычисляем длину области, охватываемой камерой на заданной высоте (в метрах)
  const groundLength = 2 * flightAltitude * Math.tan(verticalFOV / 2);
  
  // Эффективное расстояние между полосами съёмки с учётом бокового перекрытия
  const effectiveSpacingMeters = groundWidth * (1 - desiredOverlap);
  // Эффективное расстояние между снимками вдоль полосы с учётом продольного перекрытия
  const forwardSpacingMeters = groundLength * (1 - forwardOverlap);

  // Переводим расстояние из метров в градусы с учётом широты
  // Для широты: 1° ≈ 111320 м (постоянно)
  // Для долготы: 1° ≈ 111320 * cos(latitude) м (зависит от широты)
  const centerLat = (bbox[1] + bbox[3]) / 2; // Средняя широта центра области
  const metersPerDegreeLng = 111320 * Math.cos(centerLat * Math.PI / 180); // Метров на градус долготы
  const effectiveSpacingDegrees = effectiveSpacingMeters / metersPerDegreeLng;

  calcLogger.info('Расчёт параметров съёмки завершён', {
    requestId,
    camera: {
      focalLength: `${focalLength} мм`,
      sensorWidth: `${sensorWidth} мм`,
      sensorHeight: `${sensorHeight} мм`
    },
    flightAltitude: `${flightAltitude} м`,
    fieldOfView: {
      horizontal: `${horizontalFOV.toFixed(4)} rad (${(horizontalFOV * 180 / Math.PI).toFixed(2)}°)`,
      vertical: `${verticalFOV.toFixed(4)} rad (${(verticalFOV * 180 / Math.PI).toFixed(2)}°)`
    },
    groundCoverage: {
      width: `${groundWidth.toFixed(2)} м`,
      length: `${groundLength.toFixed(2)} м`
    },
    spacing: {
      lateral: `${effectiveSpacingMeters.toFixed(2)} м (боковое перекрытие ${(desiredOverlap*100).toFixed(0)}%)`,
      forward: `${forwardSpacingMeters.toFixed(2)} м (продольное перекрытие ${(forwardOverlap*100).toFixed(0)}%)`,
      lateralDegrees: `${effectiveSpacingDegrees.toFixed(8)}°`
    },
    geoCalculations: {
      centerLat: centerLat.toFixed(6),
      metersPerDegreeLng: metersPerDegreeLng.toFixed(2)
    }
  });
  
  calcLogger.trace('Детальные расчёты FOV и покрытия', {
    requestId,
    horizontalFOV_rad: horizontalFOV,
    verticalFOV_rad: verticalFOV,
    groundWidth_m: groundWidth,
    groundLength_m: groundLength,
    effectiveSpacingMeters: effectiveSpacingMeters,
    forwardSpacingMeters: forwardSpacingMeters,
    effectiveSpacingDegrees: effectiveSpacingDegrees
  });

  // --- Построение маршрута ---
  // Константы для защиты от больших территорий
  const MAX_FLIGHT_LINES = 1000; // Максимальное количество полос
  const MAX_EXECUTION_TIME = 30000; // Максимальное время выполнения в миллисекундах (30 секунд)
  
  calcLogger.info('Начало генерации полос маршрута', {
    requestId,
    bbox: {
      minLng: bbox[0].toFixed(6),
      minLat: bbox[1].toFixed(6),
      maxLng: bbox[2].toFixed(6),
      maxLat: bbox[3].toFixed(6)
    },
    effectiveSpacingDegrees: effectiveSpacingDegrees.toFixed(8),
    estimatedLines: Math.ceil((bbox[2] - bbox[0]) / effectiveSpacingDegrees),
    limits: {
      maxLines: MAX_FLIGHT_LINES,
      maxTimeMs: MAX_EXECUTION_TIME
    }
  });
  
  let flightLines = [];
  let lineCount = 0;
  const routeStartTime = Date.now();
  let lastProgressLog = 0;

  // Генерируем вертикальные линии через bounding box с шагом, вычисленным на основе параметров
  for (let x = bbox[0]; x <= bbox[2]; x += effectiveSpacingDegrees) {
    // Проверка на превышение лимита линий
    if (++lineCount > MAX_FLIGHT_LINES) {
      calcLogger.error('Превышен лимит количества полос', {
        requestId,
        lineCount,
        maxAllowed: MAX_FLIGHT_LINES,
        territoryWidth: `${(bbox[2] - bbox[0]).toFixed(6)}°`,
        spacing: `${effectiveSpacingDegrees.toFixed(8)}°`
      });
      return res.status(400).json({ 
        success: false, 
        message: `Территория слишком велика или шаг слишком мал. Максимальное количество полос: ${MAX_FLIGHT_LINES}. Рекомендуем увеличить высоту полёта или уменьшить площадь.` 
      });
    }
    
    // Проверка на превышение времени выполнения
    const currentTime = Date.now() - routeStartTime;
    if (currentTime > MAX_EXECUTION_TIME) {
      calcLogger.error('Превышено максимальное время выполнения', {
        requestId,
        executionTime: `${currentTime}ms`,
        maxAllowed: `${MAX_EXECUTION_TIME}ms`,
        linesProcessed: lineCount
      });
      return res.status(408).json({ 
        success: false, 
        message: 'Время расчёта маршрута превышено. Попробуйте упростить задачу или уменьшить территорию.' 
      });
    }
    
    // Логируем прогресс каждые 10%
    const totalWidth = bbox[2] - bbox[0];
    const currentWidth = x - bbox[0];
    const progressPercent = Math.floor((currentWidth / totalWidth) * 100);
    if (progressPercent >= lastProgressLog + 10 && progressPercent <= 100) {
      calcLogger.debug(`Прогресс генерации полос: ${progressPercent}%`, {
        requestId,
        linesGenerated: flightLines.length,
        linesChecked: lineCount,
        executionTime: `${Date.now() - routeStartTime}ms`
      });
      lastProgressLog = progressPercent;
    }
    // Создаем вертикальную линию от нижней до верхней границы bbox
    const line = turf.lineString([[x, bbox[1]], [x, bbox[3]]]);
    // Находим точки пересечения линии с полигоном
    const intersections = turf.lineIntersect(line, polygon);

    // Если линия пересекает полигон (ожидаем минимум 2 точки), создаём отрезок маршрута
    if (intersections.features.length >= 2) {
      // Извлекаем координаты и сортируем их по оси Y (широта)
      const pts = intersections.features
                      .map(f => f.geometry.coordinates)
                      .sort((a, b) => a[1] - b[1]);

      // Создаем отрезок от самой нижней до самой верхней точки пересечения
      const segment = turf.lineString([pts[0], pts[pts.length - 1]]);
      flightLines.push(segment);
    }
  }

  calcLogger.info('Генерация полос завершена', {
    requestId,
    totalFlightLines: flightLines.length,
    linesChecked: lineCount,
    generationTime: `${Date.now() - routeStartTime}ms`
  });

  if (flightLines.length === 0) {
    calcLogger.error('Не удалось сгенерировать ни одной полосы маршрута', {
      requestId,
      linesChecked: lineCount,
      bbox,
      spacing: effectiveSpacingDegrees
    });
    return res.status(400).json({ success: false, message: 'Не удалось построить маршрут по заданной территории' });
  }

  // Сортируем отрезки по средней X-координате
  flightLines.sort((a, b) => {
    const aAvg = (a.geometry.coordinates[0][0] + a.geometry.coordinates[1][0]) / 2;
    const bAvg = (b.geometry.coordinates[0][0] + b.geometry.coordinates[1][0]) / 2;
    return aAvg - bAvg;
  });
  
  calcLogger.debug('Полосы отсортированы по X-координате', { requestId });

  // Функция для генерации waypoints вдоль линии с заданным интервалом
  function generateWaypoints(startPoint, endPoint, spacingMeters) {
    const waypoints = [];
    const lineLength = turf.distance(turf.point(startPoint), turf.point(endPoint), { units: 'meters' });
    
    // Если линия короче интервала, возвращаем только начало и конец
    if (lineLength <= spacingMeters) {
      return [startPoint, endPoint];
    }
    
    const numPoints = Math.ceil(lineLength / spacingMeters);
    
    // Генерируем точки вдоль линии
    for (let i = 0; i <= numPoints; i++) {
      const fraction = i / numPoints;
      const point = [
        startPoint[0] + (endPoint[0] - startPoint[0]) * fraction,
        startPoint[1] + (endPoint[1] - startPoint[1]) * fraction
      ];
      waypoints.push(point);
    }
    
    return waypoints;
  }

  // Объединяем отрезки в единую зигзагообразную траекторию с waypoints
  // Также создаём массив сегментов для детальной визуализации
  calcLogger.info('Начало генерации waypoints вдоль полос', {
    requestId,
    totalLines: flightLines.length,
    forwardSpacing: `${forwardSpacingMeters.toFixed(2)} м`
  });
  
  let routeCoordinates = [];
  let totalWaypoints = 0;
  let segments = []; // Массив сегментов: {type: 'work'|'transition', coordinates: [...]}
  
  flightLines.forEach((line, index) => {
    const [startPoint, endPoint] = line.geometry.coordinates;
    
    // Генерируем waypoints вдоль линии
    let waypoints = generateWaypoints(startPoint, endPoint, forwardSpacingMeters);
    
    calcLogger.trace(`Полоса ${index + 1}/${flightLines.length}: сгенерировано ${waypoints.length} waypoints`, {
      requestId,
      lineIndex: index,
      waypointsCount: waypoints.length
    });
    
    // Переворачиваем каждую вторую линию для обеспечения непрерывности маршрута
    if (index % 2 === 1) {
      waypoints = waypoints.reverse();
    }
    
    // Если маршрут уже содержит точки, добавляем переход от последней точки к первой точке новой линии
    if (routeCoordinates.length > 0) {
      const lastPoint = routeCoordinates[routeCoordinates.length - 1];
      const firstPointOfNewLine = waypoints[0];
      
      // Создаём сегмент перехода
      segments.push({
        type: 'transition',
        coordinates: [lastPoint, firstPointOfNewLine]
      });
      
      // Добавляем переход в общий маршрут
      routeCoordinates.push(firstPointOfNewLine);
    }
    
    // Создаём рабочий сегмент (полоса съёмки)
    segments.push({
      type: 'work',
      coordinates: waypoints
    });
    
    routeCoordinates = routeCoordinates.concat(waypoints);
    totalWaypoints += waypoints.length;
  });
  
  calcLogger.info('Генерация waypoints завершена', {
    requestId,
    totalWaypoints,
    totalSegments: segments.length,
    workSegments: segments.filter(s => s.type === 'work').length,
    transitionSegments: segments.filter(s => s.type === 'transition').length
  });

  // --- Расчёт расширенных метрик миссии ---
  calcLogger.info('Начало расчёта метрик миссии', { requestId });
  
  // 1. Площадь покрытия (км²)
  const coverageAreaKm2 = (turf.area(polygon) / 1000000).toFixed(2); // м² → км²
  calcLogger.debug('Метрика: Площадь покрытия', { requestId, coverageAreaKm2: `${coverageAreaKm2} км²` });
  
  // 2. Общая длина маршрута (км)
  let totalFlightDistanceMeters = 0;
  for (let i = 1; i < routeCoordinates.length; i++) {
    const dist = turf.distance(
      turf.point(routeCoordinates[i-1]), 
      turf.point(routeCoordinates[i]),
      { units: 'meters' }
    );
    totalFlightDistanceMeters += dist;
  }
  const totalFlightDistanceKm = (totalFlightDistanceMeters / 1000).toFixed(2);
  calcLogger.debug('Метрика: Длина маршрута', { requestId, totalFlightDistanceKm: `${totalFlightDistanceKm} км` });
  
  // 3. GSD (Ground Sample Distance) - разрешение на местности (см/пиксель)
  const { imageWidth } = droneConfig.camera;
  const gsdCmPerPixel = ((groundWidth * 100) / imageWidth).toFixed(2);
  calcLogger.debug('Метрика: GSD', { requestId, gsdCmPerPixel: `${gsdCmPerPixel} см/пиксель`, imageWidth });
  
  // 4. Расчётное время полёта (минуты)
  const droneSpeed = droneConfig.specs.cruiseSpeed; // м/с
  const timeForFlightSec = totalFlightDistanceMeters / droneSpeed;
  const timeForPhotosSec = totalWaypoints * 2; // ~2 секунды на снимок (стабилизация + съёмка)
  const totalTimeSec = timeForFlightSec + timeForPhotosSec;
  const estimatedFlightTimeMin = (totalTimeSec / 60).toFixed(1);
  calcLogger.debug('Метрика: Время полёта', { 
    requestId, 
    estimatedFlightTimeMin: `${estimatedFlightTimeMin} мин`,
    breakdown: {
      flightTime: `${(timeForFlightSec / 60).toFixed(1)} мин`,
      photoTime: `${(timeForPhotosSec / 60).toFixed(1)} мин`
    }
  });
  
  // 5. Количество снимков
  const estimatedPhotos = totalWaypoints;
  calcLogger.debug('Метрика: Количество снимков', { requestId, estimatedPhotos });
  
  // 6. Требуемая память (ГБ) - предполагаем ~20 МБ на RAW снимок
  const bytesPerPhoto = 20 * 1024 * 1024; // 20 МБ в байтах
  const estimatedStorageGB = ((estimatedPhotos * bytesPerPhoto) / (1024 * 1024 * 1024)).toFixed(2);
  calcLogger.debug('Метрика: Требуемая память', { requestId, estimatedStorageGB: `${estimatedStorageGB} ГБ` });
  
  // 7. Использование батареи (%)
  const maxFlightTimeSec = droneConfig.specs.maxFlightTime * 60 * 0.8; // 80% запаса
  const batteryUsagePercent = Math.min(((totalTimeSec / maxFlightTimeSec) * 100), 999).toFixed(0);
  calcLogger.debug('Метрика: Использование батареи', { 
    requestId, 
    batteryUsagePercent: `${batteryUsagePercent}%`,
    maxFlightTime: `${droneConfig.specs.maxFlightTime} мин`
  });
  
  // --- Обработка данных о рельефе (если включена) ---
  let terrainData = null;
  
  if (enableTerrainFollowing) {
    calcLogger.info('Начало обработки данных о рельефе', { requestId });
    
    try {
      // Проверка площади для elevation запросов
      const MAX_ELEVATION_AREA_KM2 = 50; // 50 км²
      if (parseFloat(coverageAreaKm2) > MAX_ELEVATION_AREA_KM2) {
        calcLogger.warn('Территория слишком велика для запроса данных о рельефе', {
          requestId,
          areaKm2: coverageAreaKm2,
          maxAllowed: MAX_ELEVATION_AREA_KM2
        });
        return res.status(400).json({
          success: false,
          message: `Территория слишком велика для учета рельефа (${coverageAreaKm2} км²). Максимум: ${MAX_ELEVATION_AREA_KM2} км². Отключите опцию "Учитывать рельеф" или уменьшите площадь.`
        });
      }
      
      const elevationStartTime = Date.now();
      
      // Получаем данные о высотах для всей территории (сетка для heatmap)
      const gridDensity = Math.min(20, Math.max(10, Math.floor(100 / Math.sqrt(parseFloat(coverageAreaKm2)))));
      calcLogger.debug('Расчет плотности сетки для elevation', {
        requestId,
        gridDensity,
        areaKm2: coverageAreaKm2
      });
      
      const elevationGrid = await elevationService.getElevationForBoundingBox(bbox, gridDensity);
      
      // Получаем данные о высотах вдоль маршрута
      const samplingInterval = Math.max(1, Math.floor(routeCoordinates.length / 500)); // Максимум 500 точек
      const elevationProfile = await elevationService.getElevationAlongRoute(routeCoordinates, samplingInterval);
      
      calcLogger.debug('Данные о рельефе получены', {
        requestId,
        gridPoints: elevationGrid.length,
        profilePoints: elevationProfile.length,
        duration: `${Date.now() - elevationStartTime}ms`
      });
      
      // Вычисляем максимальную и минимальную высоты рельефа
      const elevations = elevationProfile.map(p => p.elevation);
      const maxTerrainElevation = Math.max(...elevations);
      const minTerrainElevation = Math.min(...elevations);
      
      // Рассчитываем абсолютную высоту полета
      // absoluteFlightAltitude = максимальная высота рельефа + заданная относительная высота
      const absoluteFlightAltitude = maxTerrainElevation + flightAltitude;
      
      calcLogger.info('Рассчитана абсолютная высота полета', {
        requestId,
        maxTerrainElevation: `${maxTerrainElevation.toFixed(2)} м`,
        minTerrainElevation: `${minTerrainElevation.toFixed(2)} м`,
        relativeAltitude: `${flightAltitude} м`,
        absoluteFlightAltitude: `${absoluteFlightAltitude.toFixed(2)} м`,
        terrainRange: `${(maxTerrainElevation - minTerrainElevation).toFixed(2)} м`
      });
      
      // Проверка на плоскую местность
      const terrainRange = maxTerrainElevation - minTerrainElevation;
      if (terrainRange < 5) {
        calcLogger.info('Рельеф практически плоский', {
          requestId,
          terrainRange: `${terrainRange.toFixed(2)} м`
        });
      }
      
      terrainData = {
        enabled: true,
        maxTerrainElevation: parseFloat(maxTerrainElevation.toFixed(2)),
        minTerrainElevation: parseFloat(minTerrainElevation.toFixed(2)),
        absoluteFlightAltitude: parseFloat(absoluteFlightAltitude.toFixed(2)),
        relativeAltitude: flightAltitude,
        terrainRange: parseFloat(terrainRange.toFixed(2)),
        elevationProfile: elevationProfile,
        elevationGrid: elevationGrid,
        isFlat: terrainRange < 5
      };
      
      calcLogger.info('Обработка данных о рельефе завершена', {
        requestId,
        duration: `${Date.now() - elevationStartTime}ms`
      });
      
    } catch (error) {
      calcLogger.error('Ошибка при получении данных о рельефе', {
        requestId,
        error: error.message,
        stack: error.stack
      });
      
      return res.status(500).json({
        success: false,
        message: `Не удалось получить данные о рельефе: ${error.message}. Попробуйте построить маршрут без учета рельефа.`
      });
    }
  }
  
  // Финальный лог с результатами
  const executionTime = Date.now() - startTime;
  calcLogger.info('Маршрут построен успешно', {
    requestId,
    summary: {
      flightLines: flightLines.length,
      totalWaypoints,
      coverageArea: `${coverageAreaKm2} км²`,
      flightDistance: `${totalFlightDistanceKm} км`,
      estimatedTime: `${estimatedFlightTimeMin} мин`,
      estimatedPhotos,
      gsd: `${gsdCmPerPixel} см/пиксель`,
      batteryUsage: `${batteryUsagePercent}%`,
      storage: `${estimatedStorageGB} ГБ`,
      terrainEnabled: enableTerrainFollowing,
      executionTime: `${executionTime}ms`
    }
  });

  const routeGeoJSON = {
    type: "Feature",
    properties: {
      droneModel,
      shootingType,
      flightAltitude,
      effectiveSpacingMeters: effectiveSpacingMeters.toFixed(2),
      forwardSpacingMeters: forwardSpacingMeters.toFixed(2),
      groundWidth: groundWidth.toFixed(2),
      groundLength: groundLength.toFixed(2),
      desiredOverlap: (desiredOverlap * 100).toFixed(0),
      forwardOverlap: (forwardOverlap * 100).toFixed(0),
      numberOfLines: flightLines.length,
      totalWaypoints: totalWaypoints,
      executionTime: executionTime,
      // Массив сегментов для детальной визуализации
      segments: segments,
      // Расширенные метрики миссии
      missionStats: {
        coverageAreaKm2: parseFloat(coverageAreaKm2),
        totalFlightDistanceKm: parseFloat(totalFlightDistanceKm),
        estimatedFlightTimeMin: parseFloat(estimatedFlightTimeMin),
        estimatedPhotos: estimatedPhotos,
        estimatedStorageGB: parseFloat(estimatedStorageGB),
        batteryUsagePercent: parseInt(batteryUsagePercent),
        gsdCmPerPixel: parseFloat(gsdCmPerPixel),
        cruiseSpeed: droneSpeed, // Крейсерская скорость дрона для симуляции
      // Технические детали для экспертов
      horizontalFOV: (horizontalFOV * 180 / Math.PI).toFixed(1), // в градусах
      verticalFOV: (verticalFOV * 180 / Math.PI).toFixed(1) // в градусах
    },
    // Данные о рельефе (если включено)
    terrainData: terrainData
  },
  geometry: {
    type: "LineString",
    coordinates: routeCoordinates
  }
};

  calcLogger.info('Отправка ответа клиенту', {
    requestId,
    responseSize: `${JSON.stringify(routeGeoJSON).length} bytes`
  });

  return res.json({
    success: true,
    route: routeGeoJSON
  });
});

// Middleware для обработки ошибок
app.use(errorLogger);
app.use(unhandledErrorHandler);

// Запуск сервера
app.listen(PORT, () => {
  logger.info('Сервер успешно запущен', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'debug',
    timestamp: new Date().toISOString()
  });
  logger.info('Доступные endpoints:', {
    routes: [
      'POST /api/calculate-route - Расчёт маршрута полёта',
      'POST /api/logs/client - Приём клиентских логов'
    ]
  });
});
