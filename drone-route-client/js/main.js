// Инициализация карты с центром в Коломне
const kolomnaCoords = [55.095276, 38.765574];

// Создаем слой карты OpenStreetMap
const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
});

// Инициализируем карту
const map = L.map('map', { layers: [tileLayer] }).setView(kolomnaCoords, 13);

// Маркер центра Коломны (опционально)
L.marker(kolomnaCoords).addTo(map)
  .bindPopup('Коломна')
  .openPopup();

// Группа для хранения нарисованных объектов
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Объект для хранения визуализации маршрута
let currentRouteVisualization = null;

// Объект для хранения симулятора полёта
let flightSimulator = null;
let currentRouteData = null; // Сохраняем данные маршрута для симуляции

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
        color: '#6c757d',
        fillColor: '#8e9aab',
        fillOpacity: 0.3
      }
    },
    rectangle: { 
      shapeOptions: { 
        color: '#6c757d', 
        fillColor: '#8e9aab', 
        fillOpacity: 0.3
      } 
    },
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
  
  // Скрываем панель управления визуализацией
  hideVisualizationPanel();

  // Останавливаем и очищаем симулятор, если он запущен
  if (flightSimulator) {
    flightSimulator.stop();
    flightSimulator = null;
  }
  currentRouteData = null;
  
  // Скрываем панель симуляции
  const simPanel = document.getElementById('flightSimulationPanel');
  if (simPanel) {
    simPanel.style.display = 'none';
  }
  
  // Отключаем кнопку симуляции
  document.getElementById('startSimulation').disabled = true;

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
function validateInputs(flightAltitude, desiredOverlap, forwardOverlap) {
  if (isNaN(flightAltitude) || flightAltitude < 5 || flightAltitude > 400) {
    alert('Высота полёта должна быть числом в диапазоне от 5 до 400 метров.');
    return false;
  }
  if (isNaN(desiredOverlap) || desiredOverlap < 10 || desiredOverlap > 95) {
    alert('Боковое перекрытие должно быть числом в диапазоне от 10 до 95%.');
    return false;
  }
  if (forwardOverlap !== undefined && (isNaN(forwardOverlap) || forwardOverlap < 50 || forwardOverlap > 95)) {
    alert('Продольное перекрытие должно быть числом в диапазоне от 50 до 95%.');
    return false;
  }
  return true;
}

// === Управление панелью визуализации ===

// Функция для показа/скрытия панели управления визуализацией
function showVisualizationPanel() {
  const panel = document.getElementById('visualizationControlPanel');
  if (panel) {
    panel.style.display = 'block';
  }
}

function hideVisualizationPanel() {
  const panel = document.getElementById('visualizationControlPanel');
  if (panel) {
    panel.style.display = 'none';
  }
}

// Кнопка сворачивания/разворачивания панели
const togglePanelBtn = document.getElementById('toggleControlPanel');
const controlPanelContent = document.getElementById('controlPanelContent');

if (togglePanelBtn && controlPanelContent) {
  togglePanelBtn.addEventListener('click', () => {
    if (controlPanelContent.classList.contains('collapsed')) {
      controlPanelContent.classList.remove('collapsed');
      togglePanelBtn.textContent = '▼';
      togglePanelBtn.title = 'Свернуть';
    } else {
      controlPanelContent.classList.add('collapsed');
      togglePanelBtn.textContent = '▶';
      togglePanelBtn.title = 'Развернуть';
    }
  });
}

// Обработчики для чекбоксов
const showFootprintsCheckbox = document.getElementById('showFootprints');
const showWaypointsCheckbox = document.getElementById('showWaypoints');

if (showFootprintsCheckbox) {
  showFootprintsCheckbox.addEventListener('change', (e) => {
    if (currentRouteVisualization && currentRouteVisualization.footprintsLayer) {
      if (e.target.checked) {
        currentRouteVisualization.footprintsLayer.addTo(map);
      } else {
        map.removeLayer(currentRouteVisualization.footprintsLayer);
      }
    }
  });
}

if (showWaypointsCheckbox) {
  showWaypointsCheckbox.addEventListener('change', (e) => {
    if (currentRouteVisualization && currentRouteVisualization.waypointsLayer) {
      if (e.target.checked) {
        currentRouteVisualization.waypointsLayer.addTo(map);
      } else {
        map.removeLayer(currentRouteVisualization.waypointsLayer);
      }
    }
  });
}

// Обработка завершения рисования объекта
map.on(L.Draw.Event.CREATED, function (event) {
  const layer = event.layer;
  
  // Удаляем все старые полигоны территорий перед добавлением нового
  drawnItems.clearLayers();
  
  // Добавляем новый полигон
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

  if (!validateInputs(flightAltitude, desiredOverlapInput, forwardOverlapInput)) {
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
        // Используем улучшенную визуализацию маршрута с camera footprints и waypoints
        currentRouteVisualization = visualizeEnhancedRoute(map, data.route, {
          showFootprints: true, // Создаём слой footprints
          showWaypoints: true   // Создаём слой waypoints
        });
        
        // Добавляем слои и маркеры на карту (порядок важен для правильного отображения)
        if (currentRouteVisualization) {
          // Показываем панель управления визуализацией
          showVisualizationPanel();
          
          // 1. Footprints добавляем только если чекбокс включен
          if (currentRouteVisualization.footprintsLayer && showFootprintsCheckbox.checked) {
            currentRouteVisualization.footprintsLayer.addTo(map);
          }
          
          // 2. Затем маршрут (всегда показываем)
          if (currentRouteVisualization.layers) {
            currentRouteVisualization.layers.addTo(map);
            map.fitBounds(currentRouteVisualization.layers.getBounds());
          }
          
          // 3. Waypoints добавляем только если чекбокс включен
          if (currentRouteVisualization.waypointsLayer && showWaypointsCheckbox.checked) {
            currentRouteVisualization.waypointsLayer.addTo(map);
          }
          
          // 4. И маркеры START/FINISH на самом верху (всегда показываем)
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
        
        // Сохраняем данные маршрута для симуляции
        currentRouteData = data.route;
        
        // Активируем кнопку симуляции
        document.getElementById('startSimulation').disabled = false;
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
  setupSimulationControls();
});

// Темная тема удалена - используем только светлую тему

// === Функции для симуляции полёта ===

/**
 * Настройка обработчиков элементов управления симуляцией
 */
function setupSimulationControls() {
  // Кнопка запуска симуляции
  document.getElementById('startSimulation').addEventListener('click', () => {
    if (!currentRouteData) {
      alert('Сначала постройте маршрут!');
      return;
    }
    
    // Показываем панель симуляции
    document.getElementById('flightSimulationPanel').style.display = 'block';
    
    // Создаем экземпляр симулятора, если его нет
    if (!flightSimulator) {
      flightSimulator = new FlightSimulator(map, currentRouteData);
      
      // Устанавливаем начальную скорость 10x
      flightSimulator.setSpeed(10);
      document.getElementById('speedValue').textContent = '10x';
      
      // Устанавливаем начальные значения в UI
      // Показываем только количество точек съемки (снимков)
      document.getElementById('simTotalWaypoints').textContent = flightSimulator.workWaypoints.length;
      document.getElementById('simCurrentWaypoint').textContent = '0';
      document.getElementById('simElapsedTime').textContent = '00:00';
      document.getElementById('simCurrentPosition').textContent = 'Готов к запуску';
      document.getElementById('simProgressBar').style.width = '0%';
      document.getElementById('simTimeline').value = '0';
      
      // Сбрасываем кнопки управления
      updateControlButtons('stopped');
    }
  });
  
  // Кнопка Play
  document.getElementById('simPlay').addEventListener('click', () => {
    if (!flightSimulator) return;
    flightSimulator.start();
    updateControlButtons('playing');
  });
  
  // Кнопка Pause/Resume
  document.getElementById('simPause').addEventListener('click', () => {
    if (!flightSimulator) return;
    
    if (flightSimulator.isPlaying) {
      flightSimulator.pause();
      updateControlButtons('paused');
    } else if (flightSimulator.isPaused) {
      flightSimulator.resume();
      updateControlButtons('playing');
    }
  });
  
  // Кнопка Stop
  document.getElementById('simStop').addEventListener('click', () => {
    if (!flightSimulator) return;
    flightSimulator.stop();
    updateControlButtons('stopped');
    
    // Сбрасываем UI
    document.getElementById('simCurrentWaypoint').textContent = '0';
    document.getElementById('simElapsedTime').textContent = '00:00';
    document.getElementById('simCurrentPosition').textContent = 'Остановлено';
    document.getElementById('simProgressBar').style.width = '0%';
    document.getElementById('simTimeline').value = '0';
  });
  
  // Кнопки скорости
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!flightSimulator) return;
      
      const speed = parseFloat(btn.dataset.speed);
      flightSimulator.setSpeed(speed);
      
      // Обновляем активную кнопку
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      document.getElementById('speedValue').textContent = `${speed}x`;
    });
  });
  
  // Timeline slider
  let isUserDragging = false;
  const timelineSlider = document.getElementById('simTimeline');
  
  timelineSlider.addEventListener('mousedown', () => {
    isUserDragging = true;
  });
  
  timelineSlider.addEventListener('mouseup', () => {
    isUserDragging = false;
  });
  
  timelineSlider.addEventListener('input', (e) => {
    if (!flightSimulator || !isUserDragging) return;
    
    const percent = parseFloat(e.target.value);
    const waypointIndex = Math.floor((percent / 100) * (flightSimulator.waypoints.length - 1));
    flightSimulator.seekToWaypoint(waypointIndex);
  });
  
  // Опция "Следовать за дроном"
  document.getElementById('simFollowDrone').addEventListener('change', (e) => {
    if (flightSimulator) {
      flightSimulator.followDrone = e.target.checked;
    }
  });
  
  // Опция "Показывать зону покрытия"
  document.getElementById('simShowFootprint').addEventListener('change', (e) => {
    // Эта опция уже учтена в логике updateFootprint
    // Можно добавить дополнительное управление, если необходимо
  });
  
  // Закрытие панели
  document.getElementById('closeSimulation').addEventListener('click', () => {
    if (flightSimulator) {
      flightSimulator.stop();
    }
    document.getElementById('flightSimulationPanel').style.display = 'none';
  });
  
  // === Слушаем события симулятора ===
  
  // Throttle для оптимизации обновлений UI
  let lastUIUpdateTime = 0;
  const UI_UPDATE_INTERVAL = 100; // Обновляем UI максимум каждые 100мс
  
  // Обновление прогресса
  window.addEventListener('flightSimulation:progressUpdated', (e) => {
    const { current, total, currentWaypoint } = e.detail;
    
    // Считаем только пройденные точки съемки (снимки)
    if (flightSimulator) {
      const workWaypointsPassed = flightSimulator.waypoints
        .slice(0, current)
        .filter(wp => wp.takePhoto).length;
      
      document.getElementById('simCurrentWaypoint').textContent = workWaypointsPassed;
      document.getElementById('simTotalWaypoints').textContent = flightSimulator.workWaypoints.length;
      
      const percent = (workWaypointsPassed / flightSimulator.workWaypoints.length) * 100;
      document.getElementById('simProgressBar').style.width = `${percent}%`;
      
      // Обновляем timeline на основе всех waypoints (для плавности)
      if (!isUserDragging) {
        const totalPercent = (current / total) * 100;
        document.getElementById('simTimeline').value = totalPercent;
      }
    }
    
    // Обновляем текущую позицию с throttling
    const now = performance.now();
    if (currentWaypoint && (now - lastUIUpdateTime > UI_UPDATE_INTERVAL)) {
      const posText = `${currentWaypoint.lat.toFixed(6)}°, ${currentWaypoint.lng.toFixed(6)}°`;
      document.getElementById('simCurrentPosition').textContent = posText;
      lastUIUpdateTime = now;
    }
  });
  
  // Обновление времени с throttling
  let lastTimeUpdateTime = 0;
  const TIME_UPDATE_INTERVAL = 500; // Обновляем время каждые 500мс
  
  window.addEventListener('flightSimulation:timeUpdated', (e) => {
    const now = performance.now();
    if (now - lastTimeUpdateTime < TIME_UPDATE_INTERVAL) return;
    
    const { elapsedTime } = e.detail;
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = Math.floor(elapsedTime % 60);
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('simElapsedTime').textContent = timeStr;
    lastTimeUpdateTime = now;
  });
  
  // Симуляция завершена
  window.addEventListener('flightSimulation:simulationCompleted', () => {
    updateControlButtons('stopped'); // Изменено с 'completed' на 'stopped'
    document.getElementById('simCurrentPosition').textContent = 'Миссия завершена ✅';
    
    // Показываем уведомление
    setTimeout(() => {
      alert('Симуляция полёта завершена! ✅\n\nВсе точки маршрута пройдены.');
    }, 300);
  });
  
  // Симуляция запущена
  window.addEventListener('flightSimulation:simulationStarted', () => {
    document.getElementById('simCurrentPosition').textContent = 'Полёт начат...';
  });
  
  // Симуляция остановлена
  window.addEventListener('flightSimulation:simulationStopped', () => {
    document.getElementById('simCurrentPosition').textContent = 'Остановлено';
  });
  
  // Симуляция на паузе
  window.addEventListener('flightSimulation:simulationPaused', () => {
    document.getElementById('simCurrentPosition').textContent = 'Пауза';
  });
}

/**
 * Обновление состояния кнопок управления
 */
function updateControlButtons(state) {
  const playBtn = document.getElementById('simPlay');
  const pauseBtn = document.getElementById('simPause');
  const stopBtn = document.getElementById('simStop');
  
  switch (state) {
    case 'playing':
      playBtn.disabled = true;
      pauseBtn.disabled = false;
      stopBtn.disabled = false;
      pauseBtn.querySelector('.sim-icon').textContent = '⏸';
      pauseBtn.title = 'Пауза';
      break;
      
    case 'paused':
      playBtn.disabled = true;
      pauseBtn.disabled = false;
      stopBtn.disabled = false;
      pauseBtn.querySelector('.sim-icon').textContent = '▶';
      pauseBtn.title = 'Возобновить';
      break;
      
    case 'stopped':
    case 'completed':
      playBtn.disabled = false;
      pauseBtn.disabled = true;
      stopBtn.disabled = true;
      pauseBtn.querySelector('.sim-icon').textContent = '⏸';
      pauseBtn.title = 'Пауза';
      break;
  }
}
