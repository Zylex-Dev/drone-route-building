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
    // Используем конфигурацию эндпоинтов
    const apiUrl = `${window.APP_CONFIG.API_ENDPOINTS.WEATHER}?latitude=${latitude}&longitude=${longitude}`;
    
    logger.debug('Отправка запроса на получение погоды', {
      module: 'WeatherBar',
      url: apiUrl
    });
    
    const response = await fetch(apiUrl);
    
    // Проверяем, что ответ успешен
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
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
  const weatherLabel = getWeatherIcon(current.weatherCode);
  const weatherLucide = getWeatherLucideIcon(current.weatherCode);
  const statusInfo = getFlightStatusInfo(conditions.level);

  weatherBar.innerHTML = `
    <div class="weather-section" title="${current.weatherDescription} (${weatherLabel})">
      <span class="weather-lucide-wrap"><i data-lucide="${weatherLucide}"></i></span>
      <span class="weather-value">${Math.round(current.temperature)}°C</span>
      <span class="weather-label">Температура</span>
    </div>
    
    <div class="weather-separator"></div>
    
    <div class="weather-section">
      <span class="weather-lucide-wrap"><i data-lucide="droplets"></i></span>
      <span class="weather-value">${current.humidity}%</span>
      <span class="weather-label">Влажность</span>
    </div>
    
    <div class="weather-separator"></div>
    
    <div class="weather-section">
      <span class="weather-lucide-wrap"><i data-lucide="wind"></i></span>
      <span class="weather-value">${Math.round(current.windSpeed)} м/с</span>
      <span class="weather-label">${current.windDirectionText}</span>
    </div>
    
    <div class="weather-separator"></div>
    
    <div class="weather-section">
      <span class="weather-lucide-wrap"><i data-lucide="gauge"></i></span>
      <span class="weather-value">${Math.round(current.windGusts)} м/с</span>
      <span class="weather-label">Порывы</span>
    </div>
    
    <div class="weather-separator"></div>
    
    <div class="weather-section">
      <span class="weather-lucide-wrap"><i data-lucide="cloud"></i></span>
      <span class="weather-value">${current.cloudCover}%</span>
      <span class="weather-label">Облачность</span>
    </div>
    
    <div class="weather-separator"></div>
    
    <div class="weather-section">
      <span class="weather-lucide-wrap"><i data-lucide="thermometer"></i></span>
      <span class="weather-value">${Math.round(current.pressure)} гПа</span>
      <span class="weather-label">Давление</span>
    </div>
    
    <div class="weather-separator"></div>
    
    <div class="weather-section weather-status weather-status-${conditions.level}" 
         title="${conditions.warnings.join('; ')}">
      <span class="weather-lucide-wrap"><i data-lucide="${statusInfo.lucideIcon}"></i></span>
      <span class="weather-value">${statusInfo.text}</span>
      <span class="weather-label">Условия полёта</span>
    </div>
    
    <div class="weather-refresh" id="weatherRefresh" title="Обновить данные о погоде">
      <i data-lucide="refresh-cw"></i>
    </div>
  `;
  
  // Показываем панель
  weatherBar.style.display = 'flex';
  
  // Добавляем обработчик для кнопки обновления
  const refreshButton = document.getElementById('weatherRefresh');
  if (refreshButton) {
    refreshButton.addEventListener('click', handleWeatherRefresh);
  }

  if (typeof refreshLucideIcons === 'function') {
    refreshLucideIcons();
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
 * Краткая метка условий по коду WMO (без emoji)
 * @param {number} code - WMO Weather code
 * @returns {string}
 */
function getWeatherIcon(code) {
  const labels = {
    0: 'ясно',
    1: 'ясно+',
    2: 'облачн',
    3: 'пасмур',
    45: 'туман',
    48: 'измороз',
    51: 'морось',
    53: 'морось',
    55: 'морось',
    56: 'мороз.л',
    57: 'мороз.с',
    61: 'дождь',
    63: 'дождь',
    65: 'дождь+',
    66: 'лёд.д',
    67: 'лёд.д+',
    71: 'снег',
    73: 'снег',
    75: 'снег+',
    77: 'крупа',
    80: 'ливень',
    81: 'ливень',
    82: 'ливень+',
    85: 'снегоп',
    86: 'снегоп+',
    95: 'гроза',
    96: 'гроза+',
    99: 'град'
  };

  return labels[code] || '—';
}

/**
 * Получить информацию о статусе условий полета
 * @param {string} level - Уровень условий (good, moderate, poor, dangerous)
 * @returns {Object} Объект с иконкой и текстом
 */
function getFlightStatusInfo(level) {
  const statusMap = {
    good: {
      lucideIcon: 'circle-check',
      text: 'Отлично'
    },
    moderate: {
      lucideIcon: 'cloud-sun',
      text: 'Приемлемо'
    },
    poor: {
      lucideIcon: 'cloud-rain',
      text: 'Плохо'
    },
    dangerous: {
      lucideIcon: 'ban',
      text: 'Опасно'
    }
  };

  return statusMap[level] || statusMap.good;
}

/**
 * Иконка Lucide по коду WMO
 * @param {number} code
 * @returns {string}
 */
function getWeatherLucideIcon(code) {
  if (code === 0 || code === 1) return 'sun';
  if (code === 2) return 'cloud-sun';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'cloud-fog';
  if (code >= 51 && code <= 57) return 'cloud-drizzle';
  if (code >= 61 && code <= 67) return 'cloud-rain';
  if (code >= 71 && code <= 77) return 'snowflake';
  if (code >= 80 && code <= 82) return 'cloud-rain';
  if (code >= 85 && code <= 86) return 'snowflake';
  if (code >= 95 && code <= 99) return 'cloud-lightning';
  return 'cloud';
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
          <span class="weather-lucide-wrap"><i data-lucide="cloud-off"></i></span>
          <span class="weather-value">Не удалось загрузить данные о погоде</span>
          <span class="weather-label">${error.message}</span>
        </div>
        <div class="weather-refresh" id="weatherRefresh" title="Попробовать снова">
          <i data-lucide="refresh-cw"></i>
        </div>
      `;
      weatherBar.style.display = 'flex';

      if (typeof refreshLucideIcons === 'function') {
        refreshLucideIcons();
      }

      const refreshButton = document.getElementById('weatherRefresh');
      if (refreshButton) {
        refreshButton.addEventListener('click', () => updateWeatherForRoute(coordinates));
      }
    }
  }
}

