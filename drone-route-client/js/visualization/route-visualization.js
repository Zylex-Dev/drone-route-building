// Модуль для улучшенной визуализации маршрута дрона

/**
 * Функция для интерполяции цвета между двумя цветами
 * @param {string} color1 - Начальный цвет в формате hex (#RRGGBB)
 * @param {string} color2 - Конечный цвет в формате hex (#RRGGBB)
 * @param {number} factor - Фактор интерполяции от 0 до 1
 * @returns {string} - Интерполированный цвет в формате hex
 */
function interpolateColor(color1, color2, factor) {
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);
  
  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;
  
  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;
  
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Функция для получения градиентного цвета в зависимости от прогресса
 * Tech стиль: сине-голубой градиент (контрастирует с тепловой картой)
 * @param {number} progress - Прогресс от 0 до 1
 * @returns {string} - Цвет в формате hex
 */
function getGradientColor(progress) {
  const startColor = '#1e3a8a';  // Темно-синий (начало)
  const midColor = '#3b82f6';    // Яркий синий (середина)
  const endColor = '#06b6d4';    // Циан/бирюзовый (конец)
  
  if (progress < 0.5) {
    // От темно-синего к яркому синему (0-50%)
    return interpolateColor(startColor, midColor, progress * 2);
  } else {
    // От яркого синего к циану (50-100%)
    return interpolateColor(midColor, endColor, (progress - 0.5) * 2);
  }
}

/**
 * Создание прямоугольника зоны покрытия камеры (camera footprint)
 * @param {Array} centerLatLng - Центр [lat, lng]
 * @param {number} groundWidth - Ширина кадра на земле (м)
 * @param {number} groundLength - Длина кадра на земле (м)
 * @param {number} bearing - Направление полета (градусы от севера)
 * @param {number} waypointNumber - Номер точки съёмки
 * @returns {L.Rectangle} - Прямоугольник footprint
 */
function createCameraFootprint(centerLatLng, groundWidth, groundLength, bearing, waypointNumber) {
  const [centerLat, centerLng] = centerLatLng;
  
  // Коэффициенты для преобразования метров в градусы
  const metersPerDegreeLat = 111320; // примерно постоянно
  const metersPerDegreeLng = 111320 * Math.cos(centerLat * Math.PI / 180);
  
  // Полуразмеры в градусах
  const halfWidth = (groundWidth / 2) / metersPerDegreeLng;
  const halfLength = (groundLength / 2) / metersPerDegreeLat;
  
  // Для простоты создаем прямоугольник, выровненный по осям (без учета bearing)
  // Это дает хорошее приближение и не перегружает визуализацию
  const bounds = [
    [centerLat - halfLength, centerLng - halfWidth], // юго-запад
    [centerLat + halfLength, centerLng + halfWidth]  // северо-восток
  ];
  
  const footprint = L.rectangle(bounds, {
    color: '#4a90e2',
    weight: 1,
    opacity: 0.4,
    fillColor: '#4a90e2',
    fillOpacity: 0.08,
    className: 'camera-footprint'
  });
  
  // Добавляем tooltip с информацией
  footprint.bindTooltip(`
    <div style="font-size: 11px; font-family: 'Inter', sans-serif;">
      <strong>📷 Зона покрытия #${waypointNumber}</strong><br>
      Размер: ${groundWidth.toFixed(1)}м × ${groundLength.toFixed(1)}м
    </div>
  `, {
    sticky: false,
    direction: 'top'
  });
  
  return footprint;
}

/**
 * Создание маркера точки съёмки (waypoint)
 * @param {Array} latLng - Координаты [lat, lng]
 * @param {number} waypointNumber - Номер точки съёмки
 * @returns {L.CircleMarker} - Маркер точки съёмки
 */
function createWaypointMarker(latLng, waypointNumber) {
  const marker = L.circleMarker(latLng, {
    radius: 4, // Увеличен с 3 до 4 для лучшей видимости
    fillColor: '#ff6b6b',
    color: '#ffffff',
    weight: 1.5,
    opacity: 0.95,
    fillOpacity: 0.85,
    className: 'waypoint-photo-marker'
  });
  
  // Добавляем tooltip с информацией о точке съёмки
  // permanent: false - tooltip появляется только при hover
  // sticky: true - tooltip следует за курсором (помогает избежать дрожания)
  marker.bindTooltip(`
    <div style="font-size: 11px; font-family: 'Inter', sans-serif;">
      <strong>📷 Снимок #${waypointNumber}</strong><br>
      Координаты: ${latLng[0].toFixed(6)}°, ${latLng[1].toFixed(6)}°
    </div>
  `, {
    permanent: false,
    sticky: true, // Tooltip следует за курсором
    direction: 'top',
    offset: [0, -10]
  });
  
  return marker;
}

/**
 * Визуализация маршрута с улучшенными стилями
 * @param {L.Map} map - Объект карты Leaflet
 * @param {Object} routeData - Данные маршрута от сервера
 * @param {Object} options - Опции визуализации { showFootprints: boolean, showWaypoints: boolean }
 * @returns {Object} - Объект с созданными слоями { layers, footprintsLayer, waypointsLayer, startMarker, endMarker }
 */
function visualizeEnhancedRoute(map, routeData, options = {}) {
  const segments = routeData.properties.segments;
  const coords = routeData.geometry.coordinates;
  const showFootprints = options.showFootprints !== undefined ? options.showFootprints : true;
  const showWaypoints = options.showWaypoints !== undefined ? options.showWaypoints : true;
  
  if (!segments || segments.length === 0) {
    console.warn('Нет данных о сегментах для визуализации');
    return null;
  }
  
  // Получаем параметры камеры из данных маршрута
  const groundWidth = parseFloat(routeData.properties.groundWidth) || 50;
  const groundLength = parseFloat(routeData.properties.groundLength) || 37.5;
  
  // Создаем группу слоев для маршрута (используем featureGroup для поддержки getBounds)
  const routeLayers = L.featureGroup();
  
  // Создаем отдельную группу для camera footprints
  const footprintsLayer = L.featureGroup();
  
  // Создаем отдельную группу для waypoint маркеров
  const waypointsLayer = L.featureGroup();
  
  // Вычисляем общее количество точек для расчета прогресса
  let totalPoints = 0;
  segments.forEach(seg => {
    totalPoints += seg.coordinates.length;
  });
  
  let currentPointIndex = 0;
  let waypointNumber = 1; // Счетчик для footprints и waypoints
  
  // Отрисовываем каждый сегмент
  segments.forEach((segment, segmentIndex) => {
    const { type, coordinates: segCoords } = segment;
    
    if (segCoords.length < 2) return;
    
    // Преобразуем координаты из [lng, lat] в [lat, lng] для Leaflet
    const latLngs = segCoords.map(coord => [coord[1], coord[0]]);
    
    if (type === 'work') {
      // Рабочий сегмент - сплошная линия с градиентом
      // Разбиваем на подсегменты для создания градиента
      for (let i = 0; i < latLngs.length - 1; i++) {
        const progress = currentPointIndex / totalPoints;
        const color = getGradientColor(progress);
        
        const polyline = L.polyline([latLngs[i], latLngs[i + 1]], {
          color: color,
          weight: 5,
          opacity: 0.85,
          smoothFactor: 1
        });
        
        // Добавляем tooltip с информацией о сегменте
        polyline.bindTooltip(`
          <div style="font-size: 12px;">
            <strong>📸 Рабочая полоса #${Math.floor(segmentIndex / 2) + 1}</strong><br>
            Прогресс: ${(progress * 100).toFixed(0)}%<br>
            Точка: ${currentPointIndex + 1}/${totalPoints}
          </div>
        `, {
          sticky: true
        });
        
        routeLayers.addLayer(polyline);
        
        // Создаем camera footprint для каждой точки съёмки
        if (showFootprints) {
          const footprint = createCameraFootprint(
            latLngs[i],
            groundWidth,
            groundLength,
            0, // bearing - пока не используем
            waypointNumber
          );
          footprintsLayer.addLayer(footprint);
        }
        
        // Создаем waypoint маркер для каждой точки съёмки
        if (showWaypoints) {
          const waypointMarker = createWaypointMarker(latLngs[i], waypointNumber);
          waypointsLayer.addLayer(waypointMarker);
        }
        
        waypointNumber++;
        currentPointIndex++;
      }
      
      // Создаем footprint и waypoint для последней точки сегмента
      if (latLngs.length > 0) {
        const lastLatLng = latLngs[latLngs.length - 1];
        
        if (showFootprints) {
          const footprint = createCameraFootprint(
            lastLatLng,
            groundWidth,
            groundLength,
            0,
            waypointNumber
          );
          footprintsLayer.addLayer(footprint);
        }
        
        if (showWaypoints) {
          const waypointMarker = createWaypointMarker(lastLatLng, waypointNumber);
          waypointsLayer.addLayer(waypointMarker);
        }
        
        waypointNumber++;
      }
      
      currentPointIndex++; // Последняя точка сегмента
      
    } else if (type === 'transition') {
      // Переход между полосами - пунктирная линия с белой обводкой для лучшей видимости
      
      // Сначала рисуем белую подложку (обводку)
      const transitionOutline = L.polyline(latLngs, {
        color: '#ffffff',
        weight: 7,
        opacity: 0.8,
        dashArray: '12, 8',
        smoothFactor: 1
      });
      
      // Затем основную пунктирную линию
      const transitionLine = L.polyline(latLngs, {
        color: '#ff6b6b',
        weight: 4,
        opacity: 0.9,
        dashArray: '12, 8',
        smoothFactor: 1
      });
      
      transitionLine.bindTooltip(`
        <div style="font-size: 12px;">
          <strong>↔️ Переход</strong><br>
          Перемещение без съёмки
        </div>
      `, {
        sticky: true
      });
      
      routeLayers.addLayer(transitionOutline);
      routeLayers.addLayer(transitionLine);
      currentPointIndex += 2; // Переход содержит 2 точки
    }
  });
  
  // Создаем улучшенные маркеры START и FINISH
  if (coords && coords.length > 0) {
    const startCoord = coords[0];
    const endCoord = coords[coords.length - 1];
    
    // Создаем кастомные иконки для маркеров
    const startIcon = L.divIcon({
      className: 'custom-marker-icon',
      html: `
        <div class="marker-container marker-start">
          <div class="marker-pin">
            <div class="marker-icon">🚁</div>
          </div>
          <div class="marker-label">START</div>
        </div>
      `,
      iconSize: [50, 70],
      iconAnchor: [25, 60]
    });
    
    const finishIcon = L.divIcon({
      className: 'custom-marker-icon',
      html: `
        <div class="marker-container marker-finish">
          <div class="marker-pin">
            <div class="marker-icon">🏁</div>
          </div>
          <div class="marker-label">FINISH</div>
        </div>
      `,
      iconSize: [50, 70],
      iconAnchor: [25, 60]
    });
    
    // Создаем маркеры
    const startMarker = L.marker([startCoord[1], startCoord[0]], { 
      icon: startIcon,
      zIndexOffset: 1000
    });
    
    const endMarker = L.marker([endCoord[1], endCoord[0]], { 
      icon: finishIcon,
      zIndexOffset: 1000
    });
    
    // Добавляем popup с детальной информацией
    startMarker.bindPopup(`
      <div style="font-family: 'Inter', sans-serif;">
        <h6 style="margin: 0 0 8px 0; font-weight: 600; color: #28a745;">
          🚁 Точка СТАРТА
        </h6>
        <div style="font-size: 13px;">
          <strong>Координаты:</strong><br>
          Широта: ${startCoord[1].toFixed(6)}°<br>
          Долгота: ${startCoord[0].toFixed(6)}°
        </div>
      </div>
    `);
    
    endMarker.bindPopup(`
      <div style="font-family: 'Inter', sans-serif;">
        <h6 style="margin: 0 0 8px 0; font-weight: 600; color: #dc3545;">
          🏁 Точка ФИНИША
        </h6>
        <div style="font-size: 13px;">
          <strong>Координаты:</strong><br>
          Широта: ${endCoord[1].toFixed(6)}°<br>
          Долгота: ${endCoord[0].toFixed(6)}°
        </div>
      </div>
    `);
    
    return {
      layers: routeLayers,
      footprintsLayer: footprintsLayer,
      waypointsLayer: waypointsLayer,
      startMarker: startMarker,
      endMarker: endMarker
    };
  }
  
  return {
    layers: routeLayers,
    footprintsLayer: footprintsLayer,
    waypointsLayer: waypointsLayer,
    startMarker: null,
    endMarker: null
  };
}

/**
 * Очистка старого маршрута с карты
 * @param {L.Map} map - Объект карты Leaflet
 * @param {Object} oldRouteObj - Объект со старыми слоями
 */
function clearRouteVisualization(map, oldRouteObj) {
  if (!oldRouteObj) return;
  
  if (oldRouteObj.layers) {
    map.removeLayer(oldRouteObj.layers);
  }
  if (oldRouteObj.footprintsLayer) {
    map.removeLayer(oldRouteObj.footprintsLayer);
  }
  if (oldRouteObj.waypointsLayer) {
    map.removeLayer(oldRouteObj.waypointsLayer);
  }
  if (oldRouteObj.startMarker) {
    map.removeLayer(oldRouteObj.startMarker);
  }
  if (oldRouteObj.endMarker) {
    map.removeLayer(oldRouteObj.endMarker);
  }
}

