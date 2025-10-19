/**
 * Модуль управления рисованием полигонов
 * Обработка событий рисования на карте
 */

/**
 * Инициализация обработчиков событий рисования
 */
function initDrawingControls() {
  // Обработка завершения рисования объекта
  map.on(L.Draw.Event.CREATED, function (event) {
    const layer = event.layer;
    
    // Удаляем все старые полигоны территорий перед добавлением нового
    drawnItems.clearLayers();
    
    // Добавляем новый полигон
    drawnItems.addLayer(layer);

    // Удаляем ранее построенный маршрут и маркеры, если есть
    if (currentRouteVisualization) {
      clearRouteVisualization(map, currentRouteVisualization);
      currentRouteVisualization = null;
    }

    // Получаем координаты выделенной территории
    const territoryLatLngs = layer.getLatLngs()[0];
    const territoryPoints = territoryLatLngs.map(latlng => ({
      lat: latlng.lat,
      lng: latlng.lng
    }));

    // Строим маршрут для этой территории
    buildRoute(territoryPoints);
  });
}

