/**
 * Конфигурационный файл для клиентского приложения
 * Автоматически определяет окружение и настраивает API endpoints
 */

// Определение базового URL API в зависимости от окружения
// Для Docker с Nginx прокси используем пустую строку (относительные пути)
// Для локальной разработки без Docker используем localhost:3000
const API_BASE_URL = ''; // Все запросы идут через Nginx прокси на /api/*

// Экспорт конфигурации
window.APP_CONFIG = {
  API_BASE_URL: API_BASE_URL,
  API_ENDPOINTS: {
    CALCULATE_ROUTE: '/api/calculate-route'
  }
};

// Логируем конфигурацию через глобальный логгер (если доступен)
if (window.logger) {
  window.logger.info('Конфигурация API загружена', {
    module: 'Config',
    context: {
      apiBaseUrl: API_BASE_URL,
      endpoints: window.APP_CONFIG.API_ENDPOINTS
    }
  });
} else {
  console.log('API Configuration loaded:', window.APP_CONFIG);
}

