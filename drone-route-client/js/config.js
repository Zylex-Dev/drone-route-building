/**
 * Конфигурационный файл для клиентского приложения
 * Автоматически определяет окружение и настраивает API endpoints
 */

// Определение базового URL API в зависимости от окружения
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : `${window.location.protocol}//${window.location.hostname}:3000`;

// Экспорт конфигурации
window.APP_CONFIG = {
  API_BASE_URL: API_BASE_URL,
  API_ENDPOINTS: {
    CALCULATE_ROUTE: '/api/calculate-route'
  }
};

console.log('API Configuration loaded:', window.APP_CONFIG);

