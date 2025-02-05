const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const turf = require('@turf/turf'); // Подключаем Turf.js для геометрических операций

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

app.post('/api/calculate-route', (req, res) => {
  const { territory, shootingType, droneModel } = req.body;

  console.log('Получены данные:');
  console.log('Territory:', territory);
  console.log('Shooting Type:', shootingType);
  console.log('Drone Model:', droneModel);

  // Проверка входных данных: для полигона должно быть минимум 3 точки
  if (!territory || !Array.isArray(territory) || territory.length < 3) {
    return res.status(400).json({ success: false, message: 'Не указана корректная территория съемки' });
  }

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
  // Параметры DJI Matrice 30T (ориентировочно)
  const focalLength = 4.5;   // мм
  const sensorWidth = 7.6;   // мм
  
  // Получаем параметры из запроса (если они не указаны, устанавливаем значения по умолчанию)
  const flightAltitude = Number(req.body.flightAltitude) || 50;    // м
  const desiredOverlap = Number(req.body.desiredOverlap) || 0.3;     // доля (0.3 = 30%)

  // Вычисляем горизонтальный угол обзора (в радианах)
  const horizontalFOV = 2 * Math.atan(sensorWidth / (2 * focalLength));
  // Вычисляем ширину области, охватываемой камерой на заданной высоте (в метрах)
  const groundWidth = 2 * flightAltitude * Math.tan(horizontalFOV / 2);
  // Эффективное расстояние между полосами съёмки с учётом перекрытия
  const effectiveSpacingMeters = groundWidth * (1 - desiredOverlap);

  // Переводим расстояние из метров в градусы (приблизительно для широты: 1° ≈ 111320 м)
  const effectiveSpacingDegrees = effectiveSpacingMeters / 111320;

  console.log('Расчет параметров съемки:');
  console.log(`Фокусное расстояние: ${focalLength} мм`);
  console.log(`Ширина матрицы: ${sensorWidth} мм`);
  console.log(`Высота полёта: ${flightAltitude} м`);
  console.log(`Горизонтальный угол обзора (rad): ${horizontalFOV.toFixed(4)}`);
  console.log(`Земная ширина кадра: ${groundWidth.toFixed(2)} м`);
  console.log(`Эффективный шаг между полосами: ${effectiveSpacingMeters.toFixed(2)} м (${effectiveSpacingDegrees.toFixed(6)}°)`);

  // --- Построение маршрута ---
  let flightLines = [];

  // Генерируем вертикальные линии через bounding box с шагом, вычисленным на основе параметров
  for (let x = bbox[0]; x <= bbox[2]; x += effectiveSpacingDegrees) {
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

  const routeGeoJSON = {
    type: "Feature",
    properties: {
      droneModel,
      shootingType,
      flightAltitude, // информация о высоте полёта
      effectiveSpacingMeters: effectiveSpacingMeters.toFixed(2)
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
