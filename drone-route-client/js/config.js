/**
 * Конфигурационный файл для клиентского приложения
 * Автоматически определяет окружение и настраивает API endpoints
 */

// Определение базового URL API в зависимости от окружения
// В Docker с Nginx прокси используем относительные пути (пустую строку)
// Nginx проксирует запросы на соответствующие сервисы
const API_BASE_URL = ''; // Относительные пути через Nginx прокси

// Экспорт конфигурации
window.APP_CONFIG = {
  API_BASE_URL: API_BASE_URL,
  API_ENDPOINTS: {
    // Route service (проксируется Nginx на drone_route_server:3000)
    CALCULATE_ROUTE: `${API_BASE_URL}/api/calculate-route`,
    LOGS: `${API_BASE_URL}/api/logs/client`,
    WEATHER: `${API_BASE_URL}/api/weather`,
    
    // Auth service (проксируется Nginx на drone_route_auth:8000)
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    GET_ME: `${API_BASE_URL}/api/auth/me`,
    
    // Mission service (проксируется Nginx на drone_route_auth:8000)
    MISSIONS: `${API_BASE_URL}/api/missions`
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

