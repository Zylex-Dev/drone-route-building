const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Joi = require('joi');
const turf = require('@turf/turf'); // Подключаем Turf.js для геометрических операций
const { getDroneConfig, isValidModel, getAvailableModels } = require('./config/cameras');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

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
    .min(10)
    .max(500)
    .required()
    .messages({
      'number.min': 'Высота полёта должна быть не менее 10 метров',
      'number.max': 'Высота полёта не может превышать 500 метров',
      'any.required': 'Высота полёта обязательна'
    }),
  
  desiredOverlap: Joi.number()
    .min(0)
    .max(0.99)
    .required()
    .messages({
      'number.min': 'Перекрытие не может быть отрицательным',
      'number.max': 'Перекрытие не может превышать 99%',
      'any.required': 'Перекрытие обязательно'
    })
});

app.post('/api/calculate-route', (req, res) => {
  // Валидация входных данных с помощью Joi
  const { error, value } = calculateRouteSchema.validate(req.body, { 
    abortEarly: false, // Вернуть все ошибки, а не только первую
    stripUnknown: true // Удалить неизвестные поля
  });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message).join('; ');
    console.error('Ошибка валидации:', errorMessages);
    return res.status(400).json({ 
      success: false, 
      message: 'Ошибка валидации данных', 
      errors: errorMessages 
    });
  }

  const { territory, shootingType, droneModel } = value;

  console.log('Получены данные:');
  console.log('Territory:', territory);
  console.log('Shooting Type:', shootingType);
  console.log('Drone Model:', droneModel);

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

  // --- Интеграция технических параметров дрона и пользовательских параметров ---
  // Получаем модель дрона (по умолчанию DJI Matrice 30T)
  const selectedDroneModel = droneModel || 'DJI Matrice 30T';
  
  // Проверяем, что модель дрона существует
  if (!isValidModel(selectedDroneModel)) {
    return res.status(400).json({ 
      success: false, 
      message: `Неизвестная модель дрона: ${selectedDroneModel}. Доступные модели: ${getAvailableModels().join(', ')}` 
    });
  }
  
  // Получаем конфигурацию выбранного дрона
  const droneConfig = getDroneConfig(selectedDroneModel);
  const { focalLength, sensorWidth } = droneConfig.camera;
  
  // Получаем параметры из запроса (если они не указаны, устанавливаем значения по умолчанию)
  const flightAltitude = Number(req.body.flightAltitude) || 50;    // м
  const desiredOverlap = Number(req.body.desiredOverlap) || 0.3;     // доля (0.3 = 30%)

  // Вычисляем горизонтальный угол обзора (в радианах)
  const horizontalFOV = 2 * Math.atan(sensorWidth / (2 * focalLength));
  // Вычисляем ширину области, охватываемой камерой на заданной высоте (в метрах)
  const groundWidth = 2 * flightAltitude * Math.tan(horizontalFOV / 2);
  // Эффективное расстояние между полосами съёмки с учётом перекрытия
  const effectiveSpacingMeters = groundWidth * (1 - desiredOverlap);

  // Переводим расстояние из метров в градусы с учётом широты
  // Для широты: 1° ≈ 111320 м (постоянно)
  // Для долготы: 1° ≈ 111320 * cos(latitude) м (зависит от широты)
  const centerLat = (bbox[1] + bbox[3]) / 2; // Средняя широта центра области
  const metersPerDegreeLng = 111320 * Math.cos(centerLat * Math.PI / 180); // Метров на градус долготы
  const effectiveSpacingDegrees = effectiveSpacingMeters / metersPerDegreeLng;

  console.log('Расчет параметров съемки:');
  console.log(`Фокусное расстояние: ${focalLength} мм`);
  console.log(`Ширина матрицы: ${sensorWidth} мм`);
  console.log(`Высота полёта: ${flightAltitude} м`);
  console.log(`Горизонтальный угол обзора (rad): ${horizontalFOV.toFixed(4)}`);
  console.log(`Земная ширина кадра: ${groundWidth.toFixed(2)} м`);
  console.log(`Эффективный шаг между полосами: ${effectiveSpacingMeters.toFixed(2)} м (${effectiveSpacingDegrees.toFixed(6)}°)`);

  // --- Построение маршрута ---
  // Константы для защиты от больших территорий
  const MAX_FLIGHT_LINES = 1000; // Максимальное количество полос
  const MAX_EXECUTION_TIME = 30000; // Максимальное время выполнения в миллисекундах (30 секунд)
  
  let flightLines = [];
  let lineCount = 0;
  const startTime = Date.now();

  // Генерируем вертикальные линии через bounding box с шагом, вычисленным на основе параметров
  for (let x = bbox[0]; x <= bbox[2]; x += effectiveSpacingDegrees) {
    // Проверка на превышение лимита линий
    if (++lineCount > MAX_FLIGHT_LINES) {
      console.error(`Превышен лимит линий: ${lineCount} > ${MAX_FLIGHT_LINES}`);
      return res.status(400).json({ 
        success: false, 
        message: `Территория слишком велика или шаг слишком мал. Максимальное количество полос: ${MAX_FLIGHT_LINES}. Рекомендуем увеличить высоту полёта или уменьшить площадь.` 
      });
    }
    
    // Проверка на превышение времени выполнения
    if (Date.now() - startTime > MAX_EXECUTION_TIME) {
      console.error(`Превышено время выполнения: ${Date.now() - startTime}ms > ${MAX_EXECUTION_TIME}ms`);
      return res.status(408).json({ 
        success: false, 
        message: 'Время расчёта маршрута превышено. Попробуйте упростить задачу или уменьшить территорию.' 
      });
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

  if (flightLines.length === 0) {
    return res.status(400).json({ success: false, message: 'Не удалось построить маршрут по заданной территории' });
  }

  // Сортируем отрезки по средней X-координате
  flightLines.sort((a, b) => {
    const aAvg = (a.geometry.coordinates[0][0] + a.geometry.coordinates[1][0]) / 2;
    const bAvg = (b.geometry.coordinates[0][0] + b.geometry.coordinates[1][0]) / 2;
    return aAvg - bAvg;
  });

  // Объединяем отрезки в единую зигзагообразную траекторию
  let routeCoordinates = [];
  flightLines.forEach((line, index) => {
    let coords = line.geometry.coordinates;
    // Переворачиваем каждую вторую линию для обеспечения непрерывности маршрута
    if (index % 2 === 1) {
      coords = coords.reverse();
    }
    // Если маршрут уже содержит точки, добавляем последнюю точку для "сшивки" отрезков
    if (routeCoordinates.length > 0) {
      routeCoordinates.push(routeCoordinates[routeCoordinates.length - 1]);
    }
    routeCoordinates = routeCoordinates.concat(coords);
  });

  // Логирование результатов
  const executionTime = Date.now() - startTime;
  console.log(`Маршрут построен успешно:`);
  console.log(`- Количество полос: ${flightLines.length}`);
  console.log(`- Время выполнения: ${executionTime}ms`);
  console.log(`- Длина маршрута: ${routeCoordinates.length} точек`);

  const routeGeoJSON = {
    type: "Feature",
    properties: {
      droneModel,
      shootingType,
      flightAltitude, // информация о высоте полёта
      effectiveSpacingMeters: effectiveSpacingMeters.toFixed(2),
      numberOfLines: flightLines.length,
      executionTime: executionTime
    },
    geometry: {
      type: "LineString",
      coordinates: routeCoordinates
    }
  };

  return res.json({
    success: true,
    route: routeGeoJSON
  });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
