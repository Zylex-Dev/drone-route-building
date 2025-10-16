/**
 * Конфигурация камер и дронов
 * Содержит технические характеристики популярных моделей дронов,
 * используемых для аэрофотосъемки и картографирования территорий
 */

const DRONE_MODELS = {
  'DJI Matrice 30T': {
    name: 'DJI Matrice 30T',
    description: 'Профессиональный дрон для промышленной съемки с широкоугольной камерой',
    camera: {
      focalLength: 4.5,        // мм - фокусное расстояние
      sensorWidth: 7.6,        // мм - ширина матрицы
      sensorHeight: 5.7,       // мм - высота матрицы
      imageWidth: 8000,        // пикселей - разрешение по горизонтали
      imageHeight: 6000,       // пикселей - разрешение по вертикали
      megapixels: 48           // МП
    },
    specs: {
      maxFlightTime: 41,       // минут
      cruiseSpeed: 23,         // м/с
      maxSpeed: 23,            // м/с
      maxDistance: 32000,      // метров
      weight: 3770             // грамм (с батареей)
    }
  },

  'DJI Mavic 3': {
    name: 'DJI Mavic 3',
    description: 'Профессиональный дрон с камерой Hasselblad и 4/3 CMOS-матрицей',
    camera: {
      focalLength: 24,         // мм (эквивалентное фокусное расстояние)
      sensorWidth: 17.3,       // мм - 4/3" CMOS матрица
      sensorHeight: 13.0,      // мм
      imageWidth: 5280,        // пикселей
      imageHeight: 3956,       // пикселей
      megapixels: 20           // МП
    },
    specs: {
      maxFlightTime: 46,       // минут
      cruiseSpeed: 15,         // м/с
      maxSpeed: 21,            // м/с (режим Sport)
      maxDistance: 30000,      // метров
      weight: 895              // грамм
    }
  },

  'DJI Phantom 4 Pro': {
    name: 'DJI Phantom 4 Pro',
    description: 'Популярный дрон для фотограмметрии с 1-дюймовой матрицей',
    camera: {
      focalLength: 8.8,        // мм
      sensorWidth: 13.2,       // мм - 1" CMOS матрица
      sensorHeight: 8.8,       // мм
      imageWidth: 5472,        // пикселей
      imageHeight: 3648,       // пикселей
      megapixels: 20           // МП
    },
    specs: {
      maxFlightTime: 30,       // минут
      cruiseSpeed: 16,         // м/с
      maxSpeed: 20,            // м/с (режим Sport)
      maxDistance: 7000,       // метров
      weight: 1388             // грамм
    }
  },

  'DJI Air 2S': {
    name: 'DJI Air 2S',
    description: 'Компактный дрон с 1-дюймовой матрицей для профессиональной съемки',
    camera: {
      focalLength: 22,         // мм (эквивалентное 35мм)
      sensorWidth: 13.2,       // мм - 1" CMOS матрица
      sensorHeight: 8.8,       // мм
      imageWidth: 5472,        // пикселей
      imageHeight: 3648,       // пикселей
      megapixels: 20           // МП
    },
    specs: {
      maxFlightTime: 31,       // минут
      cruiseSpeed: 15,         // м/с
      maxSpeed: 19,            // м/с (режим Sport)
      maxDistance: 12000,      // метров
      weight: 595              // грамм
    }
  },

  'DJI Mini 3 Pro': {
    name: 'DJI Mini 3 Pro',
    description: 'Легкий компактный дрон для любительской и профессиональной съемки',
    camera: {
      focalLength: 6.7,        // мм
      sensorWidth: 9.7,        // мм - 1/1.3" CMOS матрица
      sensorHeight: 7.3,       // мм
      imageWidth: 4000,        // пикселей
      imageHeight: 3000,       // пикселей
      megapixels: 48           // МП
    },
    specs: {
      maxFlightTime: 34,       // минут (с интеллектуальной батареей Plus)
      cruiseSpeed: 10,         // м/с
      maxSpeed: 16,            // м/с (режим Sport)
      maxDistance: 10000,      // метров
      weight: 249              // грамм
    }
  },

  'Autel EVO Lite+': {
    name: 'Autel EVO Lite+',
    description: 'Профессиональный дрон с 1-дюймовой матрицей и съемкой в 6K',
    camera: {
      focalLength: 20,         // мм (эквивалентное)
      sensorWidth: 13.2,       // мм - 1" CMOS матрица
      sensorHeight: 8.8,       // мм
      imageWidth: 8000,        // пикселей
      imageHeight: 6000,       // пикселей
      megapixels: 50           // МП
    },
    specs: {
      maxFlightTime: 40,       // минут
      cruiseSpeed: 12,         // м/с
      maxSpeed: 18,            // м/с
      maxDistance: 12000,      // метров
      weight: 835              // грамм
    }
  }
};

/**
 * Получить конфигурацию дрона по названию модели
 * @param {string} modelName - Название модели дрона
 * @returns {Object|null} Конфигурация дрона или null, если модель не найдена
 */
function getDroneConfig(modelName) {
  return DRONE_MODELS[modelName] || null;
}

/**
 * Получить список всех доступных моделей дронов
 * @returns {Array<string>} Массив названий моделей
 */
function getAvailableModels() {
  return Object.keys(DRONE_MODELS);
}

/**
 * Проверить, существует ли модель дрона
 * @param {string} modelName - Название модели дрона
 * @returns {boolean} true, если модель существует
 */
function isValidModel(modelName) {
  return DRONE_MODELS.hasOwnProperty(modelName);
}

module.exports = {
  DRONE_MODELS,
  getDroneConfig,
  getAvailableModels,
  isValidModel
};

