/**
 * Сервис для получения данных о погоде через Open-Meteo API
 * Open-Meteo предоставляет бесплатный доступ без токенов
 * Документация: https://open-meteo.com/en/docs
 */

const https = require('https');
const { app: logger } = require('../utils/logger');

/**
 * Получить прогноз погоды для указанных координат
 * @param {number} latitude - Широта
 * @param {number} longitude - Долгота
 * @returns {Promise<Object>} Данные о погоде
 */
async function getWeatherForecast(latitude, longitude) {
  const startTime = Date.now();
  
  logger.info('Запрос данных о погоде', {
    module: 'WeatherService',
    latitude,
    longitude
  });
  
  // Параметры для Open-Meteo API
  // Получаем текущую погоду и прогноз на ближайшие часы
  const params = new URLSearchParams({
    latitude: latitude.toFixed(6),
    longitude: longitude.toFixed(6),
    current: [
      'temperature_2m',           // Температура на высоте 2м
      'relative_humidity_2m',     // Влажность
      'apparent_temperature',     // Ощущаемая температура
      'precipitation',            // Осадки
      'rain',                     // Дождь
      'weather_code',             // Код погоды (WMO)
      'cloud_cover',              // Облачность
      'pressure_msl',             // Давление на уровне моря
      'surface_pressure',         // Давление на поверхности
      'wind_speed_10m',           // Скорость ветра на высоте 10м
      'wind_direction_10m',       // Направление ветра на высоте 10м
      'wind_gusts_10m'            // Порывы ветра на высоте 10м
    ].join(','),
    hourly: [
      'temperature_2m',
      'precipitation_probability',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m'
    ].join(','),
    timezone: 'auto',
    forecast_days: 1
  });
  
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  
  logger.debug('URL запроса Open-Meteo API', {
    module: 'WeatherService',
    url
  });
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        
        if (res.statusCode !== 200) {
          logger.error('Ошибка при запросе данных о погоде', {
            module: 'WeatherService',
            statusCode: res.statusCode,
            response: data,
            duration: `${duration}ms`
          });
          reject(new Error(`Open-Meteo API returned status ${res.statusCode}`));
          return;
        }
        
        try {
          const weatherData = JSON.parse(data);
          
          logger.info('Данные о погоде успешно получены', {
            module: 'WeatherService',
            duration: `${duration}ms`,
            dataSize: `${data.length} bytes`
          });
          
          // Форматируем данные для удобного использования
          const formattedData = formatWeatherData(weatherData);
          
          resolve(formattedData);
        } catch (error) {
          logger.error('Ошибка парсинга ответа Open-Meteo API', {
            module: 'WeatherService',
            error: error.message,
            response: data.substring(0, 500) // Первые 500 символов для отладки
          });
          reject(error);
        }
      });
    }).on('error', (error) => {
      logger.error('Ошибка сетевого запроса к Open-Meteo API', {
        module: 'WeatherService',
        error: error.message,
        stack: error.stack
      });
      reject(error);
    });
  });
}

/**
 * Форматирование данных о погоде
 * @param {Object} rawData - Сырые данные от Open-Meteo API
 * @returns {Object} Отформатированные данные
 */
function formatWeatherData(rawData) {
  const current = rawData.current;
  const hourly = rawData.hourly;
  
  // Получаем описание погоды по WMO коду
  const weatherDescription = getWeatherDescription(current.weather_code);
  
  // Получаем направление ветра в текстовом виде
  const windDirection = getWindDirection(current.wind_direction_10m);
  
  // Прогноз на следующие часы (берем первые 6 часов)
  const hourlyForecast = [];
  if (hourly && hourly.time) {
    for (let i = 0; i < Math.min(6, hourly.time.length); i++) {
      hourlyForecast.push({
        time: hourly.time[i],
        temperature: hourly.temperature_2m[i],
        precipitation: hourly.precipitation[i],
        precipitationProbability: hourly.precipitation_probability[i],
        weatherCode: hourly.weather_code[i],
        weatherDescription: getWeatherDescription(hourly.weather_code[i]),
        windSpeed: hourly.wind_speed_10m[i],
        windDirection: getWindDirection(hourly.wind_direction_10m[i])
      });
    }
  }
  
  return {
    current: {
      temperature: current.temperature_2m,
      apparentTemperature: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      precipitation: current.precipitation,
      rain: current.rain,
      weatherCode: current.weather_code,
      weatherDescription: weatherDescription,
      cloudCover: current.cloud_cover,
      pressure: current.pressure_msl,
      surfacePressure: current.surface_pressure,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      windDirectionText: windDirection,
      windGusts: current.wind_gusts_10m,
      time: current.time
    },
    hourlyForecast: hourlyForecast,
    location: {
      latitude: rawData.latitude,
      longitude: rawData.longitude,
      elevation: rawData.elevation,
      timezone: rawData.timezone
    },
    // Оценка условий для полета дрона
    flightConditions: assessFlightConditions(current)
  };
}

/**
 * Получить описание погоды по WMO коду
 * @param {number} code - WMO Weather interpretation code
 * @returns {string} Описание погоды
 */
function getWeatherDescription(code) {
  const weatherCodes = {
    0: 'Ясно',
    1: 'Преимущественно ясно',
    2: 'Переменная облачность',
    3: 'Пасмурно',
    45: 'Туман',
    48: 'Изморозь',
    51: 'Легкая морось',
    53: 'Умеренная морось',
    55: 'Сильная морось',
    56: 'Легкая ледяная морось',
    57: 'Сильная ледяная морось',
    61: 'Небольшой дождь',
    63: 'Умеренный дождь',
    65: 'Сильный дождь',
    66: 'Легкий ледяной дождь',
    67: 'Сильный ледяной дождь',
    71: 'Небольшой снег',
    73: 'Умеренный снег',
    75: 'Сильный снег',
    77: 'Снежная крупа',
    80: 'Небольшой ливень',
    81: 'Умеренный ливень',
    82: 'Сильный ливень',
    85: 'Небольшой снегопад',
    86: 'Сильный снегопад',
    95: 'Гроза',
    96: 'Гроза с небольшим градом',
    99: 'Гроза с сильным градом'
  };
  
  return weatherCodes[code] || 'Неизвестно';
}

/**
 * Получить направление ветра в текстовом виде
 * @param {number} degrees - Направление в градусах (0-360)
 * @returns {string} Направление ветра
 */
function getWindDirection(degrees) {
  const directions = [
    'С', 'ССВ', 'СВ', 'ВСВ',
    'В', 'ВЮВ', 'ЮВ', 'ЮЮВ',
    'Ю', 'ЮЮЗ', 'ЮЗ', 'ЗЮЗ',
    'З', 'ЗСЗ', 'СЗ', 'ССЗ'
  ];
  
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Оценка условий для полета дрона
 * @param {Object} current - Текущие погодные условия
 * @returns {Object} Оценка условий
 */
function assessFlightConditions(current) {
  const conditions = {
    safe: true,
    warnings: [],
    level: 'good' // good, moderate, poor, dangerous
  };
  
  // Проверка скорости ветра
  if (current.wind_speed_10m > 15) {
    conditions.safe = false;
    conditions.level = 'dangerous';
    conditions.warnings.push('Опасная скорость ветра (>15 м/с)');
  } else if (current.wind_speed_10m > 10) {
    conditions.level = 'poor';
    conditions.warnings.push('Высокая скорость ветра (>10 м/с)');
  } else if (current.wind_speed_10m > 7) {
    conditions.level = 'moderate';
    conditions.warnings.push('Умеренная скорость ветра (>7 м/с)');
  }
  
  // Проверка порывов ветра
  if (current.wind_gusts_10m > 20) {
    conditions.safe = false;
    conditions.level = 'dangerous';
    conditions.warnings.push('Опасные порывы ветра (>20 м/с)');
  } else if (current.wind_gusts_10m > 12) {
    conditions.level = conditions.level === 'good' ? 'moderate' : conditions.level;
    conditions.warnings.push('Сильные порывы ветра (>12 м/с)');
  }
  
  // Проверка осадков
  if (current.precipitation > 5) {
    conditions.safe = false;
    conditions.level = 'dangerous';
    conditions.warnings.push('Сильные осадки (>5 мм/ч)');
  } else if (current.precipitation > 2) {
    conditions.level = conditions.level === 'good' ? 'moderate' : conditions.level;
    conditions.warnings.push('Умеренные осадки (>2 мм/ч)');
  } else if (current.precipitation > 0) {
    conditions.warnings.push('Небольшие осадки');
  }
  
  // Проверка видимости (облачность как косвенный показатель)
  if (current.cloud_cover > 90) {
    conditions.warnings.push('Очень высокая облачность');
  }
  
  // Проверка кода погоды на опасные условия
  const dangerousCodes = [45, 48, 56, 57, 66, 67, 75, 77, 82, 86, 95, 96, 99];
  if (dangerousCodes.includes(current.weather_code)) {
    conditions.safe = false;
    conditions.level = 'dangerous';
    conditions.warnings.push('Опасные погодные условия');
  }
  
  // Если нет предупреждений, условия отличные
  if (conditions.warnings.length === 0) {
    conditions.warnings.push('Отличные условия для полета');
  }
  
  logger.debug('Оценка условий для полета', {
    module: 'WeatherService',
    conditions
  });
  
  return conditions;
}

module.exports = {
  getWeatherForecast
};
