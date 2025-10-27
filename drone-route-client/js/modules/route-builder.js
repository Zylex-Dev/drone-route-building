/**
 * Модуль построения маршрута
 * Отправка запросов к API, валидация, обработка ответов
 */

/**
 * Функция проверки корректности введённых значений
 */
function validateInputs(flightAltitude, desiredOverlap, forwardOverlap) {
  logger.debug('Валидация входных параметров', {
    module: 'RouteBuilder',
    context: { flightAltitude, desiredOverlap, forwardOverlap }
  });
  
  if (isNaN(flightAltitude) || flightAltitude < 5 || flightAltitude > 400) {
    logger.warn('Невалидная высота полёта', {
      module: 'RouteBuilder',
      context: { flightAltitude, min: 5, max: 400 }
    });
    alert('Высота полёта должна быть числом в диапазоне от 5 до 400 метров.');
    return false;
  }
  if (isNaN(desiredOverlap) || desiredOverlap < 10 || desiredOverlap > 95) {
    logger.warn('Невалидное боковое перекрытие', {
      module: 'RouteBuilder',
      context: { desiredOverlap, min: 10, max: 95 }
    });
    alert('Боковое перекрытие должно быть числом в диапазоне от 10 до 95%.');
    return false;
  }
  if (forwardOverlap !== undefined && (isNaN(forwardOverlap) || forwardOverlap < 50 || forwardOverlap > 95)) {
    logger.warn('Невалидное продольное перекрытие', {
      module: 'RouteBuilder',
      context: { forwardOverlap, min: 50, max: 95 }
    });
    alert('Продольное перекрытие должно быть числом в диапазоне от 50 до 95%.');
    return false;
  }
  
  logger.debug('Валидация пройдена успешно', { module: 'RouteBuilder' });
  return true;
}

/**
 * Построение маршрута для выделенной территории
 */
function buildRoute(territoryPoints) {
  logger.info('Начало построения маршрута', {
    module: 'RouteBuilder',
    context: { territoryPointsCount: territoryPoints.length }
  });
  
  // Дополнительные параметры для запроса
  const shootingType = 'Панорамная съемка';
  const droneModel = document.getElementById('droneModel').value;
  const flightAltitude = Number(document.getElementById('flightAltitude').value);
  const desiredOverlapInput = Number(document.getElementById('desiredOverlap').value);
  const forwardOverlapInput = Number(document.getElementById('forwardOverlap').value);
  const enableTerrainFollowing = document.getElementById('enableTerrainFollowing').checked;

  if (!validateInputs(flightAltitude, desiredOverlapInput, forwardOverlapInput)) {
    logger.warn('Построение маршрута прервано из-за невалидных параметров', { module: 'RouteBuilder' });
    return;
  }
  const desiredOverlap = desiredOverlapInput / 100;
  const forwardOverlap = forwardOverlapInput / 100;

  logger.info('Отправка запроса на сервер для расчёта маршрута', {
    module: 'RouteBuilder',
    context: {
      shootingType,
      droneModel,
      flightAltitude,
      desiredOverlap: `${desiredOverlapInput}%`,
      forwardOverlap: `${forwardOverlapInput}%`,
      enableTerrainFollowing,
      territoryPoints: territoryPoints.length
    }
  });
  
  const requestStartTime = Date.now();
  
  // Показываем индикатор загрузки, если включен учет рельефа
  let loadingIndicator = null;
  if (enableTerrainFollowing) {
    loadingIndicator = showLoadingIndicator('Загрузка данных о рельефе местности...');
  }

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
      forwardOverlap,
      enableTerrainFollowing
    })
  })
    .then(response => {
      const requestDuration = Date.now() - requestStartTime;
      logger.info('Получен ответ от сервера', {
        module: 'RouteBuilder',
        context: {
          status: response.status,
          duration: `${requestDuration}ms`
        }
      });
      
      // Скрываем индикатор загрузки
      if (loadingIndicator) {
        hideLoadingIndicator(loadingIndicator);
      }
      
      return response.json();
    })
    .then(data => {
      if (data.success) {
        const totalDuration = Date.now() - requestStartTime;
        logger.info('Маршрут успешно построен', {
          module: 'RouteBuilder',
          context: {
            duration: `${totalDuration}ms`,
            routePoints: data.route.geometry.coordinates.length,
            properties: data.route.properties
          }
        });
        
        logger.debug('Начало визуализации маршрута', { module: 'RouteBuilder' });
        
        // Используем улучшенную визуализацию маршрута с camera footprints и waypoints
        currentRouteVisualization = visualizeEnhancedRoute(map, data.route, {
          showFootprints: true, // Создаём слой footprints
          showWaypoints: true   // Создаём слой waypoints
        });
        
        // Добавляем слои и маркеры на карту (порядок важен для правильного отображения)
        if (currentRouteVisualization) {
          logger.trace('Добавление слоёв визуализации на карту', { module: 'RouteBuilder' });
          
          // Показываем панель управления визуализацией
          showVisualizationPanel();
          
          // 1. Footprints добавляем только если чекбокс включен
          const showFootprintsCheckbox = document.getElementById('showFootprints');
          if (currentRouteVisualization.footprintsLayer && showFootprintsCheckbox.checked) {
            currentRouteVisualization.footprintsLayer.addTo(map);
            logger.trace('Footprints добавлены на карту', { module: 'RouteBuilder' });
          }
          
          // 2. Затем маршрут (всегда показываем)
          if (currentRouteVisualization.layers) {
            currentRouteVisualization.layers.addTo(map);
            map.fitBounds(currentRouteVisualization.layers.getBounds());
            logger.trace('Маршрут добавлен на карту', { module: 'RouteBuilder' });
          }
          
          // 3. Waypoints добавляем только если чекбокс включен
          const showWaypointsCheckbox = document.getElementById('showWaypoints');
          if (currentRouteVisualization.waypointsLayer && showWaypointsCheckbox.checked) {
            currentRouteVisualization.waypointsLayer.addTo(map);
            logger.trace('Waypoints добавлены на карту', { module: 'RouteBuilder' });
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
        logger.debug('Информация о миссии обновлена', { module: 'RouteBuilder' });
        
        // Обработка данных о рельефе (если есть)
        if (data.route.properties.terrainData && data.route.properties.terrainData.enabled) {
          logger.info('Обработка данных о рельефе на клиенте', {
            module: 'RouteBuilder',
            terrainData: {
              maxElevation: data.route.properties.terrainData.maxTerrainElevation,
              minElevation: data.route.properties.terrainData.minTerrainElevation,
              absoluteAltitude: data.route.properties.terrainData.absoluteFlightAltitude,
              isFlat: data.route.properties.terrainData.isFlat
            }
          });
          
          // Создаем тепловую карту высот
          const heatmapLayer = createElevationHeatmap(map, data.route.properties.terrainData.elevationGrid);
          if (heatmapLayer) {
            // Добавляем только если чекбокс включен
            const showHeatmapCheckbox = document.getElementById('showHeatmap');
            if (showHeatmapCheckbox && showHeatmapCheckbox.checked) {
              heatmapLayer.addTo(map);
              logger.debug('Тепловая карта высот добавлена на карту', { module: 'RouteBuilder' });
            } else {
              logger.debug('Тепловая карта создана, но не отображена (чекбокс выключен)', { module: 'RouteBuilder' });
            }
          }
          
          // Активируем кнопку "Профиль рельефа"
          document.getElementById('showTerrainProfile').disabled = false;
          logger.debug('Кнопка "Профиль рельефа" активирована', { module: 'RouteBuilder' });
        }
        
        // Сохраняем данные маршрута для симуляции
        currentRouteData = data.route;
        
        // Активируем кнопку симуляции
        document.getElementById('startSimulation').disabled = false;
        logger.info('Кнопка симуляции активирована', { module: 'RouteBuilder' });
        
        // Обновляем погоду для построенного маршрута
        logger.debug('Запрос данных о погоде для маршрута', { module: 'RouteBuilder' });
        updateWeatherForRoute(data.route.geometry.coordinates).catch(err => {
          logger.warn('Не удалось загрузить погоду, но маршрут построен успешно', {
            module: 'RouteBuilder',
            error: err.message
          });
        });
      } else {
        logger.error('Сервер вернул ошибку при расчёте маршрута', {
          module: 'RouteBuilder',
          context: { errorMessage: data.message, errors: data.errors }
        });
        alert('Ошибка при расчёте маршрута: ' + data.message);
      }
    })
    .catch(error => {
      // Скрываем индикатор загрузки при ошибке
      if (loadingIndicator) {
        hideLoadingIndicator(loadingIndicator);
      }
      
      logger.error('Ошибка соединения с сервером', {
        module: 'RouteBuilder',
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      });
      alert('Ошибка соединения с сервером: ' + error);
    });
}

/**
 * Показать индикатор загрузки
 * @param {string} message - Текст сообщения
 * @returns {HTMLElement} Элемент индикатора
 */
function showLoadingIndicator(message) {
  const indicator = document.createElement('div');
  indicator.id = 'terrain-loading-indicator';
  indicator.className = 'loading-indicator';
  indicator.innerHTML = `
    <div class="loading-content">
      <div class="spinner"></div>
      <div class="loading-message">${message}</div>
    </div>
  `;
  document.body.appendChild(indicator);
  
  logger.debug('Индикатор загрузки показан', { 
    module: 'RouteBuilder',
    message 
  });
  
  return indicator;
}

/**
 * Скрыть индикатор загрузки
 * @param {HTMLElement} indicator - Элемент индикатора
 */
function hideLoadingIndicator(indicator) {
  if (indicator && indicator.parentNode) {
    indicator.parentNode.removeChild(indicator);
    logger.debug('Индикатор загрузки скрыт', { module: 'RouteBuilder' });
  }
}

