/**
 * Сервис для работы с Elevation API
 * Получение данных о высоте рельефа местности
 */

const axios = require('axios');
const { calculation: logger } = require('../utils/logger');

// URL Elevation API
const ELEVATION_API_URL = 'https://api.open-elevation.com/api/v1/lookup';

// Настройки для батчинга запросов
const MAX_LOCATIONS_PER_REQUEST = 100; // Максимум точек в одном запросе
const REQUEST_RETRY_COUNT = 3; // Количество попыток при ошибке
const REQUEST_RETRY_DELAY = 1000; // Задержка между попытками (мс)

// Простое кэширование в памяти
const elevationCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа

/**
 * Генерация ключа кэша для координат
 * @param {number} lat - Широта
 * @param {number} lng - Долгота
 * @returns {string} Ключ кэша
 */
function getCacheKey(lat, lng) {
  // Округляем до 5 знаков после запятой (~1 метр точности)
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

/**
 * Получение данных из кэша
 * @param {string} key - Ключ кэша
 * @returns {Object|null} Данные из кэша или null
 */
function getFromCache(key) {
  const cached = elevationCache.get(key);
  if (!cached) return null;
  
  // Проверяем срок действия
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    elevationCache.delete(key);
    return null;
  }
  
  return cached.data;
}

/**
 * Сохранение данных в кэш
 * @param {string} key - Ключ кэша
 * @param {Object} data - Данные для кэширования
 */
function saveToCache(key, data) {
  elevationCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Задержка выполнения
 * @param {number} ms - Миллисекунды
 * @returns {Promise}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Запрос данных о высотах с retry-логикой
 * @param {Array} locations - Массив координат [{latitude, longitude}, ...]
 * @param {number} attempt - Номер попытки
 * @returns {Promise<Array>} Массив результатов [{latitude, longitude, elevation}, ...]
 */
async function fetchElevationWithRetry(locations, attempt = 1) {
  try {
    logger.debug('Запрос к Elevation API', {
      module: 'ElevationService',
      locationsCount: locations.length,
      attempt
    });
    
    const response = await axios.post(ELEVATION_API_URL, {
      locations
    }, {
      timeout: 30000, // 30 секунд таймаут
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.results) {
      logger.debug('Успешный ответ от Elevation API', {
        module: 'ElevationService',
        resultsCount: response.data.results.length
      });
      return response.data.results;
    }
    
    throw new Error('Неверный формат ответа от Elevation API');
    
  } catch (error) {
    logger.warn('Ошибка при запросе к Elevation API', {
      module: 'ElevationService',
      attempt,
      error: error.message,
      locationsCount: locations.length
    });
    
    // Retry логика
    if (attempt < REQUEST_RETRY_COUNT) {
      await delay(REQUEST_RETRY_DELAY * attempt);
      return fetchElevationWithRetry(locations, attempt + 1);
    }
    
    throw new Error(`Не удалось получить данные о высотах после ${REQUEST_RETRY_COUNT} попыток: ${error.message}`);
  }
}

/**
 * Получение данных о высотах для массива координат с батчингом
 * @param {Array} coordinates - Массив координат [[lng, lat], ...]
 * @returns {Promise<Array>} Массив результатов [{lat, lng, elevation}, ...]
 */
async function fetchElevationData(coordinates) {
  const startTime = Date.now();
  logger.info('Начало получения данных о высотах', {
    module: 'ElevationService',
    totalPoints: coordinates.length
  });
  
  const results = [];
  const uncachedCoordinates = [];
  const uncachedIndices = [];
  
  // Проверяем кэш
  coordinates.forEach((coord, index) => {
    const [lng, lat] = coord;
    const cacheKey = getCacheKey(lat, lng);
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      results[index] = cached;
    } else {
      uncachedCoordinates.push(coord);
      uncachedIndices.push(index);
    }
  });
  
  logger.debug('Результаты проверки кэша', {
    module: 'ElevationService',
    totalPoints: coordinates.length,
    cachedPoints: coordinates.length - uncachedCoordinates.length,
    uncachedPoints: uncachedCoordinates.length
  });
  
  // Если все данные в кэше
  if (uncachedCoordinates.length === 0) {
    logger.info('Все данные получены из кэша', {
      module: 'ElevationService',
      duration: `${Date.now() - startTime}ms`
    });
    return results;
  }
  
  // Разбиваем на батчи
  const batches = [];
  for (let i = 0; i < uncachedCoordinates.length; i += MAX_LOCATIONS_PER_REQUEST) {
    batches.push(uncachedCoordinates.slice(i, i + MAX_LOCATIONS_PER_REQUEST));
  }
  
  logger.info('Запрос данных с сервера', {
    module: 'ElevationService',
    batchesCount: batches.length,
    pointsToFetch: uncachedCoordinates.length
  });
  
  // Выполняем запросы батчами последовательно (чтобы не перегружать API)
  let fetchedResults = [];
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const locations = batch.map(coord => ({
      latitude: coord[1],
      longitude: coord[0]
    }));
    
    logger.debug(`Обработка батча ${i + 1}/${batches.length}`, {
      module: 'ElevationService',
      batchSize: locations.length
    });
    
    const batchResults = await fetchElevationWithRetry(locations);
    fetchedResults = fetchedResults.concat(batchResults);
    
    // Небольшая задержка между батчами для избежания rate limiting
    if (i < batches.length - 1) {
      await delay(200);
    }
  }
  
  // Сохраняем результаты в кэш и в итоговый массив
  fetchedResults.forEach((result, i) => {
    const { latitude, longitude, elevation } = result;
    const cacheKey = getCacheKey(latitude, longitude);
    const data = { lat: latitude, lng: longitude, elevation };
    
    saveToCache(cacheKey, data);
    results[uncachedIndices[i]] = data;
  });
  
  const duration = Date.now() - startTime;
  logger.info('Данные о высотах успешно получены', {
    module: 'ElevationService',
    totalPoints: coordinates.length,
    duration: `${duration}ms`,
    cacheHitRate: `${((coordinates.length - uncachedCoordinates.length) / coordinates.length * 100).toFixed(1)}%`
  });
  
  return results;
}

/**
 * Генерация сетки точек для bounding box
 * @param {Array} bbox - Bounding box [minLng, minLat, maxLng, maxLat]
 * @param {number} gridDensity - Плотность сетки (точек на градус)
 * @returns {Array} Массив координат [[lng, lat], ...]
 */
function generateGridPoints(bbox, gridDensity = 20) {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const points = [];
  
  const lngStep = (maxLng - minLng) / gridDensity;
  const latStep = (maxLat - minLat) / gridDensity;
  
  for (let lat = minLat; lat <= maxLat; lat += latStep) {
    for (let lng = minLng; lng <= maxLng; lng += lngStep) {
      points.push([lng, lat]);
    }
  }
  
  logger.debug('Сгенерирована сетка точек для bbox', {
    module: 'ElevationService',
    bbox,
    gridDensity,
    totalPoints: points.length
  });
  
  return points;
}

/**
 * Получение высот для всей территории (bounding box)
 * @param {Array} bbox - Bounding box [minLng, minLat, maxLng, maxLat]
 * @param {number} gridDensity - Плотность сетки
 * @returns {Promise<Array>} Массив данных о высотах [{lat, lng, elevation}, ...]
 */
async function getElevationForBoundingBox(bbox, gridDensity = 20) {
  logger.info('Получение высот для bounding box', {
    module: 'ElevationService',
    bbox,
    gridDensity
  });
  
  const gridPoints = generateGridPoints(bbox, gridDensity);
  
  // Ограничение количества точек
  const MAX_GRID_POINTS = 5000;
  if (gridPoints.length > MAX_GRID_POINTS) {
    logger.warn('Превышен лимит точек сетки, уменьшаем плотность', {
      module: 'ElevationService',
      requestedPoints: gridPoints.length,
      maxPoints: MAX_GRID_POINTS
    });
    
    // Рассчитываем новую плотность на основе соотношения точек
    // newDensity должна быть меньше текущей, чтобы избежать бесконечной рекурсии
    const scaleFactor = Math.sqrt(MAX_GRID_POINTS / gridPoints.length);
    const newDensity = Math.max(Math.floor(gridDensity * scaleFactor), 5);
    
    // Проверяем, что новая плотность действительно меньше
    if (newDensity >= gridDensity) {
      // Если расчет не уменьшил плотность, принудительно уменьшаем вдвое
      const forcedDensity = Math.max(Math.floor(gridDensity / 2), 5);
      logger.warn('Принудительное уменьшение плотности', {
        module: 'ElevationService',
        originalDensity: gridDensity,
        forcedDensity
      });
      return getElevationForBoundingBox(bbox, forcedDensity);
    }
    
    return getElevationForBoundingBox(bbox, newDensity);
  }
  
  return await fetchElevationData(gridPoints);
}

/**
 * Получение высот вдоль маршрута
 * @param {Array} routeCoordinates - Координаты маршрута [[lng, lat], ...]
 * @param {number} samplingInterval - Интервал выборки точек (каждая N-я точка)
 * @returns {Promise<Array>} Массив данных о высотах [{lat, lng, elevation}, ...]
 */
async function getElevationAlongRoute(routeCoordinates, samplingInterval = 1) {
  logger.info('Получение высот вдоль маршрута', {
    module: 'ElevationService',
    totalPoints: routeCoordinates.length,
    samplingInterval
  });
  
  // Выборка точек для уменьшения количества запросов
  const sampledCoordinates = routeCoordinates.filter((_, index) => index % samplingInterval === 0);
  
  // Всегда включаем последнюю точку
  if (routeCoordinates.length > 0 && (routeCoordinates.length - 1) % samplingInterval !== 0) {
    sampledCoordinates.push(routeCoordinates[routeCoordinates.length - 1]);
  }
  
  logger.debug('Выборка точек маршрута', {
    module: 'ElevationService',
    originalPoints: routeCoordinates.length,
    sampledPoints: sampledCoordinates.length
  });
  
  return await fetchElevationData(sampledCoordinates);
}

/**
 * Очистка кэша (для тестирования и обслуживания)
 */
function clearCache() {
  const size = elevationCache.size;
  elevationCache.clear();
  logger.info('Кэш очищен', {
    module: 'ElevationService',
    clearedEntries: size
  });
}

/**
 * Получение статистики кэша
 * @returns {Object} Статистика кэша
 */
function getCacheStats() {
  return {
    size: elevationCache.size,
    ttl: CACHE_TTL
  };
}

module.exports = {
  fetchElevationData,
  getElevationForBoundingBox,
  getElevationAlongRoute,
  clearCache,
  getCacheStats
};

