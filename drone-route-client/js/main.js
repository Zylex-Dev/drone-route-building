/**
 * Главный файл приложения Drone Flight Route Planner
 * Инициализация и координация всех модулей
 */

// ============================================================================
// Инициализация при загрузке страницы
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
  // Инициализация сворачиваемых секций
  setupCollapsibleSections();
  
  // Инициализация панели визуализации
  setupVisualizationPanelToggle();
  setupVisualizationCheckboxes();
  
  // Инициализация управления симуляцией
  setupSimulationControls();
});

// ============================================================================
// Обработчики событий
// ============================================================================

// Привязываем событие к кнопке "Удалить миссию"
document.getElementById('clearAll').addEventListener('click', clearAllObjects);

// Инициализация обработчиков рисования
initDrawingControls();

// Event listener для изменения модели дрона
document.getElementById('droneModel').addEventListener('change', (e) => {
  updateCameraInfo(e.target.value);
});

// Инициализация параметров камеры при загрузке страницы
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
