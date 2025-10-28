/**
 * Модуль модального окна сохранения миссии
 * Обработка формы и отправка данных на сервер
 */

const SaveMissionModal = (function() {
  let modal;
  let currentRouteData = null;
  let currentTerritory = null;
  
  /**
   * Инициализация модуля
   */
  function init() {
    // Инициализация модального окна
    const modalElement = document.getElementById('saveMissionModal');
    if (modalElement) {
      modal = new bootstrap.Modal(modalElement);
    }
    
    // Обработчик кнопки "Сохранить миссию"
    const saveMissionBtn = document.getElementById('saveMissionBtn');
    if (saveMissionBtn) {
      // Изначально кнопка видна, но неактивна
      saveMissionBtn.disabled = true;
      saveMissionBtn.style.display = 'block';
      
      saveMissionBtn.addEventListener('click', () => {
        // Проверяем авторизацию
        if (!AuthModule || !AuthModule.isAuthenticated()) {
          // Перенаправляем на страницу входа
          window.location.href = 'login.html';
          return;
        }
        
        // Проверяем наличие маршрута
        if (!window.currentRouteData) {
          alert('Сначала постройте маршрут');
          return;
        }
        
        openModal();
      });
    }
    
    // Обработчик кнопки подтверждения
    const confirmBtn = document.getElementById('confirmSaveMissionBtn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', handleSave);
    }
  }
  
  /**
   * Открытие модального окна
   */
  function openModal() {
    // Очистка формы
    document.getElementById('missionName').value = '';
    document.getElementById('missionDescription').value = '';
    
    const alertDiv = document.getElementById('saveMissionAlert');
    alertDiv.style.display = 'none';
    
    modal.show();
  }
  
  /**
   * Сбор данных миссии
   */
  function collectMissionData() {
    // Получаем территорию из карты
    const territory = getTerritoryFromMap();
    
    if (!territory) {
      throw new Error('Территория не определена');
    }
    
    // Получаем параметры из формы
    const flightAltitude = parseFloat(document.getElementById('flightAltitude').value);
    const desiredOverlap = parseFloat(document.getElementById('desiredOverlap').value) / 100;
    const forwardOverlap = parseFloat(document.getElementById('forwardOverlap').value) / 100;
    const droneModel = document.getElementById('droneModel').value;
    const enableTerrainFollowing = document.getElementById('enableTerrainFollowing').checked;
    
    // Получаем текущий маршрут (должен быть установлен извне)
    if (!window.currentRouteData) {
      throw new Error('Маршрут не построен');
    }
    
    return {
      territory: territory,
      flight_altitude: flightAltitude,
      desired_overlap: desiredOverlap,
      forward_overlap: forwardOverlap,
      drone_model: droneModel,
      shooting_type: 'Панорамная съемка',
      enable_terrain_following: enableTerrainFollowing,
      route_geojson: window.currentRouteData
    };
  }
  
  /**
   * Получение территории с карты
   */
  function getTerritoryFromMap() {
    if (!window.drawnItems) {
      return null;
    }
    
    let polygon = null;
    
    // Ищем полигон на карте
    window.drawnItems.eachLayer(layer => {
      if (layer instanceof L.Polygon) {
        polygon = layer;
      }
    });
    
    if (!polygon) {
      return null;
    }
    
    // Конвертируем в GeoJSON
    const latlngs = polygon.getLatLngs()[0];
    const coordinates = latlngs.map(latlng => [latlng.lng, latlng.lat]);
    
    // Замыкаем полигон
    if (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
        coordinates[0][1] !== coordinates[coordinates.length - 1][1]) {
      coordinates.push(coordinates[0]);
    }
    
    return {
      type: 'Polygon',
      coordinates: [coordinates]
    };
  }
  
  /**
   * Обработчик сохранения
   */
  async function handleSave() {
    const nameInput = document.getElementById('missionName');
    const descriptionInput = document.getElementById('missionDescription');
    const alertDiv = document.getElementById('saveMissionAlert');
    const confirmBtn = document.getElementById('confirmSaveMissionBtn');
    
    // Валидация названия
    if (!nameInput.value.trim()) {
      showModalAlert('danger', 'Введите название миссии');
      nameInput.focus();
      return;
    }
    
    // Показываем загрузку
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Сохранение...';
    alertDiv.style.display = 'none';
    
    try {
      // Собираем данные миссии
      const missionData = collectMissionData();
      
      // Добавляем название и описание
      missionData.name = nameInput.value.trim();
      missionData.description = descriptionInput.value.trim() || null;
      
      // Отправляем на сервер
      const result = await MissionManager.saveMission(missionData);
      
      if (result.success) {
        showModalAlert('success', 'Миссия успешно сохранена!');
        
        // Закрываем модальное окно и перенаправляем в профиль через 1.5 секунды
        setTimeout(() => {
          modal.hide();
          window.location.href = 'profile.html';
        }, 1500);
      } else {
        showModalAlert('danger', result.error || 'Ошибка сохранения миссии');
      }
      
    } catch (error) {
      console.error('Save mission error:', error);
      showModalAlert('danger', error.message || 'Произошла ошибка');
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Сохранить';
    }
  }
  
  /**
   * Показ alert в модальном окне
   */
  function showModalAlert(type, message) {
    const alertDiv = document.getElementById('saveMissionAlert');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.display = 'block';
  }
  
  /**
   * Показ/скрытие кнопки "Сохранить миссию"
   */
  /**
   * Включение/выключение кнопки "Сохранить миссию"
   * @param {boolean} enable - true для активации, false для деактивации
   */
  function toggleSaveButton(enable) {
    const saveMissionBtn = document.getElementById('saveMissionBtn');
    if (saveMissionBtn) {
      // Кнопка всегда видна, но меняем состояние disabled
      saveMissionBtn.disabled = !enable;
      
      // Визуальная подсказка
      if (enable) {
        saveMissionBtn.classList.remove('btn-secondary');
        saveMissionBtn.classList.add('btn-success');
        saveMissionBtn.title = 'Сохранить построенный маршрут';
      } else {
        saveMissionBtn.classList.remove('btn-success');
        saveMissionBtn.classList.add('btn-secondary');
        saveMissionBtn.title = 'Сначала постройте маршрут';
      }
    }
  }
  
  // Публичный API
  return {
    init,
    toggleSaveButton
  };
})();

// Экспорт для глобального использования
window.SaveMissionModal = SaveMissionModal;

