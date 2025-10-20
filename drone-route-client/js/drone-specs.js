/**
 * Спецификации камер дронов для клиентской части
 * Используется для динамического обновления информации в UI
 */

const DRONE_SPECS = {
  'DJI Matrice 30T': {
    focalLength: 4.5,
    sensorWidth: 7.6,
    sensorHeight: 5.7,
    description: 'Профессиональный дрон для промышленной съемки'
  },
  'DJI Mavic 3': {
    focalLength: 24,
    sensorWidth: 17.3,
    sensorHeight: 13.0,
    description: 'Профессиональный дрон с камерой Hasselblad'
  },
  'DJI Phantom 4 Pro': {
    focalLength: 8.8,
    sensorWidth: 13.2,
    sensorHeight: 8.8,
    description: 'Популярный дрон для фотограмметрии'
  },
  'DJI Air 2S': {
    focalLength: 22,
    sensorWidth: 13.2,
    sensorHeight: 8.8,
    description: 'Компактный дрон с 1-дюймовой матрицей'
  },
  'DJI Mini 3 Pro': {
    focalLength: 6.7,
    sensorWidth: 9.7,
    sensorHeight: 7.3,
    description: 'Легкий компактный дрон'
  },
  'Autel EVO Lite+': {
    focalLength: 20,
    sensorWidth: 13.2,
    sensorHeight: 8.8,
    description: 'Профессиональный дрон с съемкой в 6K'
  }
};

/**
 * Получить спецификации дрона
 * @param {string} model - Название модели дрона
 * @returns {Object} Спецификации камеры дрона
 */
function getDroneSpecs(model) {
  return DRONE_SPECS[model] || DRONE_SPECS['DJI Matrice 30T'];
}

/**
 * Обновить информацию о параметрах камеры в UI
 * @param {string} model - Название модели дрона
 */
function updateCameraInfo(model) {
  const specs = getDroneSpecs(model);
  
  // Обновляем только технические параметры, которые зависят от модели
  const focalLengthEl = document.getElementById('focalLength');
  const sensorSizeEl = document.getElementById('sensorSize');
  
  if (focalLengthEl) {
    focalLengthEl.textContent = `${specs.focalLength} мм`;
  }
  
  if (sensorSizeEl) {
    sensorSizeEl.textContent = `${specs.sensorWidth} × ${specs.sensorHeight} мм`;
  }
  
  // Если маршрут уже построен, пересчитываем параметры
  const altitudeElement = document.getElementById('altitudeInfo');
  if (altitudeElement && altitudeElement.textContent !== '-' && altitudeElement.textContent !== '- м') {
    const altitude = Number(document.getElementById('flightAltitude').value);
    if (altitude) {
      updateFlightParameters(specs, altitude);
    }
  }
}

/**
 * Обновить расчетные параметры полета (используется только для предпросмотра до построения маршрута)
 * @param {Object} specs - Спецификации камеры дрона
 * @param {number} altitude - Высота полета в метрах
 */
function updateFlightParameters(specs, altitude) {
  const horizontalFOV = 2 * Math.atan(specs.sensorWidth / (2 * specs.focalLength));
  const groundWidth = 2 * altitude * Math.tan(horizontalFOV / 2);
  
  // Обновляем только базовые параметры, если они существуют в старой версии UI
  const altEl = document.getElementById('altitudeInfo');
  if (altEl) {
    altEl.textContent = `${altitude} м`;
  }
}

