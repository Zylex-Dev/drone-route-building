/**
 * Модуль построения маршрута
 * Отправка запросов к API, валидация, обработка ответов
 */

/**
 * Функция проверки корректности введённых значений
 */
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

/**
 * Построение маршрута для выделенной территории
 */
function buildRoute(territoryPoints) {
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
          const showFootprintsCheckbox = document.getElementById('showFootprints');
          if (currentRouteVisualization.footprintsLayer && showFootprintsCheckbox.checked) {
            currentRouteVisualization.footprintsLayer.addTo(map);
          }
          
          // 2. Затем маршрут (всегда показываем)
          if (currentRouteVisualization.layers) {
            currentRouteVisualization.layers.addTo(map);
            map.fitBounds(currentRouteVisualization.layers.getBounds());
          }
          
          // 3. Waypoints добавляем только если чекбокс включен
          const showWaypointsCheckbox = document.getElementById('showWaypoints');
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
        updateMissionInfo(data, droneModel);
        
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
}

