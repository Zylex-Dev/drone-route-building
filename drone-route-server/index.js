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
