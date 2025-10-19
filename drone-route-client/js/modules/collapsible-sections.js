/**
 * Модуль сворачиваемых секций
 * Управление сворачиванием/разворачиванием секций боковой панели
 */

/**
 * Функция для сворачивания/разворачивания секций
 */
function setupCollapsibleSections() {
  // Секция "Параметры покрытия"
  const coverageToggle = document.getElementById('coverageToggle');
  const coverageContent = document.getElementById('coverageContent');
  
  if (coverageToggle && coverageContent) {
    coverageToggle.addEventListener('click', function() {
      const icon = this.querySelector('.toggle-icon');
      if (coverageContent.classList.contains('collapsed')) {
        coverageContent.classList.remove('collapsed');
        coverageContent.style.display = 'block';
        icon.textContent = '▼';
        icon.classList.remove('rotated');
      } else {
        coverageContent.classList.add('collapsed');
        setTimeout(() => {
          coverageContent.style.display = 'none';
        }, 300);
        icon.textContent = '▶';
        icon.classList.add('rotated');
      }
    });
  }
  
  // Секция "Технические параметры"
  const techToggle = document.getElementById('techToggle');
  const techContent = document.getElementById('techContent');
  
  if (techToggle && techContent) {
    techToggle.addEventListener('click', function() {
      const icon = this.querySelector('.toggle-icon');
      if (techContent.classList.contains('collapsed')) {
        techContent.classList.remove('collapsed');
        techContent.style.display = 'block';
        icon.textContent = '▼';
        icon.classList.remove('rotated');
      } else {
        techContent.classList.add('collapsed');
        setTimeout(() => {
          techContent.style.display = 'none';
        }, 300);
        icon.textContent = '▶';
        icon.classList.add('rotated');
      }
    });
  }
}

/**
 * Кнопка сворачивания/разворачивания панели визуализации
 */
function setupVisualizationPanelToggle() {
  const togglePanelBtn = document.getElementById('toggleControlPanel');
  const controlPanelContent = document.getElementById('controlPanelContent');
  
  if (togglePanelBtn && controlPanelContent) {
    togglePanelBtn.addEventListener('click', () => {
      if (controlPanelContent.classList.contains('collapsed')) {
        controlPanelContent.classList.remove('collapsed');
        togglePanelBtn.textContent = '▼';
        togglePanelBtn.title = 'Свернуть';
      } else {
        controlPanelContent.classList.add('collapsed');
        togglePanelBtn.textContent = '▶';
        togglePanelBtn.title = 'Развернуть';
      }
    });
  }
}

/**
 * Обработчики для чекбоксов визуализации
 */
function setupVisualizationCheckboxes() {
  const showFootprintsCheckbox = document.getElementById('showFootprints');
  const showWaypointsCheckbox = document.getElementById('showWaypoints');
  
  if (showFootprintsCheckbox) {
    showFootprintsCheckbox.addEventListener('change', (e) => {
      if (currentRouteVisualization && currentRouteVisualization.footprintsLayer) {
        if (e.target.checked) {
          currentRouteVisualization.footprintsLayer.addTo(map);
        } else {
          map.removeLayer(currentRouteVisualization.footprintsLayer);
        }
      }
    });
  }
  
  if (showWaypointsCheckbox) {
    showWaypointsCheckbox.addEventListener('change', (e) => {
      if (currentRouteVisualization && currentRouteVisualization.waypointsLayer) {
        if (e.target.checked) {
          currentRouteVisualization.waypointsLayer.addTo(map);
        } else {
          map.removeLayer(currentRouteVisualization.waypointsLayer);
        }
      }
    });
  }
}

