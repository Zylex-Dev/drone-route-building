// Инициализация карты с центром в Коломне
const kolomnaCoords = [55.095276, 38.765574];

// Создаем два слоя: светлый и альтернативный темный (Esri World Dark Gray Canvas)
const lightTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
});

const darkTileLayer = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 16,
  attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
}
);

// Инициализируем карту с светлым слоем по умолчанию
const map = L.map('map', { layers: [lightTileLayer] }).setView(kolomnaCoords, 13);

// Маркер центра Коломны (опционально)
L.marker(kolomnaCoords).addTo(map)
  .bindPopup('Коломна')
  .openPopup();

// Группа для хранения нарисованных объектов
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Слой для отображения маршрута
let routeLayer = null;
// Переменные для маркеров начала и конца маршрута
let startMarker = null;
let endMarker = null;

// Настройка панели рисования
const drawControl = new L.Control.Draw({
  edit: {
    featureGroup: drawnItems,
    remove: true
  },
  draw: {
    polygon: {
      allowIntersection: false,
      showArea: true,
      drawError: {
        color: '#e1e100',
        message: '<strong>Ошибка:</strong> Полигон пересекается сам с собой!'
      },
      shapeOptions: {
        color: '#5a2a83'
      }
    },
    rectangle: { shapeOptions: { color: '#5a2a83' } },
    polyline: false,
    circle: false,
    marker: false,
    circlemarker: false
  }
});
map.addControl(drawControl);

// Функция для удаления всех нарисованных объектов, маршрута и маркеров
// а также сброса информации в карточке параметров съемки
function clearAllObjects() {
  drawnItems.clearLayers();

  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }
  if (startMarker) {
    map.removeLayer(startMarker);
    startMarker = null;
  }
  if (endMarker) {
    map.removeLayer(endMarker);
    endMarker = null;
  }

  // Сброс значений в информационной карточке
  document.getElementById('altitudeInfo').textContent = 'Высота полёта: - м';
  document.getElementById('fovInfo').textContent = 'Горизонтальный угол обзора (rad): -';
  document.getElementById('groundWidthInfo').textContent = 'Земная ширина кадра: - м';
  document.getElementById('spacingInfo').textContent = 'Эффективный шаг между полосами: - м';
}

// Привязываем событие к кнопке "Удалить всё"
document.getElementById('clearAll').addEventListener('click', clearAllObjects);

// Функция проверки корректности введённых значений
function validateInputs(flightAltitude, desiredOverlap) {
  if (isNaN(flightAltitude) || flightAltitude < 10 || flightAltitude > 500) {
    alert('Высота полёта должна быть числом в диапазоне от 10 до 500 метров.');
    return false;
  }
  if (isNaN(desiredOverlap) || desiredOverlap < 0 || desiredOverlap >= 100) {
    alert('Перекрытие должно быть числом в диапазоне от 0 до 99%.');
    return false;
  }
  return true;
}

// Обработка завершения рисования объекта
map.on(L.Draw.Event.CREATED, function (event) {
  const layer = event.layer;
  drawnItems.addLayer(layer);

  // Удаляем ранее построенный маршрут и маркеры, если есть
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }
  if (startMarker) {
    map.removeLayer(startMarker);
    startMarker = null;
  }
  if (endMarker) {
    map.removeLayer(endMarker);
    endMarker = null;
  }

  // Получаем координаты выделенной территории
  const territoryLatLngs = layer.getLatLngs()[0];
  const territoryPoints = territoryLatLngs.map(latlng => ({
    lat: latlng.lat,
    lng: latlng.lng
  }));

  // Дополнительные параметры для запроса
  const shootingType = 'Панорамная съемка';
  const droneModel = 'DJI Matrice 30T';
  const flightAltitude = Number(document.getElementById('flightAltitude').value);
  const desiredOverlapInput = Number(document.getElementById('desiredOverlap').value);

  if (!validateInputs(flightAltitude, desiredOverlapInput)) {
    return;
  }
  const desiredOverlap = desiredOverlapInput / 100;

  // Отправка POST-запроса на сервер
  fetch('http://localhost:3000/api/calculate-route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      territory: territoryPoints,
      shootingType,
      droneModel,
      flightAltitude,
      desiredOverlap
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Отображаем маршрут на карте
        routeLayer = L.geoJSON(data.route, {
          style: () => ({ color: '#007bff', weight: 4 })
        }).addTo(map);
        map.fitBounds(routeLayer.getBounds());

        // Обновляем информацию в панели
        document.getElementById('altitudeInfo').textContent = 'Высота полёта: ' + flightAltitude + ' м';
        const horizontalFOV = (2 * Math.atan(7.6 / (2 * 4.5))).toFixed(4);
        document.getElementById('fovInfo').textContent = 'Горизонтальный угол обзора (rad): ' + horizontalFOV;
        const groundWidth = (2 * flightAltitude * Math.tan((2 * Math.atan(7.6 / (2 * 4.5))) / 2)).toFixed(2);
        document.getElementById('groundWidthInfo').textContent = 'Земная ширина кадра: ' + groundWidth + ' м';
        document.getElementById('spacingInfo').textContent = 'Эффективный шаг между полосами: ' + data.route.properties.effectiveSpacingMeters + ' м';

        // Добавляем маркировку начала и конца маршрута
        const coords = data.route.geometry.coordinates;
        if (coords && coords.length > 0) {
          const startPoint = [coords[0][1], coords[0][0]];
          const endPoint = [coords[coords.length - 1][1], coords[coords.length - 1][0]];
          startMarker = L.circleMarker(startPoint, {
            radius: 8,
            color: '#28a745',
            fillColor: '#28a745',
            fillOpacity: 1
          }).addTo(map).bindPopup("Начало маршрута");
          endMarker = L.circleMarker(endPoint, {
            radius: 8,
            color: '#dc3545',
            fillColor: '#dc3545',
            fillOpacity: 1
          }).addTo(map).bindPopup("Конец маршрута");
        }
      } else {
        alert('Ошибка при расчёте маршрута: ' + data.message);
      }
    })
    .catch(error => {
      console.error('Ошибка соединения с сервером:', error);
      alert('Ошибка соединения с сервером: ' + error);
    });
});

// Функция для переключения темы, включая смену тайлов карты
const themeToggleButton = document.getElementById('themeToggle');
themeToggleButton.addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  if (document.body.classList.contains('dark-theme')) {
    themeToggleButton.textContent = 'Светлая тема';
    // Переключаем карту на темный вариант
    map.removeLayer(lightTileLayer);
    darkTileLayer.addTo(map);
  } else {
    themeToggleButton.textContent = 'Темная тема';
    // Переключаем карту на светлый вариант
    map.removeLayer(darkTileLayer);
    lightTileLayer.addTo(map);
  }
});
