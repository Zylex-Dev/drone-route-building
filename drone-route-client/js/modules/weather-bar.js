/**
 * Модуль отображения погодной информации
 * Показывает текущую погоду в виде status bar снизу карты
 */

// Глобальная переменная для хранения текущих данных о погоде
let currentWeatherData = null;

/**
 * Получить данные о погоде для указанных координат
 * @param {number} latitude - Широта
 * @param {number} longitude - Долгота
 * @returns {Promise<Object>} Данные о погоде
 */
async function fetchWeatherData(latitude, longitude) {
  logger.info('Запрос данных о погоде', {
    module: 'WeatherBar',
    latitude,
    longitude
  });
  
  try {
    const apiUrl = `${window.APP_CONFIG.API_BASE_URL}/api/weather?latitude=${latitude}&longitude=${longitude}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Не удалось получить данные о погоде');
    }
    
    logger.info('Данные о погоде получены успешно', {
      module: 'WeatherBar',
      temperature: data.weather.current.temperature,
      conditions: data.weather.flightConditions.level
    });
    
    currentWeatherData = data.weather;
    return data.weather;
    
  } catch (error) {
    logger.error('Ошибка при получении данных о погоде', {
      module: 'WeatherBar',
      error: error.message
    });
    throw error;
  }
}

/**
 * Показать погодную панель с данными
 * @param {Object} weatherData - Данные о погоде
 */
function showWeatherBar(weatherData) {
  logger.debug('Отображение погодной панели', {
    module: 'WeatherBar'
  });
  
  const weatherBar = document.getElementById('weatherBar');
  if (!weatherBar) {
    logger.error('Элемент weatherBar не найден в DOM', {
      module: 'WeatherBar'
    });
    return;
  }
  
  const current = weatherData.current;
  const conditions = weatherData.flightConditions;
  
  // Определяем иконку погоды
  const weatherIcon = getWeatherIcon(current.weatherCode);
  
  // Определяем цвет и иконку статуса полета
  const statusInfo = getFlightStatusInfo(conditions.level);
  
  // Формируем HTML содержимое
  weatherBar.innerHTML = `
    <div class="weather-section">
      <span class="weather-icon" title="${current.weatherDescription}">${weatherIcon}</span>
      <span class="weather-value">${Math.round(current.temperature)}°C</span>
      <span class="weather-label">Температура</span>
    </div>
    
    <div class="weather-separator"></div>
    
    <div class="weather-section">
      <span class="weather-icon">💧</span>
      <span class="weather-value">${current.humidity}%</span>
      <span class="weather-label">Влажность</span>
    </div>
    
    <div class="weather-separator"></div>
    
    <div class="weather-section">
      <span class="weather-icon">💨</span>
      <span class="weather-value">${Math.round(current.windSpeed)} м/с</span>
      <span class="weather-label">${current.windDirectionText}</span>
    </div>
    
    <div class="weather-separator"></div>
    
    <div class="weather-section">
      <span class="weather-icon">🌬️</span>
      <span class="weather-value">${Math.round(current.windGusts)} м/с</span>
      <span class="weather-label">Порывы</span>
    </div>
    
    <div class="weather-separator"></div>
    
    <div class="weather-section">
      <span class="weather-icon">☁️</span>
      <span class="weather-value">${current.cloudCover}%</span>
      <span class="weather-label">Облачность</span>
    </div>
    
    <div class="weather-separator"></div>
    
    <div class="weather-section">
      <span class="weather-icon">🌡️</span>
      <span class="weather-value">${Math.round(current.pressure)} гПа</span>
      <span class="weather-label">Давление</span>
    </div>
    
    <div class="weather-separator"></div>
    
    <div class="weather-section weather-status weather-status-${conditions.level}" 
         title="${conditions.warnings.join('; ')}">
      <span class="weather-icon">${statusInfo.icon}</span>
      <span class="weather-value">${statusInfo.text}</span>
      <span class="weather-label">Условия полета</span>
    </div>
    
    <div class="weather-refresh" id="weatherRefresh" title="Обновить данные о погоде">
      <span class="refresh-icon">🔄</span>
    </div>
  `;
  
  // Показываем панель
  weatherBar.style.display = 'flex';
  
  // Добавляем обработчик для кнопки обновления
  const refreshButton = document.getElementById('weatherRefresh');
  if (refreshButton) {
    refreshButton.addEventListener('click', handleWeatherRefresh);
  }
  
  logger.info('Погодная панель отображена', {
    module: 'WeatherBar',
    conditions: conditions.level
  });
}

/**
 * Скрыть погодную панель
 */
function hideWeatherBar() {
  logger.debug('Скрытие погодной панели', {
    module: 'WeatherBar'
  });
  
  const weatherBar = document.getElementById('weatherBar');
  if (weatherBar) {
    weatherBar.style.display = 'none';
    weatherBar.innerHTML = '';
  }
}

/**
 * Обновить данные о погоде для текущей территории
 */
async function handleWeatherRefresh() {
  logger.info('Запрос обновления данных о погоде', {
    module: 'WeatherBar'
  });
  
  const refreshButton = document.getElementById('weatherRefresh');
  if (refreshButton) {
    refreshButton.classList.add('refreshing');
  }
  
  try {
    // Получаем центр текущей территории из глобальной переменной
    if (currentRouteData && currentRouteData.geometry && currentRouteData.geometry.coordinates.length > 0) {
      const coords = currentRouteData.geometry.coordinates;
      const centerIndex = Math.floor(coords.length / 2);
      const [lng, lat] = coords[centerIndex];
      
      const weatherData = await fetchWeatherData(lat, lng);
      showWeatherBar(weatherData);
    } else {
      logger.warn('Нет данных о маршруте для обновления погоды', {
        module: 'WeatherBar'
      });
    }
  } catch (error) {
    logger.error('Ошибка при обновлении погоды', {
      module: 'WeatherBar',
      error: error.message
    });
  } finally {
    if (refreshButton) {
      refreshButton.classList.remove('refreshing');
    }
  }
}

/**
 * Получить иконку погоды по коду WMO
 * @param {number} code - WMO Weather code
 * @returns {string} Emoji иконка
 */
function getWeatherIcon(code) {
  const icons = {
    0: '☀️',   // Ясно
    1: '🌤️',   // Преимущественно ясно
    2: '⛅',   // Переменная облачность
    3: '☁️',   // Пасмурно
    45: '🌫️',  // Туман
    48: '🌫️',  // Изморозь
    51: '🌦️',  // Легкая морось
    53: '🌦️',  // Умеренная морось
    55: '🌧️',  // Сильная морось
    56: '🌧️',  // Легкая ледяная морось
    57: '🌧️',  // Сильная ледяная морось
    61: '🌧️',  // Небольшой дождь
    63: '🌧️',  // Умеренный дождь
    65: '⛈️',  // Сильный дождь
    66: '🌧️',  // Легкий ледяной дождь
    67: '🌧️',  // Сильный ледяной дождь
    71: '🌨️',  // Небольшой снег
    73: '🌨️',  // Умеренный снег
    75: '❄️',  // Сильный снег
    77: '🌨️',  // Снежная крупа
    80: '🌦️',  // Небольшой ливень
    81: '🌧️',  // Умеренный ливень
    82: '⛈️',  // Сильный ливень
    85: '🌨️',  // Небольшой снегопад
    86: '❄️',  // Сильный снегопад
    95: '⛈️',  // Гроза
    96: '⛈️',  // Гроза с небольшим градом
    99: '⛈️'   // Гроза с сильным градом
  };
  
  return icons[code] || '🌡️';
}

/**
 * Получить информацию о статусе условий полета
 * @param {string} level - Уровень условий (good, moderate, poor, dangerous)
 * @returns {Object} Объект с иконкой и текстом
 */
function getFlightStatusInfo(level) {
  const statusMap = {
    good: {
      icon: '✅',
      text: 'Отлично'
    },
    moderate: {
      icon: '⚠️',
      text: 'Приемлемо'
    },
    poor: {
      icon: '⚠️',
      text: 'Плохо'
    },
    dangerous: {
      icon: '🚫',
      text: 'Опасно'
    }
  };
  
  return statusMap[level] || statusMap.good;
}

/**
 * Обновить погоду для территории после построения маршрута
 * @param {Array} coordinates - Координаты маршрута
 */
async function updateWeatherForRoute(coordinates) {
  logger.info('Обновление погоды для построенного маршрута', {
    module: 'WeatherBar',
    coordinatesCount: coordinates.length
  });
  
  if (!coordinates || coordinates.length === 0) {
    logger.warn('Нет координат для обновления погоды', {
      module: 'WeatherBar'
    });
    return;
  }
  
  try {
    // Вычисляем центр маршрута
    const centerIndex = Math.floor(coordinates.length / 2);
    const [lng, lat] = coordinates[centerIndex];
    
    logger.debug('Центр маршрута для погоды', {
      module: 'WeatherBar',
      latitude: lat,
      longitude: lng
    });
    
    const weatherData = await fetchWeatherData(lat, lng);
    showWeatherBar(weatherData);
    
  } catch (error) {
    logger.error('Не удалось получить данные о погоде для маршрута', {
      module: 'WeatherBar',
      error: error.message
    });
    
    // Показываем сообщение об ошибке в панели
    const weatherBar = document.getElementById('weatherBar');
    if (weatherBar) {
      weatherBar.innerHTML = `
        <div class="weather-section weather-error">
          <span class="weather-icon">⚠️</span>
          <span class="weather-value">Не удалось загрузить данные о погоде</span>
          <span class="weather-label">${error.message}</span>
        </div>
        <div class="weather-refresh" id="weatherRefresh" title="Попробовать снова">
          <span class="refresh-icon">🔄</span>
        </div>
      `;
      weatherBar.style.display = 'flex';
      
      // Добавляем обработчик для повторной попытки
      const refreshButton = document.getElementById('weatherRefresh');
      if (refreshButton) {
        refreshButton.addEventListener('click', () => updateWeatherForRoute(coordinates));
      }
    }
  }
}

