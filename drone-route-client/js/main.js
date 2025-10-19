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
});

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
