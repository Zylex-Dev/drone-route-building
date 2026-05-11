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
  
  // Создаем слой тепловой карты с улучшенной видимостью
  const heatLayer = L.heatLayer(heatData, {
    radius: 30,           // Увеличен радиус для лучшей видимости
    blur: 30,             // Уменьшен blur для большей четкости
    maxZoom: 17,
    max: 1.0,
    minOpacity: 0.5,      // Минимальная прозрачность для видимости
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
 * Анализ типа рельефа на основе данных
 * @param {Object} terrainData - Данные о рельефе
 * @returns {Object} Информация о типе рельефа
 */
function analyzeTerrainType(terrainData) {
  const { terrainRange, elevationProfile } = terrainData;
  
  // Классификация по перепаду высот
  if (terrainRange < 10) {
    return {
      type: 'Равнинный',
      variant: 'plain',
      lucideIcon: 'map',
      color: '#15803d',
      description: 'Местность с минимальными перепадами высот. Идеальна для полетов дронов, не требует особого внимания к рельефу.'
    };
  } else if (terrainRange < 50) {
    return {
      type: 'Слабохолмистый',
      variant: 'rolling',
      lucideIcon: 'waves',
      color: '#0e7490',
      description: 'Местность с небольшими холмами. Учет рельефа рекомендуется для обеспечения безопасного пролета над всеми возвышениями.'
    };
  } else if (terrainRange < 150) {
    return {
      type: 'Холмистый',
      variant: 'hilly',
      lucideIcon: 'mountain',
      color: '#b45309',
      description: 'Местность со значительными холмами и возвышенностями. Важен точный учет рельефа для поддержания безопасной высоты.'
    };
  } else if (terrainRange < 300) {
    return {
      type: 'Горный',
      variant: 'mountain',
      lucideIcon: 'mountain',
      color: '#c2410c',
      description: 'Горная местность с существенными перепадами высот. Критически важен учет рельефа и запас высоты для безопасности.'
    };
  } else {
    return {
      type: 'Высокогорный',
      variant: 'alpine',
      lucideIcon: 'alert-triangle',
      color: '#b91c1c',
      description: 'Высокогорная местность с экстремальными перепадами. Требуется максимальное внимание к рельефу и погодным условиям.'
    };
  }
}

/**
 * Генерация рекомендаций по высоте полета
 * @param {Object} terrainData - Данные о рельефе
 * @param {number} currentAltitude - Текущая относительная высота
 * @returns {Array} Массив рекомендаций
 */
function generateRecommendations(terrainData, currentAltitude) {
  const { terrainRange, maxTerrainElevation, relativeAltitude } = terrainData;
  const recommendations = [];
  
  // Оценка безопасности текущей высоты
  if (relativeAltitude < 30) {
    recommendations.push({
      type: 'danger',
      lucideIcon: 'alert-circle',
      text: `<strong>Критически низкая высота!</strong> Текущая относительная высота ${relativeAltitude}м недостаточна. Рекомендуется минимум <strong>50м</strong> для безопасности.`
    });
  } else if (relativeAltitude < 50) {
    recommendations.push({
      type: 'warning',
      lucideIcon: 'alert-triangle',
      text: `<strong>Низкая высота полета.</strong> При высоте ${relativeAltitude}м запас безопасности минимален. Рекомендуется увеличить до <strong>70-100м</strong>.`
    });
  } else if (relativeAltitude >= 50 && relativeAltitude <= 100) {
    recommendations.push({
      type: 'success',
      lucideIcon: 'check-circle',
      text: `<strong>Оптимальная высота!</strong> Текущая высота ${relativeAltitude}м обеспечивает хороший баланс между безопасностью и качеством съемки.`
    });
  } else {
    recommendations.push({
      type: 'info',
      lucideIcon: 'info',
      text: `<strong>Большая высота полета.</strong> При ${relativeAltitude}м детализация снимков будет ниже. Подходит для больших территорий.`
    });
  }
  
  // Рекомендации по типу рельефа
  if (terrainRange < 10) {
    recommendations.push({
      type: 'success',
      lucideIcon: 'map-pin',
      text: `Для равнинной местности можно использовать минимальную высоту <strong>30-50м</strong> для лучшей детализации.`
    });
  } else if (terrainRange < 50) {
    recommendations.push({
      type: 'info',
      lucideIcon: 'ruler',
      text: `Для слабохолмистой местности рекомендуется высота <strong>50-80м</strong> с запасом на неровности.`
    });
  } else if (terrainRange < 150) {
    recommendations.push({
      type: 'warning',
      lucideIcon: 'mountain',
      text: `Холмистая местность требует высоты <strong>80-120м</strong>. Текущий перепад ${terrainRange.toFixed(1)}м требует внимания.`
    });
  } else {
    recommendations.push({
      type: 'warning',
      lucideIcon: 'mountain',
      text: `Горная местность с перепадом <strong>${terrainRange.toFixed(1)}м</strong>! Рекомендуется высота <strong>от 100м</strong> с запасом безопасности.`
    });
  }
  
  // Рекомендации по GSD и качеству съемки
  recommendations.push({
    type: 'info',
    lucideIcon: 'camera',
    text: `При абсолютной высоте <strong>${terrainData.absoluteFlightAltitude.toFixed(1)}м</strong> разрешение съемки будет достаточным для картографирования. Для детальной фотограмметрии рассмотрите уменьшение высоты.`
  });
  
  // Предупреждение о батарее
  if (terrainRange > 100) {
    recommendations.push({
      type: 'warning',
      lucideIcon: 'battery',
      text: `Большой перепад высот может повлиять на время полета. Убедитесь в достаточном заряде батареи и планируйте резервное время.`
    });
  }
  
  return recommendations;
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
  
  const { elevationProfile, absoluteFlightAltitude, maxTerrainElevation, minTerrainElevation, terrainRange, relativeAltitude } = terrainData;
  
  // Рассчитываем кумулятивное расстояние
  const distances = calculateCumulativeDistance(elevationProfile);
  const elevations = elevationProfile.map(p => p.elevation);
  
  logger.debug('Данные для графика', {
    module: 'TerrainVisualization',
    profilePoints: elevationProfile.length,
    totalDistance: `${distances[distances.length - 1].toFixed(2)} км`,
    elevationRange: `${minTerrainElevation.toFixed(2)} - ${maxTerrainElevation.toFixed(2)} м`
  });
  
  // Создаем линию рельефа с улучшенным дизайном (без эмодзи в легенде)
  const terrainTrace = {
    x: distances,
    y: elevations,
    type: 'scatter',
    mode: 'lines',
    name: 'Рельеф местности',
    fill: 'tozeroy',
    fillcolor: 'rgba(139, 98, 61, 0.25)',
    line: {
      color: 'rgb(139, 98, 61)',
      width: 3,
      shape: 'spline',
      smoothing: 0.8
    },
    hovertemplate: '<b>Расстояние:</b> %{x:.2f} км<br>' +
                   '<b>Высота рельефа:</b> %{y:.1f} м<br>' +
                   '<extra></extra>'
  };
  
  // Создаем линию полета дрона (прямая горизонтальная) с улучшенным стилем (без эмодзи в легенде)
  const droneTrace = {
    x: distances,
    y: Array(distances.length).fill(absoluteFlightAltitude),
    type: 'scatter',
    mode: 'lines',
    name: 'Линия полета дрона',
    line: {
      color: 'rgb(102, 126, 234)',
      width: 4,
      dash: 'dot'
    },
    hovertemplate: '<b>Расстояние:</b> %{x:.2f} км<br>' +
                   '<b>Абсолютная высота:</b> %{y:.1f} м<br>' +
                   '<b>Запас высоты:</b> ' + (absoluteFlightAltitude - Math.max(...elevations)).toFixed(1) + ' м<br>' +
                   '<extra></extra>'
  };
  
  // Настройки графика - полная ширина контейнера
  const layout = {
    title: {
      text: 'Профиль высот маршрута полета',
      font: {
        size: 20,
        family: 'IBM Plex Sans, sans-serif',
        weight: 700,
        color: '#2c3e50'
      }
    },
    xaxis: {
      title: {
        text: 'Расстояние вдоль маршрута (км)',
        font: {
          size: 14,
          family: 'IBM Plex Sans, sans-serif',
          weight: 600,
          color: '#495057'
        }
      },
      gridcolor: '#e9ecef',
      gridwidth: 1,
      linecolor: '#dee2e6',
      linewidth: 2,
      tickfont: {
        size: 12,
        family: 'IBM Plex Sans, sans-serif',
        color: '#6c757d'
      }
    },
    yaxis: {
      title: {
        text: 'Высота над уровнем моря (м)',
        font: {
          size: 14,
          family: 'IBM Plex Sans, sans-serif',
          weight: 600,
          color: '#495057'
        }
      },
      gridcolor: '#e9ecef',
      gridwidth: 1,
      linecolor: '#dee2e6',
      linewidth: 2,
      tickfont: {
        size: 12,
        family: 'IBM Plex Sans, sans-serif',
        color: '#6c757d'
      }
    },
    hovermode: 'x unified',
    showlegend: true,
    legend: {
      x: 0.01,
      y: 1.15,
      xanchor: 'left',
      yanchor: 'top',
      orientation: 'h',
      bgcolor: 'rgba(255, 255, 255, 0.95)',
      bordercolor: '#dee2e6',
      borderwidth: 2,
      font: {
        size: 13,
        family: 'IBM Plex Sans, sans-serif'
      }
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: '#ffffff',
    margin: {
      l: 70,
      r: 30,
      t: 100,
      b: 70,
      pad: 5
    },
    autosize: true
  };
  
  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png',
      filename: 'terrain_profile',
      height: 1000,
      width: 1600,
      scale: 2
    }
  };
  
  // Строим график с автоматическим размером
  Plotly.newPlot('terrainProfileChart', [terrainTrace, droneTrace], layout, config);
  
  // Автоматическое изменение размера при изменении окна
  window.addEventListener('resize', () => {
    Plotly.Plots.resize('terrainProfileChart');
  });
  
  // Также пересчитываем размер при открытии модального окна
  setTimeout(() => {
    Plotly.Plots.resize('terrainProfileChart');
  }, 300);
  
  logger.info('График профиля рельефа построен', {
    module: 'TerrainVisualization'
  });
  
  // Заполняем статистику
  document.getElementById('maxElevation').textContent = `${maxTerrainElevation.toFixed(1)} м`;
  document.getElementById('minElevation').textContent = `${minTerrainElevation.toFixed(1)} м`;
  document.getElementById('terrainRange').textContent = `${terrainRange.toFixed(1)} м`;
  document.getElementById('absoluteAltitude').textContent = `${absoluteFlightAltitude.toFixed(1)} м`;
  
  // Анализ типа рельефа
  const terrainType = analyzeTerrainType(terrainData);
  const terrainTypeBadge = document.getElementById('terrainTypeBadge');
  const terrainTypeIcon = document.getElementById('terrainTypeIcon');
  const terrainTypeText = document.getElementById('terrainTypeText');
  const terrainTypeDescription = document.getElementById('terrainTypeDescription');
  
  terrainTypeIcon.innerHTML = `<i data-lucide="${terrainType.lucideIcon}"></i>`;
  terrainTypeText.textContent = terrainType.type;
  terrainTypeDescription.textContent = terrainType.description;
  
  const terrainTypeCard = document.querySelector('.terrain-type-card');
  if (terrainTypeCard) {
    terrainTypeCard.dataset.terrain = terrainType.variant;
    terrainTypeCard.style.background = '';
  }
  
  logger.info('Тип рельефа определен', {
    module: 'TerrainVisualization',
    terrainType: terrainType.type,
    terrainRange: terrainRange
  });
  
  // Генерация рекомендаций
  const recommendations = generateRecommendations(terrainData, relativeAltitude);
  const recommendationsContent = document.getElementById('terrainRecommendations');
  
  // Очищаем и заполняем рекомендации
  recommendationsContent.innerHTML = '';
  recommendations.forEach(rec => {
    const recItem = document.createElement('div');
    recItem.className = `recommendation-item ${rec.type}`;
    const iconName = rec.lucideIcon || 'info';
    recItem.innerHTML = `
      <div class="rec-icon"><i data-lucide="${iconName}"></i></div>
      <div class="rec-text">${rec.text}</div>
    `;
    recommendationsContent.appendChild(recItem);
  });
  
  logger.info('Рекомендации сгенерированы', {
    module: 'TerrainVisualization',
    recommendationsCount: recommendations.length
  });
  
  const terrainModalEl = document.getElementById('terrainProfileModal');
  if (typeof refreshLucideIcons === 'function') {
    refreshLucideIcons();
  }

  const modal = new bootstrap.Modal(terrainModalEl);
  modal.show();
  
  logger.info('Модальное окно профиля рельефа открыто', {
    module: 'TerrainVisualization'
  });
}

/**
 * Вспомогательная функция для затемнения/осветления цвета
 * @param {string} color - Цвет в формате HEX
 * @param {number} percent - Процент изменения (-100 до 100)
 * @returns {string} Измененный цвет
 */
function adjustColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1);
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

