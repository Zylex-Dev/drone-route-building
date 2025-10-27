/**
 * Модуль инициализации карты
 * Инициализирует Leaflet карту, tile layer, draw controls
 */

// Координаты центра Коломны
const kolomnaCoords = [55.095276, 38.765574];

// Создаем слой карты OpenStreetMap
const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
});

// Инициализируем карту
const map = L.map('map', { layers: [tileLayer] }).setView(kolomnaCoords, 13);

// Экспортируем map в window для доступа из других модулей
window.map = map;

// Маркер центра Коломны (опционально)
L.marker(kolomnaCoords).addTo(map)
  .bindPopup('Коломна')
  .openPopup();

// Группа для хранения нарисованных объектов
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Экспортируем drawnItems в window для доступа из других модулей
window.drawnItems = drawnItems;

// Объект для хранения визуализации маршрута
let currentRouteVisualization = null;

// Объект для хранения симулятора полёта
let flightSimulator = null;
let currentRouteData = null; // Сохраняем данные маршрута для симуляции

// Экспортируем currentRouteData в window для доступа из других модулей
window.currentRouteData = null;

// Настройка панели рисования
const drawControl = new L.Control.Draw({
  edit: {
    featureGroup: drawnItems,
    remove: true
  },
  draw: {
    polygon: {
      allowIntersection: false,
      showArea: true,
      drawError: {
        color: '#e1e100',
        message: '<strong>Ошибка:</strong> Полигон пересекается сам с собой!'
      },
      shapeOptions: {
        color: '#6c757d',
        fillColor: '#8e9aab',
        fillOpacity: 0.3
      }
    },
    rectangle: { 
      shapeOptions: { 
        color: '#6c757d', 
        fillColor: '#8e9aab', 
        fillOpacity: 0.3
      } 
    },
    polyline: false,
    circle: false,
    marker: false,
    circlemarker: false
  }
});
map.addControl(drawControl);

