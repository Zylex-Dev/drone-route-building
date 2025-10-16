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

// Объект для хранения визуализации маршрута
let currentRouteVisualization = null;

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
// а также сброса информации в карточке параметров съемки и настроек
function clearAllObjects() {
  // Удаляем все нарисованные объекты с карты
  drawnItems.clearLayers();

  // Очищаем визуализацию маршрута
  if (currentRouteVisualization) {
    clearRouteVisualization(map, currentRouteVisualization);
    currentRouteVisualization = null;
  }

  // Сброс настроек полёта к дефолтным значениям
  document.getElementById('flightAltitude').value = 50;
  document.getElementById('desiredOverlap').value = 30;
  document.getElementById('forwardOverlap').value = 70;
  document.getElementById('droneModel').value = 'DJI Matrice 30T';
  
  // Обновляем параметры камеры для дефолтной модели
  updateCameraInfo('DJI Matrice 30T');

  // УРОВЕНЬ 1: Очистка информации о миссии
  document.getElementById('coverageArea').textContent = '-';
  document.getElementById('flightDistance').textContent = '-';
  document.getElementById('flightTime').textContent = '-';
  document.getElementById('photoCount').textContent = '-';
  document.getElementById('storageRequired').textContent = '-';
  const batteryElement = document.getElementById('batteryUsage');
  batteryElement.textContent = '-';
  batteryElement.className = 'metric-value battery-indicator';

  // УРОВЕНЬ 2: Очистка параметров покрытия
  document.getElementById('frameSize').textContent = '-';
  document.getElementById('gsd').textContent = '-';
  document.getElementById('spacingInfo').textContent = '-';
  document.getElementById('forwardSpacingInfo').textContent = '-';
  document.getElementById('sidelapDisplay').textContent = '-';
  document.getElementById('forwardlapDisplay').textContent = '-';
  document.getElementById('numberOfLines').textContent = '-';

  // УРОВЕНЬ 3: Очистка технических параметров (часть обновится через updateCameraInfo)
  document.getElementById('droneModelDisplay').textContent = '-';
  document.getElementById('fovHorizontal').textContent = '-';
  document.getElementById('fovVertical').textContent = '-';
  document.getElementById('altitudeInfo').textContent = '-';
}

// Привязываем событие к кнопке "Удалить миссию"
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
  if (currentRouteVisualization) {
    clearRouteVisualization(map, currentRouteVisualization);
    currentRouteVisualization = null;
  }

  // Получаем координаты выделенной территории
  const territoryLatLngs = layer.getLatLngs()[0];
  const territoryPoints = territoryLatLngs.map(latlng => ({
    lat: latlng.lat,
    lng: latlng.lng
  }));

  // Дополнительные параметры для запроса
  const shootingType = 'Панорамная съемка';
  const droneModel = document.getElementById('droneModel').value;
  const flightAltitude = Number(document.getElementById('flightAltitude').value);
  const desiredOverlapInput = Number(document.getElementById('desiredOverlap').value);
  const forwardOverlapInput = Number(document.getElementById('forwardOverlap').value);

  if (!validateInputs(flightAltitude, desiredOverlapInput)) {
    return;
  }
  const desiredOverlap = desiredOverlapInput / 100;
  const forwardOverlap = forwardOverlapInput / 100;

  // Отправка POST-запроса на сервер
  const apiUrl = `${window.APP_CONFIG.API_BASE_URL}${window.APP_CONFIG.API_ENDPOINTS.CALCULATE_ROUTE}`;
  fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      territory: territoryPoints,
      shootingType,
      droneModel,
      flightAltitude,
      desiredOverlap,
      forwardOverlap
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Используем улучшенную визуализацию маршрута
        currentRouteVisualization = visualizeEnhancedRoute(map, data.route);
        
        // Добавляем слои и маркеры на карту
        if (currentRouteVisualization) {
          if (currentRouteVisualization.layers) {
            currentRouteVisualization.layers.addTo(map);
            map.fitBounds(currentRouteVisualization.layers.getBounds());
          }
          if (currentRouteVisualization.startMarker) {
            currentRouteVisualization.startMarker.addTo(map);
          }
          if (currentRouteVisualization.endMarker) {
            currentRouteVisualization.endMarker.addTo(map);
          }
        }

        // Обновляем информацию в панели
        const specs = getDroneSpecs(droneModel);
        const props = data.route.properties;
        const stats = props.missionStats;
        
        // УРОВЕНЬ 1: Информация о миссии
        document.getElementById('coverageArea').textContent = `${stats.coverageAreaKm2} км²`;
        document.getElementById('flightDistance').textContent = `${stats.totalFlightDistanceKm} км`;
        document.getElementById('flightTime').textContent = `${stats.estimatedFlightTimeMin} мин`;
        document.getElementById('photoCount').textContent = `${stats.estimatedPhotos} шт`;
        document.getElementById('storageRequired').textContent = `${stats.estimatedStorageGB} ГБ`;
        
        // Индикатор батареи с цветовым кодированием
        const batteryPercent = stats.batteryUsagePercent;
        const batteryElement = document.getElementById('batteryUsage');
        const batteryItem = document.getElementById('batteryItem');
        
        batteryElement.textContent = `${batteryPercent}%`;
        batteryElement.className = 'metric-value battery-indicator';
        
        if (batteryPercent <= 70) {
          batteryElement.classList.add('battery-ok');
        } else if (batteryPercent <= 95) {
          batteryElement.classList.add('battery-warning');
        } else {
          batteryElement.classList.add('battery-critical');
        }
        
        // УРОВЕНЬ 2: Параметры покрытия
        document.getElementById('frameSize').textContent = `${props.groundWidth} × ${props.groundLength} м`;
        document.getElementById('gsd').textContent = `${stats.gsdCmPerPixel} см/пиксель`;
        document.getElementById('spacingInfo').textContent = `${props.effectiveSpacingMeters} м`;
        document.getElementById('forwardSpacingInfo').textContent = `${props.forwardSpacingMeters} м`;
        document.getElementById('sidelapDisplay').textContent = `${props.desiredOverlap}%`;
        document.getElementById('forwardlapDisplay').textContent = `${props.forwardOverlap}%`;
        document.getElementById('numberOfLines').textContent = `${props.numberOfLines} шт`;
        
        // УРОВЕНЬ 3: Технические параметры
        document.getElementById('droneModelDisplay').textContent = droneModel;
        document.getElementById('focalLength').textContent = `${specs.focalLength} мм`;
        document.getElementById('sensorSize').textContent = `${specs.sensorWidth} × ${specs.sensorWidth} мм`;
        document.getElementById('fovHorizontal').textContent = `${stats.horizontalFOV}°`;
        document.getElementById('fovVertical').textContent = `${stats.verticalFOV}°`;
        document.getElementById('altitudeInfo').textContent = `${props.flightAltitude} м`;
      } else {
        alert('Ошибка при расчёте маршрута: ' + data.message);
      }
    })
    .catch(error => {
      console.error('Ошибка соединения с сервером:', error);
      alert('Ошибка соединения с сервером: ' + error);
    });
});

// Event listener для изменения модели дрона
document.getElementById('droneModel').addEventListener('change', (e) => {
  updateCameraInfo(e.target.value);
});

// Инициализация параметров камеры при загрузке страницы
updateCameraInfo('DJI Matrice 30T');

// --- Функции для интерактивности боковой панели ---

// Функция для сворачивания/разворачивания секций
function setupCollapsibleSections() {
  // Секция "Параметры покрытия"
  const coverageToggle = document.getElementById('coverageToggle');
  const coverageContent = document.getElementById('coverageContent');
  
  if (coverageToggle && coverageContent) {
    coverageToggle.addEventListener('click', function() {
      const icon = this.querySelector('.toggle-icon');
      if (coverageContent.classList.contains('collapsed')) {
        coverageContent.classList.remove('collapsed');
        coverageContent.style.display = 'block';
        icon.textContent = '▼';
        icon.classList.remove('rotated');
      } else {
        coverageContent.classList.add('collapsed');
        setTimeout(() => {
          coverageContent.style.display = 'none';
        }, 300);
        icon.textContent = '▶';
        icon.classList.add('rotated');
      }
    });
  }
  
  // Секция "Технические параметры"
  const techToggle = document.getElementById('techToggle');
  const techContent = document.getElementById('techContent');
  
  if (techToggle && techContent) {
    techToggle.addEventListener('click', function() {
      const icon = this.querySelector('.toggle-icon');
      if (techContent.classList.contains('collapsed')) {
        techContent.classList.remove('collapsed');
        techContent.style.display = 'block';
        icon.textContent = '▼';
        icon.classList.remove('rotated');
      } else {
        techContent.classList.add('collapsed');
        setTimeout(() => {
          techContent.style.display = 'none';
        }, 300);
        icon.textContent = '▶';
        icon.classList.add('rotated');
      }
    });
  }
}

// Инициализация сворачиваемых секций при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
  setupCollapsibleSections();
});

// Функция для переключения темы, включая смену тайлов карты
const themeToggleButton = document.getElementById('themeToggle');

themeToggleButton.addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');

  if (document.body.classList.contains('dark-theme')) {
    // Если включена темная тема — показываем эмодзи солнца (для перехода на светлую)
    themeToggleButton.innerHTML = '☀️ Светлая тема';
    // Переключаем карту на темный вариант
    map.removeLayer(lightTileLayer);
    darkTileLayer.addTo(map);
  } else {
    // Если включена светлая тема — показываем эмодзи луны (для перехода на темную)
    themeToggleButton.innerHTML = '🌙 Темная тема';
    // Переключаем карту на светлый вариант
    map.removeLayer(darkTileLayer);
    lightTileLayer.addTo(map);
  }
});
