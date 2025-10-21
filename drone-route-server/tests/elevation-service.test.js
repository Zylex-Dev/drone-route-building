/**
 * Unit-тесты для elevation-service
 * Для запуска: npm install --save-dev jest && npm test
 */

const elevationService = require('../services/elevation-service');

describe('Elevation Service', () => {
  
  beforeEach(() => {
    // Очищаем кэш перед каждым тестом
    elevationService.clearCache();
  });

  describe('fetchElevationData', () => {
    test('должен успешно получить данные о высотах для массива координат', async () => {
      const coordinates = [
        [6.17081, 46.24566],  // lng, lat (Женева)
        [6.78134, 46.85499]
      ];

      const result = await elevationService.fetchElevationData(coordinates);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('lat');
      expect(result[0]).toHaveProperty('lng');
      expect(result[0]).toHaveProperty('elevation');
      expect(typeof result[0].elevation).toBe('number');
    }, 30000); // Увеличенный таймаут для сетевого запроса

    test('должен использовать кэш для повторных запросов', async () => {
      const coordinates = [[6.17081, 46.24566]];
      
      // Первый запрос
      const startTime1 = Date.now();
      const result1 = await elevationService.fetchElevationData(coordinates);
      const duration1 = Date.now() - startTime1;
      
      // Второй запрос (должен быть из кэша)
      const startTime2 = Date.now();
      const result2 = await elevationService.fetchElevationData(coordinates);
      const duration2 = Date.now() - startTime2;
      
      expect(result1).toEqual(result2);
      expect(duration2).toBeLessThan(duration1); // Кэш должен быть быстрее
    }, 30000);

    test('должен обрабатывать большое количество координат с батчингом', async () => {
      // Генерируем 250 координат (больше чем MAX_LOCATIONS_PER_REQUEST = 100)
      const coordinates = [];
      for (let i = 0; i < 250; i++) {
        coordinates.push([
          6.17081 + (i * 0.001),
          46.24566 + (i * 0.001)
        ]);
      }

      const result = await elevationService.fetchElevationData(coordinates);
      
      expect(result).toBeDefined();
      expect(result.length).toBe(250);
    }, 60000); // Увеличенный таймаут для больших запросов
  });

  describe('getElevationForBoundingBox', () => {
    test('должен генерировать сетку точек для bbox', async () => {
      const bbox = [6.17081, 46.24566, 6.18081, 46.25566]; // Маленький bbox
      const gridDensity = 10;

      const result = await elevationService.getElevationForBoundingBox(bbox, gridDensity);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Проверяем, что все точки имеют корректную структуру
      result.forEach(point => {
        expect(point).toHaveProperty('lat');
        expect(point).toHaveProperty('lng');
        expect(point).toHaveProperty('elevation');
        expect(typeof point.elevation).toBe('number');
      });
    }, 60000);

    test('должен автоматически уменьшать плотность для больших территорий', async () => {
      const largeBbox = [6.0, 46.0, 7.0, 47.0]; // Большой bbox
      const gridDensity = 100; // Слишком большая плотность

      const result = await elevationService.getElevationForBoundingBox(largeBbox, gridDensity);
      
      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(5000); // MAX_GRID_POINTS
    }, 60000);
  });

  describe('getElevationAlongRoute', () => {
    test('должен получить высоты вдоль маршрута с выборкой', async () => {
      const routeCoordinates = [
        [6.17081, 46.24566],
        [6.17181, 46.24666],
        [6.17281, 46.24766],
        [6.17381, 46.24866],
        [6.17481, 46.24966]
      ];
      const samplingInterval = 2; // Каждая вторая точка

      const result = await elevationService.getElevationAlongRoute(routeCoordinates, samplingInterval);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Должно быть: точки 0, 2, 4 + последняя точка если она не вошла
      expect(result.length).toBeGreaterThanOrEqual(3);
    }, 30000);

    test('должен всегда включать последнюю точку маршрута', async () => {
      const routeCoordinates = [
        [6.17081, 46.24566],
        [6.17181, 46.24666],
        [6.17281, 46.24766]
      ];
      const samplingInterval = 2;

      const result = await elevationService.getElevationAlongRoute(routeCoordinates, samplingInterval);
      
      const lastResult = result[result.length - 1];
      const lastCoord = routeCoordinates[routeCoordinates.length - 1];
      
      expect(lastResult.lng).toBeCloseTo(lastCoord[0], 5);
      expect(lastResult.lat).toBeCloseTo(lastCoord[1], 5);
    }, 30000);
  });

  describe('Cache management', () => {
    test('должен корректно очищать кэш', async () => {
      const coordinates = [[6.17081, 46.24566]];
      
      // Заполняем кэш
      await elevationService.fetchElevationData(coordinates);
      
      let stats = elevationService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      
      // Очищаем кэш
      elevationService.clearCache();
      
      stats = elevationService.getCacheStats();
      expect(stats.size).toBe(0);
    }, 30000);

    test('должен возвращать статистику кэша', () => {
      const stats = elevationService.getCacheStats();
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('ttl');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.ttl).toBe('number');
    });
  });

  describe('Error handling', () => {
    test('должен обрабатывать пустой массив координат', async () => {
      const coordinates = [];
      
      const result = await elevationService.fetchElevationData(coordinates);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    test('должен обрабатывать некорректные координаты gracefully', async () => {
      const coordinates = [
        [null, null],
        [undefined, undefined]
      ];
      
      // Тест должен либо пропустить некорректные координаты, либо выбросить понятную ошибку
      await expect(
        elevationService.fetchElevationData(coordinates)
      ).rejects.toThrow();
    });
  });
});

/**
 * Интеграционные тесты
 * Проверка работы с реальным API
 */
describe('Elevation Service - Integration Tests', () => {
  
  test('должен работать с реальным Elevation API', async () => {
    const coordinates = [
      [6.17081, 46.24566]  // Женева
    ];

    const result = await elevationService.fetchElevationData(coordinates);
    
    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].elevation).toBeGreaterThan(0);
    expect(result[0].elevation).toBeLessThan(5000); // Разумная высота
  }, 30000);

  test('должен корректно обрабатывать горную местность', async () => {
    const coordinates = [
      [7.7, 46.0],    // Альпы - низкая точка
      [7.75, 46.05]   // Альпы - высокая точка
    ];

    const result = await elevationService.fetchElevationData(coordinates);
    
    expect(result).toBeDefined();
    expect(result.length).toBe(2);
    
    // Проверяем, что есть перепад высот
    const elevations = result.map(p => p.elevation);
    const min = Math.min(...elevations);
    const max = Math.max(...elevations);
    
    expect(max - min).toBeGreaterThan(0);
  }, 30000);
});

