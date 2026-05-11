/**
 * Модуль симуляции полёта дрона
 * Предоставляет анимированный предпросмотр полёта по построенному маршруту
 */

/**
 * Класс для симуляции полёта дрона по маршруту
 */
class FlightSimulator {
  constructor(map, routeData) {
    this.map = map;
    this.routeData = routeData;
    this.waypoints = this.extractWaypoints(routeData);
    
    // Подсчитываем только рабочие точки (где делаются снимки)
    this.workWaypoints = this.waypoints.filter(wp => wp.takePhoto);
    
    // Состояние симуляции
    this.isPlaying = false;
    this.isPaused = false;
    this.currentIndex = 0;
    this.speed = 1.0; // Множитель скорости (1x, 2x, 5x, 10x)
    this.animationFrameId = null;
    this.lastUpdateTime = 0;
    this.startTime = 0;
    this.elapsedTime = 0;
    this.photoCount = 0;
    
    // Визуальные элементы
    this.droneMarker = null;
    this.currentFootprint = null;
    this.pathTrace = null; // Пройденный путь
    this.progressLine = null; // Линия прогресса
    
    // Параметры анимации
    // Используем реальную крейсерскую скорость дрона из данных маршрута
    this.metersPerSecond = routeData.properties.missionStats.cruiseSpeed || 15; // м/с
    this.followDrone = true; // Следовать за дроном камерой
    
    // Для плавной интерполяции
    this.currentPosition = { 
      lat: this.waypoints[0].lat, 
      lng: this.waypoints[0].lng 
    };
    this.remainingDistanceInSegment = 0;
    
    this.initializeVisuals();
  }
  
  /**
   * Извлечение всех waypoints из данных маршрута
   */
  extractWaypoints(routeData) {
    const waypoints = [];
    const segments = routeData.properties.segments;
    let waypointNumber = 1;
    
    segments.forEach(segment => {
      if (segment.type === 'work') {
        // Рабочие сегменты - с фотосъёмкой
        segment.coordinates.forEach((coord, idx) => {
          waypoints.push({
            lat: coord[1],
            lng: coord[0],
            type: 'work',
            altitude: routeData.properties.flightAltitude,
            takePhoto: true,
            waypointNumber: waypointNumber++
          });
        });
      } else if (segment.type === 'transition') {
        // Переходы - без съёмки
        segment.coordinates.forEach((coord, idx) => {
          if (idx > 0) { // Пропускаем первую точку (дубликат последней точки предыдущего сегмента)
            waypoints.push({
              lat: coord[1],
              lng: coord[0],
              type: 'transition',
              altitude: routeData.properties.flightAltitude,
              takePhoto: false,
              waypointNumber: null
            });
          }
        });
      }
    });
    
    return waypoints;
  }
  
  /**
   * Инициализация визуальных элементов
   */
  initializeVisuals() {
    // Создаем маркер дрона (анимированная иконка)
    const droneIcon = L.divIcon({
      className: 'drone-marker-icon',
      html: `
        <div class="drone-container">
          <div class="drone-body">
            <div class="drone-icon" aria-hidden="true"></div>
          </div>
          <div class="drone-shadow"></div>
        </div>
      `,
      iconSize: [50, 50],
      iconAnchor: [25, 40]
    });
    
    this.droneMarker = L.marker(
      [this.waypoints[0].lat, this.waypoints[0].lng],
      { 
        icon: droneIcon,
        zIndexOffset: 2000
      }
    );
    
    // Popup для дрона с информацией
    this.droneMarker.bindPopup(`
      <div style="font-family: 'IBM Plex Sans', sans-serif; min-width: 180px;">
        <h6 style="margin: 0 0 8px 0; font-weight: 600; color: #0e7490;">
          Дрон в полёте
        </h6>
        <div style="font-size: 12px;">
          <strong>Статус:</strong> <span id="droneStatus">В движении</span><br>
          <strong>Высота:</strong> ${this.waypoints[0].altitude} м<br>
          <strong>Точка:</strong> <span id="droneWaypoint">1</span>/${this.waypoints.length}
        </div>
      </div>
    `);
    
    // Инициализируем массив для пройденного пути
    this.pathTrace = L.polyline([], {
      color: '#0e7490',
      weight: 3,
      opacity: 0.65,
      dashArray: '5, 5'
    });
    
    // Линия прогресса (более яркая)
    this.progressLine = L.polyline([], {
      color: '#28a745',
      weight: 4,
      opacity: 0.8
    });
  }
  
  /**
   * Запуск симуляции
   */
  start() {
    if (this.isPlaying) return;
    
    // Если симуляция уже была завершена, сбрасываем её
    if (this.currentIndex >= this.waypoints.length - 1) {
      this.stop();
      // Небольшая задержка для корректного перезапуска
      setTimeout(() => this.start(), 50);
      return;
    }
    
    this.isPlaying = true;
    this.isPaused = false;
    this.lastUpdateTime = performance.now();
    this.startTime = performance.now();
    
    // Сбрасываем photoCount и время только если начинаем с начала
    if (this.currentIndex === 0) {
      this.photoCount = 0;
      this.elapsedTime = 0;
      
      // Проверяем, нужно ли сделать фото на стартовой точке
      const startWaypoint = this.waypoints[0];
      if (startWaypoint && startWaypoint.takePhoto) {
        this.photoCount = 1;
        // Добавляем 2 секунды на первый снимок (стабилизация + съёмка)
        this.elapsedTime = 2;
        this.dispatchEvent('photoTaken', { 
          waypoint: startWaypoint,
          photoCount: this.photoCount
        });
      }
      
      // Отправляем начальный прогресс
      this.dispatchEvent('progressUpdated', {
        current: 1,
        total: this.waypoints.length,
        currentWaypoint: startWaypoint
      });
    }
    
    // Добавляем визуальные элементы на карту
    this.droneMarker.addTo(this.map);
    this.pathTrace.addTo(this.map);
    this.progressLine.addTo(this.map);
    
    // Центрируем камеру на дроне
    this.map.setView([this.waypoints[this.currentIndex].lat, this.waypoints[this.currentIndex].lng], 16);
    
    // Запускаем анимационный цикл
    this.animate();
    
    // Событие старта
    this.dispatchEvent('simulationStarted');
  }
  
  /**
   * Пауза симуляции
   */
  pause() {
    this.isPaused = true;
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.dispatchEvent('simulationPaused');
  }
  
  /**
   * Возобновление симуляции
   */
  resume() {
    if (!this.isPaused) return;
    
    this.isPaused = false;
    this.isPlaying = true;
    this.lastUpdateTime = performance.now();
    // Не сбрасываем elapsedTime - продолжаем с того же места
    this.animate();
    this.dispatchEvent('simulationResumed');
  }
  
  /**
   * Остановка и сброс симуляции
   */
  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Удаляем визуальные элементы
    if (this.droneMarker) this.map.removeLayer(this.droneMarker);
    if (this.pathTrace) this.map.removeLayer(this.pathTrace);
    if (this.progressLine) this.map.removeLayer(this.progressLine);
    if (this.currentFootprint) this.map.removeLayer(this.currentFootprint);
    
    // Сбрасываем индекс
    this.currentIndex = 0;
    this.elapsedTime = 0;
    this.photoCount = 0;
    
    // Очищаем пройденный путь
    this.pathTrace.setLatLngs([]);
    this.progressLine.setLatLngs([]);
    
    // Пересоздаем визуальные элементы для следующего запуска
    this.initializeVisuals();
    
    this.dispatchEvent('simulationStopped');
  }
  
  /**
   * Изменение скорости симуляции
   */
  setSpeed(speed) {
    this.speed = speed;
    this.dispatchEvent('speedChanged', { speed });
  }
  
  /**
   * Основной анимационный цикл
   */
  animate() {
    if (!this.isPlaying) return;
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // в секундах
    this.lastUpdateTime = currentTime;
    
    // Вычисляем, сколько метров должен пролететь дрон за deltaTime
    // При ускорении симуляции дрон пролетает больше расстояния за тот же визуальный кадр
    const distanceToMove = this.metersPerSecond * this.speed * deltaTime;
    
    // Двигаем дрон и получаем реальное пройденное расстояние
    const actualDistanceMoved = this.moveDrone(distanceToMove);
    
    if (actualDistanceMoved !== false) {
      // Обновляем прошедшее время на основе РЕАЛЬНО пройденного расстояния
      // Время = Расстояние / Скорость (реальная скорость дрона, без учета ускорения симуляции)
      const realTimeForDistance = actualDistanceMoved / this.metersPerSecond;
      this.elapsedTime += realTimeForDistance;
      this.dispatchEvent('timeUpdated', { elapsedTime: this.elapsedTime });
      
      // Продолжаем анимацию
      this.animationFrameId = requestAnimationFrame(() => this.animate());
    } else {
      // Достигнут конец маршрута
      this.isPlaying = false;
      this.dispatchEvent('simulationCompleted');
    }
  }
  
  /**
   * Перемещение дрона на заданное расстояние (оптимизированная версия)
   * @returns {number|false} Реальное пройденное расстояние в метрах или false если достигнут конец
   */
  moveDrone(distanceToMove) {
    let remainingDistance = distanceToMove;
    let actualDistanceMoved = 0; // Счётчик реально пройденного расстояния
    let frameUpdateCount = 0; // Счётчик для оптимизации обновлений
    
    while (remainingDistance > 0) {
      // Проверяем, достигли ли мы последней точки
      if (this.currentIndex >= this.waypoints.length) {
        return false; // Прошли все точки
      }
      
      // Если мы на последней точке, завершаем
      if (this.currentIndex === this.waypoints.length - 1) {
        return false; // Достигли конечной точки
      }
      
      const currentWP = this.waypoints[this.currentIndex];
      const nextWP = this.waypoints[this.currentIndex + 1];
      
      // Если только начали новый сегмент, вычисляем его длину
      if (this.remainingDistanceInSegment === 0) {
        this.remainingDistanceInSegment = this.calculateDistance(
          currentWP.lat, currentWP.lng,
          nextWP.lat, nextWP.lng
        );
      }
      
      if (remainingDistance >= this.remainingDistanceInSegment) {
        // Достигли следующей точки
        const distanceInThisSegment = this.remainingDistanceInSegment;
        remainingDistance -= this.remainingDistanceInSegment;
        actualDistanceMoved += distanceInThisSegment;
        this.remainingDistanceInSegment = 0;
        this.currentIndex++;
        
        const newWP = this.waypoints[this.currentIndex];
        this.currentPosition.lat = newWP.lat;
        this.currentPosition.lng = newWP.lng;
        
        // Обновляем визуализацию
        this.droneMarker.setLatLng([newWP.lat, newWP.lng]);
        this.pathTrace.addLatLng([newWP.lat, newWP.lng]);
        this.progressLine.addLatLng([newWP.lat, newWP.lng]);
        
        // Обновляем footprint и счётчик фото
        if (newWP.takePhoto) {
          this.updateFootprint(newWP);
          this.photoCount++;
          // Добавляем 2 секунды на фотосъёмку (стабилизация + съёмка)
          // Это реальное время, не ускоренное
          this.elapsedTime += 2;
          this.dispatchEvent('photoTaken', { 
            waypoint: newWP,
            photoCount: this.photoCount
          });
        }
        
        // Обновляем прогресс (только при достижении точки)
        // currentIndex начинается с 0, но отображаем с 1
        this.dispatchEvent('progressUpdated', {
          current: this.currentIndex + 1,
          total: this.waypoints.length,
          currentWaypoint: newWP
        });
        
        frameUpdateCount++;
      } else {
        // Интерполируем позицию внутри текущего сегмента
        this.remainingDistanceInSegment -= remainingDistance;
        actualDistanceMoved += remainingDistance;
        
        const totalSegmentDistance = this.calculateDistance(
          currentWP.lat, currentWP.lng,
          nextWP.lat, nextWP.lng
        );
        
        const traveledInSegment = totalSegmentDistance - this.remainingDistanceInSegment;
        const fraction = traveledInSegment / totalSegmentDistance;
        
        // Плавная интерполяция
        this.currentPosition.lat = currentWP.lat + (nextWP.lat - currentWP.lat) * fraction;
        this.currentPosition.lng = currentWP.lng + (nextWP.lng - currentWP.lng) * fraction;
        
        // Обновляем позицию маркера
        this.droneMarker.setLatLng([this.currentPosition.lat, this.currentPosition.lng]);
        
        // Добавляем точку в трейс периодически для оптимизации
        if (frameUpdateCount % 3 === 0) {
          this.pathTrace.addLatLng([this.currentPosition.lat, this.currentPosition.lng]);
        }
        
        remainingDistance = 0; // Закончили перемещение в этом кадре
      }
    }
    
    // Центрируем карту на дроне без анимации
    if (this.followDrone) {
      this.map.panTo([this.currentPosition.lat, this.currentPosition.lng], {
        animate: false,
        noMoveStart: true
      });
    }
    
    return actualDistanceMoved;
  }
  
  /**
   * Обновление footprint камеры (оптимизированная версия)
   */
  updateFootprint(waypoint) {
    // Проверяем опцию отображения footprint
    const showFootprint = document.getElementById('simShowFootprint');
    if (showFootprint && !showFootprint.checked) {
      return; // Не показываем footprint если опция отключена
    }
    
    // Удаляем старый footprint
    if (this.currentFootprint) {
      this.map.removeLayer(this.currentFootprint);
    }
    
    // Создаем новый footprint
    const groundWidth = parseFloat(this.routeData.properties.groundWidth);
    const groundLength = parseFloat(this.routeData.properties.groundLength);
    
    this.currentFootprint = this.createCameraFootprint(
      [waypoint.lat, waypoint.lng],
      groundWidth,
      groundLength,
      waypoint.waypointNumber
    );
    
    this.currentFootprint.addTo(this.map);
  }
  
  /**
   * Создание footprint камеры
   */
  createCameraFootprint(centerLatLng, groundWidth, groundLength, waypointNumber) {
    const [centerLat, centerLng] = centerLatLng;
    
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLng = 111320 * Math.cos(centerLat * Math.PI / 180);
    
    const halfWidth = (groundWidth / 2) / metersPerDegreeLng;
    const halfLength = (groundLength / 2) / metersPerDegreeLat;
    
    const bounds = [
      [centerLat - halfLength, centerLng - halfWidth],
      [centerLat + halfLength, centerLng + halfWidth]
    ];
    
    const footprint = L.rectangle(bounds, {
      color: '#ff6b6b',
      weight: 2,
      opacity: 0.8,
      fillColor: '#ff6b6b',
      fillOpacity: 0.2,
      className: 'simulation-footprint'
    });
    
    footprint.bindTooltip(`
      <div style="font-size: 11px; font-family: 'IBM Plex Sans', sans-serif;">
        <strong>Снимок #${waypointNumber}</strong><br>
        Размер: ${groundWidth.toFixed(1)}м × ${groundLength.toFixed(1)}м
      </div>
    `, {
      sticky: false,
      direction: 'top'
    });
    
    return footprint;
  }
  
  /**
   * Расчет расстояния между двумя точками (Haversine formula)
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Радиус Земли в метрах
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Расстояние в метрах
  }
  
  /**
   * Отправка пользовательских событий
   */
  dispatchEvent(eventName, data = {}) {
    const event = new CustomEvent(`flightSimulation:${eventName}`, {
      detail: data
    });
    window.dispatchEvent(event);
  }
  
  /**
   * Переход к определенной точке маршрута
   */
  seekToWaypoint(index) {
    if (index < 0 || index >= this.waypoints.length) return;
    
    const wasPaused = this.isPaused;
    const wasPlaying = this.isPlaying;
    
    // Останавливаем симуляцию
    if (wasPlaying || wasPaused) {
      this.pause();
    }
    
    // Устанавливаем новый индекс
    this.currentIndex = index;
    const waypoint = this.waypoints[index];
    
    // Обновляем позицию дрона
    this.droneMarker.setLatLng([waypoint.lat, waypoint.lng]);
    this.map.panTo([waypoint.lat, waypoint.lng]);
    
    // Обновляем трейс
    const traceCoords = this.waypoints.slice(0, index + 1).map(wp => [wp.lat, wp.lng]);
    this.pathTrace.setLatLngs(traceCoords);
    this.progressLine.setLatLngs(traceCoords);
    
    // Подсчитываем количество сделанных фото
    this.photoCount = this.waypoints.slice(0, index + 1).filter(wp => wp.takePhoto).length;
    
    // Пересчитываем прошедшее время
    // Время = (пройденное расстояние / скорость дрона) + (количество фото × 2 секунды)
    let totalDistance = 0;
    for (let i = 1; i <= index; i++) {
      const prevWP = this.waypoints[i - 1];
      const currWP = this.waypoints[i];
      totalDistance += this.calculateDistance(
        prevWP.lat, prevWP.lng,
        currWP.lat, currWP.lng
      );
    }
    const flightTime = totalDistance / this.metersPerSecond;
    const photoTime = this.photoCount * 2; // 2 секунды на каждое фото
    this.elapsedTime = flightTime + photoTime;
    
    // Обновляем время в UI
    this.dispatchEvent('timeUpdated', { elapsedTime: this.elapsedTime });
    
    // Обновляем footprint
    if (waypoint.takePhoto) {
      this.updateFootprint(waypoint);
    }
    
    // Возобновляем, если было запущено
    if (wasPlaying) {
      this.resume();
    }
    
    this.dispatchEvent('progressUpdated', {
      current: index + 1,
      total: this.waypoints.length,
      currentWaypoint: waypoint
    });
    
    this.dispatchEvent('photoTaken', { 
      waypoint: waypoint,
      photoCount: this.photoCount
    });
  }
}

