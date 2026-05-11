/**
 * Главный файл приложения Drone Flight Route Planner
 * Инициализация и координация всех модулей
 */

// ============================================================================
// Инициализация при загрузке страницы
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
  logger.info('DOM полностью загружен, начало инициализации приложения', {
    module: 'Main'
  });
  
  // Инициализация UI авторизации
  initAuthUI();
  logger.debug('UI авторизации инициализирован', { module: 'Main' });
  
  // Инициализация модального окна сохранения миссии
  if (typeof SaveMissionModal !== 'undefined') {
    SaveMissionModal.init();
    logger.debug('Модальное окно сохранения миссии инициализировано', { module: 'Main' });
  }
  
  // Проверка URL параметров для загрузки миссии
  if (typeof MissionLoader !== 'undefined') {
    MissionLoader.checkURLParameters();
    logger.debug('Проверка URL параметров выполнена', { module: 'Main' });
  }
  
  // Инициализация сворачиваемых секций
  setupCollapsibleSections();
  logger.debug('Сворачиваемые секции инициализированы', { module: 'Main' });
  
  // Инициализация панели визуализации
  setupVisualizationPanelToggle();
  setupVisualizationCheckboxes();
  logger.debug('Панель визуализации инициализирована', { module: 'Main' });
  
  // Инициализация управления симуляцией
  setupSimulationControls();
  logger.debug('Управление симуляцией инициализировано', { module: 'Main' });
  
  logger.info('Приложение успешно инициализировано', { module: 'Main' });

  if (typeof refreshLucideIcons === 'function') {
    refreshLucideIcons();
  }
});

// ============================================================================
// Инициализация UI авторизации
// ============================================================================

function initAuthUI() {
  const unauthenticatedNav = document.getElementById('unauthenticatedNav');
  const authenticatedNav = document.getElementById('authenticatedNav');
  const userEmailNav = document.getElementById('userEmailNav');
  
  if (typeof AuthModule === 'undefined') {
    // Модуль авторизации не загружен
    if (unauthenticatedNav) unauthenticatedNav.style.display = 'block';
    return;
  }
  
  if (AuthModule.isAuthenticated()) {
    // Пользователь авторизован
    if (authenticatedNav) authenticatedNav.style.display = 'flex';
    
    const user = AuthModule.getUser();
    if (user && user.email && userEmailNav) {
      userEmailNav.classList.add('user-email-nav');
      userEmailNav.innerHTML = `<i data-lucide="user"></i><span class="user-email-text"></span>`;
      const textEl = userEmailNav.querySelector('.user-email-text');
      if (textEl) textEl.textContent = user.email;
      if (typeof refreshLucideIcons === 'function') {
        refreshLucideIcons();
      }
    }
  } else {
    // Пользователь не авторизован
    if (unauthenticatedNav) unauthenticatedNav.style.display = 'block';
  }
}

// ============================================================================
// Обработчики событий
// ============================================================================

// Привязываем событие к кнопке "Удалить миссию"
document.getElementById('clearAll').addEventListener('click', clearAllObjects);

// Инициализация обработчиков рисования
initDrawingControls();

// Обработчики экспорта маршрута
document.getElementById('exportGeoJSON').addEventListener('click', () => {
  logger.debug('Клик по кнопке экспорта GeoJSON', { module: 'Main' });
  if (exportManager && exportManager.getCurrentRoute()) {
    exportManager.exportToGeoJSON();
  } else {
    logger.warn('Попытка экспорта без маршрута', { module: 'Main', format: 'GeoJSON' });
  }
});

document.getElementById('exportKML').addEventListener('click', () => {
  logger.debug('Клик по кнопке экспорта KML', { module: 'Main' });
  if (exportManager && exportManager.getCurrentRoute()) {
    exportManager.exportToKML();
  } else {
    logger.warn('Попытка экспорта без маршрута', { module: 'Main', format: 'KML' });
  }
});

document.getElementById('exportKMZ').addEventListener('click', () => {
  logger.debug('Клик по кнопке экспорта KMZ', { module: 'Main' });
  if (exportManager && exportManager.getCurrentRoute()) {
    exportManager.exportToKMZ();
  } else {
    logger.warn('Попытка экспорта без маршрута', { module: 'Main', format: 'KMZ' });
  }
});

// Event listener для изменения модели дрона
document.getElementById('droneModel').addEventListener('change', (e) => {
  logger.info('Изменена модель дрона', { module: 'Main', droneModel: e.target.value });
  updateCameraInfo(e.target.value);
});

// Обработчик кнопки "Профиль рельефа"
document.getElementById('showTerrainProfile').addEventListener('click', () => {
  logger.debug('Клик по кнопке "Профиль рельефа"', { module: 'Main' });
  
  // Получаем данные о рельефе из текущего маршрута
  if (currentRouteData && currentRouteData.properties && currentRouteData.properties.terrainData) {
    showTerrainProfileModal(currentRouteData.properties.terrainData);
  } else {
    logger.warn('Попытка открыть профиль рельефа без данных', { module: 'Main' });
    alert('Данные о рельефе недоступны. Убедитесь, что маршрут построен с включенной опцией "Учитывать рельеф местности".');
  }
});

// Обработчик переключения тепловой карты рельефа
document.getElementById('showHeatmap').addEventListener('change', function(e) {
  const shouldShow = e.target.checked;
  toggleElevationHeatmap(map, shouldShow);
  
  logger.info('Тепловая карта рельефа ' + (shouldShow ? 'показана' : 'скрыта'), {
    module: 'Main',
    heatmapVisible: shouldShow
  });
});

// Обработчик переключения учета рельефа (управляет доступностью чекбокса тепловой карты)
document.getElementById('enableTerrainFollowing').addEventListener('change', function(e) {
  const enableTerrain = e.target.checked;
  const heatmapCheckbox = document.getElementById('showHeatmap');
  
  if (!enableTerrain) {
    // Если рельеф выключен, отключаем и чекбокс тепловой карты
    heatmapCheckbox.checked = false;
    heatmapCheckbox.disabled = true;
    
    // Скрываем тепловую карту, если она отображена
    toggleElevationHeatmap(map, false);
    
    logger.info('Учет рельефа выключен, тепловая карта отключена', {
      module: 'Main'
    });
  } else {
    // Если рельеф включен, разблокируем чекбокс тепловой карты
    heatmapCheckbox.disabled = false;
    
    logger.info('Учет рельефа включен, тепловая карта доступна', {
      module: 'Main'
    });
  }
});

// Инициализация параметров камеры при загрузке страницы
logger.debug('Инициализация параметров камеры по умолчанию', { module: 'Main', droneModel: 'DJI Matrice 30T' });
updateCameraInfo('DJI Matrice 30T');

// ============================================================================
// Примечание: Все функции импортированы из модулей:
// - map-init.js: карта, слои, переменные (map, drawnItems, etc.)
// - ui-controller.js: управление UI (clearAllObjects, updateMissionInfo, etc.)
// - route-builder.js: построение маршрута (buildRoute, validateInputs)
// - drawing-controls.js: обработка рисования (initDrawingControls)
// - collapsible-sections.js: сворачиваемые секции
// - simulation-controls.js: управление симуляцией
// ============================================================================
