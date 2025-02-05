const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const turf = require('@turf/turf');

const app = express();
const PORT = process.env.PORT || 3000;

// Подключаем middleware для разбора JSON и разрешения CORS
app.use(bodyParser.json());
app.use(cors());

// Пример эндпоинта для расчёта маршрута
app.post('/api/calculate-route', (req, res) => {
  // Ожидаем, что в теле запроса придут:
  // - territory: координаты выделенной территории
  // - shootingType: тип площадной съемки (если понадобится)
  // - droneModel: выбранная модель дрона (например, DJI Matrice 30T)
  const { territory, shootingType, droneModel } = req.body;

  console.log('Получены данные:');
  console.log('Territory:', territory);
  console.log('Shooting Type:', shootingType);
  console.log('Drone Model:', droneModel);

  // Здесь будет происходить расчет маршрута
  // Для демонстрации сформируем упрощенный "маршрут" на основе полученных данных.
  // Например, можно вернуть GeoJSON с линией, проходящей через центр выделенной территории.

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

  // Определяем шаг между линиями. Этот параметр можно рассчитать на основе параметров камеры.
  // Здесь для демонстрации используется фиксированное значение (в градусах).
  const spacing = 0.002; // Примерное значение; в реальном проекте этот шаг подбирается исходя из размеров кадра

  let flightLines = [];

  // Генерируем вертикальные линии через bounding box с шагом spacing
  for (let x = bbox[0]; x <= bbox[2]; x += spacing) {
    // Создаём вертикальную линию от нижней до верхней границы bbox
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
    // Для обеспечения непрерывности маршрута переворачиваем каждую вторую линию
    if (index % 2 === 1) {
      coords = coords.reverse();
    }
    // Если маршрут уже содержит точки, добавляем соединительную точку, чтобы "сшить" отрезки
    if (routeCoordinates.length > 0) {
      routeCoordinates.push(routeCoordinates[routeCoordinates.length - 1]);
    }
    routeCoordinates = routeCoordinates.concat(coords);
  });


  const routeGeoJSON = {
    type: "Feature",
    properties: {
      droneModel,
      shootingType
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

  // // Пример простого расчёта: возьмем среднее значение координат выделенного полигона
  // let latSum = 0, lngSum = 0, count = 0;
  // territory.forEach(point => {
  //   // предполагаем, что point имеет вид { lat: число, lng: число }
  //   latSum += point.lat;
  //   lngSum += point.lng;
  //   count++;
  // });
  // const center = { lat: latSum / count, lng: lngSum / count };

  // // Формируем упрощенный маршрут: линия от центра выделенной области к его смещенной копии
  // const routeGeoJSON = {
  //   type: "Feature",
  //   properties: {
  //     droneModel,
  //     shootingType
  //   },
  //   geometry: {
  //     type: "LineString",
  //     coordinates: [
  //       [center.lng, center.lat],
  //       [center.lng + 0.01, center.lat + 0.01] // смещенная точка для демонстрации
  //     ]
  //   }
  // };

  // return res.json({
  //   success: true,
  //   route: routeGeoJSON
  // });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
