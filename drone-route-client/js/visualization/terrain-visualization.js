/**
 * Модуль визуализации рельефа местности
 * Включает тепловую карту высот и интерактивный график профиля
 */

// Глобальные переменные для управления слоями
let elevationHeatmapLayer = null;
let currentTerrainData = null;

/**
 * Создание тепловой карты высот на карте
 * @param {Object} map - Объект карты Leaflet
 * @param {Array} elevationGrid - Массив точек с высотами [{lat, lng, elevation}, ...]
 * @returns {Object} Leaflet heatLayer
 */
function createElevationHeatmap(map, elevationGrid) {
  logger.info('Создание тепловой карты высот', {
    module: 'TerrainVisualization',
    gridPoints: elevationGrid.length
  });
  
  if (!elevationGrid || elevationGrid.length === 0) {
    logger.warn('Нет данных для создания тепловой карты', {
      module: 'TerrainVisualization'
    });
    return null;
  }
  
  // Находим минимальную и максимальную высоты для нормализации
  const elevations = elevationGrid.map(p => p.elevation);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  
  logger.debug('Диапазон высот для heatmap', {
    module: 'TerrainVisualization',
    minElevation: `${minElevation.toFixed(2)} м`,
    maxElevation: `${maxElevation.toFixed(2)} м`,
    range: `${(maxElevation - minElevation).toFixed(2)} м`
  });
  
  // Преобразуем данные в формат Leaflet.heat: [lat, lng, intensity]
  const heatData = elevationGrid.map(point => {
    // Нормализуем высоту в диапазон 0-1
    const intensity = maxElevation > minElevation 
      ? (point.elevation - minElevation) / (maxElevation - minElevation)
      : 0.5;
    
    return [point.lat, point.lng, intensity];
  });
  
  // Создаем слой тепловой карты
  const heatLayer = L.heatLayer(heatData, {
    radius: 25,
    blur: 35,
    maxZoom: 17,
    max: 1.0,
    gradient: {
      0.0: 'blue',
      0.3: 'lime',
      0.5: 'yellow',
      0.7: 'orange',
      1.0: 'red'
    }
  });
  
  // Сохраняем в глобальную переменную
  elevationHeatmapLayer = heatLayer;
  
  logger.info('Тепловая карта высот создана успешно', {
    module: 'TerrainVisualization',
    dataPoints: heatData.length
  });
  
  return heatLayer;
}

/**
 * Показать/скрыть тепловую карту высот
 * @param {Object} map - Объект карты Leaflet
 * @param {boolean} show - Показать (true) или скрыть (false)
 */
function toggleElevationHeatmap(map, show) {
  if (!elevationHeatmapLayer) {
    logger.warn('Тепловая карта высот не создана', {
      module: 'TerrainVisualization'
    });
    return;
  }
  
  if (show) {
    if (!map.hasLayer(elevationHeatmapLayer)) {
      elevationHeatmapLayer.addTo(map);
      logger.debug('Тепловая карта высот добавлена на карту', {
        module: 'TerrainVisualization'
      });
    }
  } else {
    if (map.hasLayer(elevationHeatmapLayer)) {
      map.removeLayer(elevationHeatmapLayer);
      logger.debug('Тепловая карта высот удалена с карты', {
        module: 'TerrainVisualization'
      });
    }
  }
}

/**
 * Удаление тепловой карты высот
 * @param {Object} map - Объект карты Leaflet
 */
function removeElevationHeatmap(map) {
  if (elevationHeatmapLayer) {
    if (map.hasLayer(elevationHeatmapLayer)) {
      map.removeLayer(elevationHeatmapLayer);
    }
    elevationHeatmapLayer = null;
    logger.debug('Тепловая карта высот удалена', {
      module: 'TerrainVisualization'
    });
  }
}

/**
 * Расчет кумулятивного расстояния вдоль профиля
 * @param {Array} profile - Массив точек [{lat, lng, elevation}, ...]
 * @returns {Array} Массив расстояний в километрах
 */
function calculateCumulativeDistance(profile) {
  const distances = [0];
  let totalDistance = 0;
  
  for (let i = 1; i < profile.length; i++) {
    const prev = profile[i - 1];
    const curr = profile[i];
    
    // Используем формулу гаверсинуса для расчета расстояния
    const R = 6371; // Радиус Земли в км
    const dLat = (curr.lat - prev.lat) * Math.PI / 180;
    const dLng = (curr.lng - prev.lng) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(prev.lat * Math.PI / 180) * Math.cos(curr.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    totalDistance += distance;
    distances.push(totalDistance);
  }
  
  return distances;
}

/**
 * Показать модальное окно с профилем рельефа
 * @param {Object} terrainData - Данные о рельефе
 */
function showTerrainProfileModal(terrainData) {
  logger.info('Открытие модального окна профиля рельефа', {
    module: 'TerrainVisualization'
  });
  
  if (!terrainData || !terrainData.elevationProfile) {
    logger.error('Нет данных о профиле рельефа', {
      module: 'TerrainVisualization'
    });
    alert('Нет данных о профиле рельефа для отображения');
    return;
  }
  
  // Сохраняем данные
  currentTerrainData = terrainData;
  
  const { elevationProfile, absoluteFlightAltitude, maxTerrainElevation, minTerrainElevation, terrainRange, isFlat } = terrainData;
  
  // Рассчитываем кумулятивное расстояние
  const distances = calculateCumulativeDistance(elevationProfile);
  const elevations = elevationProfile.map(p => p.elevation);
  
  logger.debug('Данные для графика', {
    module: 'TerrainVisualization',
    profilePoints: elevationProfile.length,
    totalDistance: `${distances[distances.length - 1].toFixed(2)} км`,
    elevationRange: `${minTerrainElevation.toFixed(2)} - ${maxTerrainElevation.toFixed(2)} м`
  });
  
  // Создаем линию рельефа
  const terrainTrace = {
    x: distances,
    y: elevations,
    type: 'scatter',
    mode: 'lines',
    name: 'Рельеф местности',
    fill: 'tozeroy',
    fillcolor: 'rgba(139, 69, 19, 0.3)',
    line: {
      color: 'rgb(139, 69, 19)',
      width: 2
    },
    hovertemplate: '<b>Расстояние:</b> %{x:.2f} км<br>' +
                   '<b>Высота:</b> %{y:.2f} м<br>' +
                   '<extra></extra>'
  };
  
  // Создаем линию полета дрона (прямая горизонтальная)
  const droneTrace = {
    x: distances,
    y: Array(distances.length).fill(absoluteFlightAltitude),
    type: 'scatter',
    mode: 'lines',
    name: 'Линия полета дрона',
    line: {
      color: 'rgb(0, 123, 255)',
      width: 3,
      dash: 'dash'
    },
    hovertemplate: '<b>Расстояние:</b> %{x:.2f} км<br>' +
                   '<b>Абсолютная высота:</b> %{y:.2f} м<br>' +
                   '<extra></extra>'
  };
  
  // Настройки графика
  const layout = {
    title: {
      text: 'Профиль высот маршрута полета',
      font: {
        size: 18,
        family: 'Inter, sans-serif'
      }
    },
    xaxis: {
      title: 'Расстояние вдоль маршрута (км)',
      gridcolor: '#e0e0e0'
    },
    yaxis: {
      title: 'Высота над уровнем моря (м)',
      gridcolor: '#e0e0e0'
    },
    hovermode: 'x unified',
    showlegend: true,
    legend: {
      x: 0.01,
      y: 0.99,
      bgcolor: 'rgba(255, 255, 255, 0.8)',
      bordercolor: '#ccc',
      borderwidth: 1
    },
    margin: {
      l: 60,
      r: 40,
      t: 60,
      b: 60
    }
  };
  
  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png',
      filename: 'terrain_profile',
      height: 800,
      width: 1200,
      scale: 2
    }
  };
  
  // Строим график
  Plotly.newPlot('terrainProfileChart', [terrainTrace, droneTrace], layout, config);
  
  logger.info('График профиля рельефа построен', {
    module: 'TerrainVisualization'
  });
  
  // Заполняем статистику
  document.getElementById('maxElevation').textContent = `${maxTerrainElevation.toFixed(2)} м`;
  document.getElementById('minElevation').textContent = `${minTerrainElevation.toFixed(2)} м`;
  document.getElementById('terrainRange').textContent = `${terrainRange.toFixed(2)} м`;
  document.getElementById('absoluteAltitude').textContent = `${absoluteFlightAltitude.toFixed(2)} м`;
  
  // Предупреждение о плоской местности
  if (isFlat) {
    const warningMsg = document.createElement('div');
    warningMsg.className = 'alert alert-info mt-3';
    warningMsg.innerHTML = '<strong>ℹ️ Информация:</strong> Рельеф практически плоский (перепад менее 5 метров). Учет рельефа не критичен для данной территории.';
    
    const modalBody = document.querySelector('#terrainProfileModal .modal-body');
    const existingWarning = modalBody.querySelector('.alert');
    if (existingWarning) {
      existingWarning.remove();
    }
    modalBody.appendChild(warningMsg);
  }
  
  // Открываем модальное окно
  const modal = new bootstrap.Modal(document.getElementById('terrainProfileModal'));
  modal.show();
  
  logger.info('Модальное окно профиля рельефа открыто', {
    module: 'TerrainVisualization'
  });
}

/**
 * Получение текущих данных о рельефе
 * @returns {Object|null} Данные о рельефе
 */
function getCurrentTerrainData() {
  return currentTerrainData;
}

/**
 * Очистка данных о рельефе
 */
function clearTerrainData() {
  currentTerrainData = null;
  logger.debug('Данные о рельефе очищены', {
    module: 'TerrainVisualization'
  });
}

