/**
 * Модуль управления UI
 * Управляет отображением и обновлением панелей, кнопок, метрик
 */

/**
 * Функция для удаления всех нарисованных объектов, маршрута и маркеров
 * а также сброса информации в карточке параметров съемки и настроек
 */
function clearAllObjects() {
  logger.info('Очистка всех объектов и сброс миссии', { module: 'UIController' });
  
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
  
  // Очищаем данные о рельефе
  if (typeof removeElevationHeatmap !== 'undefined') {
    removeElevationHeatmap(map);
  }
  if (typeof clearTerrainData !== 'undefined') {
    clearTerrainData();
  }
  
  // Отключаем кнопки
  document.getElementById('startSimulation').disabled = true;
  document.getElementById('showTerrainProfile').disabled = true;
  
  // Очищаем данные маршрута для экспорта
  if (typeof exportManager !== 'undefined') {
    exportManager.clearCurrentRoute();
  }

  // Сброс настроек полёта к дефолтным значениям
  document.getElementById('flightAltitude').value = 50;
  document.getElementById('desiredOverlap').value = 30;
  document.getElementById('forwardOverlap').value = 70;
  document.getElementById('droneModel').value = 'DJI Matrice 30T';
  document.getElementById('enableTerrainFollowing').checked = false;
  
  // Обновляем параметры камеры для дефолтной модели
  updateCameraInfo('DJI Matrice 30T');
  
  logger.debug('Миссия полностью очищена, UI сброшен к значениям по умолчанию', { module: 'UIController' });

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

/**
 * Функция для показа/скрытия панели управления визуализацией
 */
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

/**
 * Обновление информации о миссии в UI
 */
function updateMissionInfo(data, droneModel) {
  const specs = getDroneSpecs(droneModel);
  const props = data.route.properties;
  const stats = props.missionStats;
  
  logger.info('Обновление информации о миссии в UI', {
    module: 'UIController',
    context: {
      droneModel,
      waypoints: props.totalWaypoints,
      lines: props.numberOfLines
    }
  });
  
  // Сохраняем маршрут для экспорта
  if (typeof exportManager !== 'undefined') {
    exportManager.setCurrentRoute(data.route);
  }
  
  logger.debug('Метрики миссии', {
    module: 'UIController',
    context: {
      coverageArea: `${stats.coverageAreaKm2} км²`,
      flightDistance: `${stats.totalFlightDistanceKm} км`,
      estimatedTime: `${stats.estimatedFlightTimeMin} мин`,
      photos: stats.estimatedPhotos,
      battery: `${stats.batteryUsagePercent}%`
    }
  });
  
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
  document.getElementById('sensorSize').textContent = `${specs.sensorWidth} × ${specs.sensorHeight} мм`;
  document.getElementById('fovHorizontal').textContent = `${stats.horizontalFOV}°`;
  document.getElementById('fovVertical').textContent = `${stats.verticalFOV}°`;
  document.getElementById('altitudeInfo').textContent = `${props.flightAltitude} м`;
  
  // Отображение информации о рельефе (если включено)
  if (props.terrainData && props.terrainData.enabled) {
    logger.info('Добавление информации о рельефе в UI', {
      module: 'UIController',
      terrainData: {
        maxElevation: props.terrainData.maxTerrainElevation,
        absoluteAltitude: props.terrainData.absoluteFlightAltitude
      }
    });
    
    // Проверяем, существует ли уже карточка с информацией о рельефе
    let terrainInfoCard = document.querySelector('.terrain-info');
    
    if (!terrainInfoCard) {
      // Создаем новую карточку
      terrainInfoCard = document.createElement('div');
      terrainInfoCard.className = 'card-custom terrain-info glass';
      terrainInfoCard.innerHTML = `
        <h5 class="section-title">🏔️ Информация о рельефе</h5>
        <ul class="list-group list-group-flush">
          <li class="list-group-item metric-item">
            <span class="metric-label">Макс. высота рельефа:</span>
            <strong class="metric-value" id="terrainMaxHeight">-</strong>
          </li>
          <li class="list-group-item metric-item">
            <span class="metric-label">Мин. высота рельефа:</span>
            <strong class="metric-value" id="terrainMinHeight">-</strong>
          </li>
          <li class="list-group-item metric-item">
            <span class="metric-label">Перепад высот:</span>
            <strong class="metric-value" id="terrainRangeDisplay">-</strong>
          </li>
          <li class="list-group-item metric-item">
            <span class="metric-label">Абсолютная высота полета:</span>
            <strong class="metric-value" id="terrainAbsoluteAltitude">-</strong>
          </li>
        </ul>
      `;
      
      // Вставляем карточку после "Информации о миссии"
      const missionSummary = document.querySelector('.mission-summary');
      if (missionSummary && missionSummary.parentNode) {
        missionSummary.parentNode.insertBefore(terrainInfoCard, missionSummary.nextSibling);
      }
      
      logger.debug('Карточка информации о рельефе создана', { module: 'UIController' });
    }
    
    // Заполняем данные
    document.getElementById('terrainMaxHeight').textContent = `${props.terrainData.maxTerrainElevation} м`;
    document.getElementById('terrainMinHeight').textContent = `${props.terrainData.minTerrainElevation} м`;
    document.getElementById('terrainRangeDisplay').textContent = `${props.terrainData.terrainRange} м`;
    document.getElementById('terrainAbsoluteAltitude').textContent = `${props.terrainData.absoluteFlightAltitude} м`;
    
    // Предупреждение о плоской местности
    if (props.terrainData.isFlat) {
      const terrainRangeElem = document.getElementById('terrainRangeDisplay');
      if (terrainRangeElem) {
        terrainRangeElem.style.color = '#28a745'; // Зеленый цвет
        terrainRangeElem.title = 'Рельеф практически плоский';
      }
    }
  } else {
    // Удаляем карточку о рельефе, если она была
    const terrainInfoCard = document.querySelector('.terrain-info');
    if (terrainInfoCard) {
      terrainInfoCard.remove();
      logger.debug('Карточка информации о рельефе удалена', { module: 'UIController' });
    }
  }
}

/**
 * Обновление состояния кнопок управления симуляцией
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

