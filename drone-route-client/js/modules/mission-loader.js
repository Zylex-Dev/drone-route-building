/**
 * Модуль загрузки сохранённых миссий на карту
 * Работа с URL параметрами и восстановление состояния
 */

const MissionLoader = (function() {
  /**
   * Проверка URL параметров при загрузке страницы
   */
  function checkURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const missionId = urlParams.get('mission_id');
    
    if (missionId && AuthModule.isAuthenticated()) {
      loadMissionById(missionId);
    }
  }
  
  /**
   * Загрузка миссии по ID
   */
  async function loadMissionById(missionId) {
    console.log('Loading mission:', missionId);
    
    // Показываем индикатор загрузки (если есть)
    if (window.logger) {
      window.logger.info('Загрузка миссии', { module: 'MissionLoader', missionId });
    }
    
    try {
      const result = await MissionManager.getMissionById(missionId);
      
      if (!result.success) {
        alert('Ошибка загрузки миссии: ' + result.error);
        return;
      }
      
      const mission = result.mission;
      
      // Заполняем параметры в форме (делаем это до восстановления территории)
      restoreMissionParameters(mission);
      
      // Восстанавливаем территорию на карте
      if (mission.territory && mission.territory.coordinates) {
        const territoryPoints = restoreTerritory(mission.territory);
        
        // Строим маршрут автоматически после восстановления территории
        if (territoryPoints && typeof buildRoute === 'function') {
          setTimeout(() => {
            buildRoute(territoryPoints);
          }, 500);
        }
      }
      
      if (window.logger) {
        window.logger.info('Миссия успешно загружена', { 
          module: 'MissionLoader',
          missionName: mission.name
        });
      }
      
      // Показываем уведомление
      showNotification('success', `Миссия "${mission.name}" загружена`);
      
    } catch (error) {
      console.error('Error loading mission:', error);
      alert('Произошла ошибка при загрузке миссии');
    }
  }
  
  /**
   * Восстановление территории на карте
   * @returns {Array} Массив точек территории для построения маршрута
   */
  function restoreTerritory(territory) {
    if (!window.map || !territory.coordinates) {
      return null;
    }
    
    try {
      // Конвертируем GeoJSON coordinates в Leaflet LatLng
      const coordinates = territory.coordinates[0]; // Первое кольцо полигона
      const latlngs = coordinates.map(coord => [coord[1], coord[0]]); // [lng, lat] -> [lat, lng]
      
      // Создаём полигон на карте
      const polygon = L.polygon(latlngs, {
        color: '#3b82f6',
        weight: 2,
        fillOpacity: 0.2
      }).addTo(window.map);
      
      // Сохраняем в глобальную переменную (если используется)
      if (window.drawnItems) {
        window.drawnItems.clearLayers(); // Очищаем предыдущие слои
        window.drawnItems.addLayer(polygon);
      }
      
      // Центрируем карту на территории
      window.map.fitBounds(polygon.getBounds());
      
      // Возвращаем точки в формате {lat, lng} для построения маршрута
      return coordinates.map(coord => ({
        lat: coord[1],
        lng: coord[0]
      }));
      
    } catch (error) {
      console.error('Error restoring territory:', error);
      return null;
    }
  }
  
  /**
   * Восстановление параметров миссии в форме
   */
  function restoreMissionParameters(mission) {
    // Высота полёта
    const altitudeInput = document.getElementById('flightAltitude');
    if (altitudeInput && mission.flight_altitude) {
      altitudeInput.value = mission.flight_altitude;
    }
    
    // Боковое перекрытие
    const overlapInput = document.getElementById('desiredOverlap');
    if (overlapInput && mission.desired_overlap) {
      overlapInput.value = Math.round(mission.desired_overlap * 100);
    }
    
    // Продольное перекрытие
    const forwardOverlapInput = document.getElementById('forwardOverlap');
    if (forwardOverlapInput && mission.forward_overlap) {
      forwardOverlapInput.value = Math.round(mission.forward_overlap * 100);
    }
    
    // Модель дрона
    const droneModelSelect = document.getElementById('droneModel');
    if (droneModelSelect && mission.drone_model) {
      droneModelSelect.value = mission.drone_model;
    }
    
    // Учёт рельефа
    const terrainCheckbox = document.getElementById('enableTerrainFollowing');
    if (terrainCheckbox && typeof mission.enable_terrain_following !== 'undefined') {
      terrainCheckbox.checked = mission.enable_terrain_following;
    }
  }
  
  /**
   * Показ уведомления
   */
  function showNotification(type, message) {
    // Создаём toast/alert уведомление
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '80px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Автоматическое скрытие через 5 секунд
    setTimeout(() => {
      alertDiv.remove();
    }, 5000);
  }
  
  // Публичный API
  return {
    checkURLParameters,
    loadMissionById
  };
})();

// Экспорт для глобального использования
window.MissionLoader = MissionLoader;

