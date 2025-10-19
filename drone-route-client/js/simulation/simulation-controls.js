/**
 * Модуль управления симуляцией полёта
 * Обработчики элементов управления симуляцией
 */

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

