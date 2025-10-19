/**
 * Export Manager Module
 * Управление экспортом маршрутов полета в различные форматы
 * Поддерживаемые форматы: GeoJSON, KML, KMZ
 */

// ============================================================================
// Глобальные переменные
// ============================================================================

let currentRoute = null; // Хранение текущего построенного маршрута

// ============================================================================
// Управление состоянием маршрута
// ============================================================================

/**
 * Сохраняет текущий маршрут и активирует кнопки экспорта
 * @param {Object} routeData - Данные маршрута в формате GeoJSON
 */
function setCurrentRoute(routeData) {
  currentRoute = routeData;
  enableExportButtons();
  logger.info('Маршрут сохранён для экспорта', {
    module: 'ExportManager',
    context: {
      coordinatesCount: routeData.geometry?.coordinates?.length,
      properties: Object.keys(routeData.properties || {})
    }
  });
}

/**
 * Очищает текущий маршрут и деактивирует кнопки экспорта
 */
function clearCurrentRoute() {
  currentRoute = null;
  disableExportButtons();
  logger.debug('Маршрут очищен', { module: 'ExportManager' });
}

/**
 * Возвращает текущий маршрут
 * @returns {Object|null} - Данные маршрута или null
 */
function getCurrentRoute() {
  return currentRoute;
}

// ============================================================================
// Управление UI кнопками экспорта
// ============================================================================

/**
 * Активирует кнопки экспорта
 */
function enableExportButtons() {
  const exportButtons = [
    'exportGeoJSON',
    'exportKML',
    'exportKMZ'
  ];
  
  exportButtons.forEach(buttonId => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = false;
      button.classList.remove('disabled');
    }
  });
}

/**
 * Деактивирует кнопки экспорта
 */
function disableExportButtons() {
  const exportButtons = [
    'exportGeoJSON',
    'exportKML',
    'exportKMZ'
  ];
  
  exportButtons.forEach(buttonId => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = true;
      button.classList.add('disabled');
    }
  });
}

// ============================================================================
// Утилиты
// ============================================================================

/**
 * Универсальная функция для скачивания файлов
 * @param {string|Blob} content - Содержимое файла (строка или Blob)
 * @param {string} filename - Имя файла для скачивания
 * @param {string} mimeType - MIME-тип файла
 */
function downloadFile(content, filename, mimeType) {
  try {
    let blob;
    
    // Если content уже Blob, используем его напрямую
    if (content instanceof Blob) {
      blob = content;
    } else {
      // Иначе создаём Blob из строки
      blob = new Blob([content], { type: mimeType });
    }
    
    // Создаём временную ссылку для скачивания
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;
    
    // Добавляем в DOM, кликаем и удаляем
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Освобождаем память
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    logger.info('Файл успешно экспортирован', {
      module: 'ExportManager',
      context: { filename, size: `${blob.size} bytes`, mimeType }
    });
    showExportNotification(`Файл ${filename} успешно экспортирован`, 'success');
  } catch (error) {
    logger.error('Ошибка при скачивании файла', {
      module: 'ExportManager',
      context: { filename, mimeType },
      error: { message: error.message, stack: error.stack }
    });
    showExportNotification('Ошибка при экспорте файла', 'error');
  }
}

/**
 * Генерирует имя файла с временной меткой
 * @param {string} baseName - Базовое имя (например, 'mission')
 * @param {string} extension - Расширение файла (например, 'geojson')
 * @param {Object} routeData - Данные маршрута для извлечения информации
 * @returns {string} - Сгенерированное имя файла
 */
function generateFilename(baseName, extension, routeData) {
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
  const droneModel = routeData?.properties?.droneModel || 'drone';
  const sanitizedModel = droneModel.replace(/\s+/g, '_');
  
  return `${baseName}_${sanitizedModel}_${timestamp}.${extension}`;
}

/**
 * Показывает уведомление пользователю
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип сообщения ('success', 'error', 'info')
 */
function showExportNotification(message, type = 'info') {
  // Логируем уведомление
  if (type === 'success') {
    logger.info(message, { module: 'ExportManager' });
  } else if (type === 'error') {
    logger.error(message, { module: 'ExportManager' });
  } else {
    logger.info(message, { module: 'ExportManager' });
  }
  
  // TODO: Добавить визуальное уведомление (toast/alert) в будущем
}

// ============================================================================
// Экспорт в GeoJSON
// ============================================================================

/**
 * Экспортирует маршрут в формат GeoJSON
 * @param {Object} routeData - Данные маршрута в формате GeoJSON
 * @param {string} filename - Имя файла (опционально)
 */
function exportToGeoJSON(routeData = currentRoute, filename = null) {
  logger.info('Начало экспорта GeoJSON', { module: 'ExportManager' });
  
  if (!routeData) {
    logger.error('Нет данных маршрута для экспорта GeoJSON', { module: 'ExportManager' });
    showExportNotification('Нет данных маршрута для экспорта', 'error');
    return;
  }
  
  try {
    // Генерируем имя файла, если не указано
    if (!filename) {
      filename = generateFilename('mission', 'geojson', routeData);
    }
    
    // Конвертируем объект в JSON с форматированием
    const geoJSONString = JSON.stringify(routeData, null, 2);
    
    // Скачиваем файл
    downloadFile(geoJSONString, filename, 'application/geo+json');
    
    logger.info('GeoJSON успешно экспортирован', {
      module: 'ExportManager',
      context: {
        filename,
        size: `${(geoJSONString.length / 1024).toFixed(2)} KB`,
        waypoints: routeData.geometry.coordinates.length
      }
    });
  } catch (error) {
    logger.error('Ошибка при экспорте GeoJSON', {
      module: 'ExportManager',
      context: { filename },
      error: { message: error.message, stack: error.stack }
    });
    showExportNotification('Ошибка при экспорте GeoJSON', 'error');
  }
}

// ============================================================================
// Экспорт в KML
// ============================================================================

/**
 * Генерирует XML-содержимое KML файла
 * @param {Object} routeData - Данные маршрута
 * @returns {string} - XML-строка KML
 */
function generateKML(routeData) {
  const props = routeData.properties;
  const coords = routeData.geometry.coordinates;
  const stats = props.missionStats || {};
  
  // Формируем описание миссии
  const description = `
Модель дрона: ${props.droneModel || 'Не указана'}
Тип съёмки: ${props.shootingType || 'Панорамная съёмка'}
Высота полёта: ${props.flightAltitude || 'N/A'} м
Боковое перекрытие: ${props.desiredOverlap || 'N/A'}%
Продольное перекрытие: ${props.forwardOverlap || 'N/A'}%

📊 Статистика миссии:
• Площадь покрытия: ${stats.coverageAreaKm2 || 'N/A'} км²
• Длина маршрута: ${stats.totalFlightDistanceKm || 'N/A'} км
• Расчётное время: ${stats.estimatedFlightTimeMin || 'N/A'} мин
• Количество снимков: ${stats.estimatedPhotos || 'N/A'}
• Требуемая память: ${stats.estimatedStorageGB || 'N/A'} ГБ
• Использование батареи: ${stats.batteryUsagePercent || 'N/A'}%
• GSD (детализация): ${stats.gsdCmPerPixel || 'N/A'} см/пиксель

🎯 Параметры покрытия:
• Размер кадра: ${props.groundWidth || 'N/A'}м × ${props.groundLength || 'N/A'}м
• Шаг между полосами: ${props.effectiveSpacingMeters || 'N/A'} м
• Шаг между снимками: ${props.forwardSpacingMeters || 'N/A'} м
• Количество полос: ${props.numberOfLines || 'N/A'}
• Всего точек: ${props.totalWaypoints || coords.length}
  `.trim();
  
  // Формируем координаты для LineString (lng,lat,altitude)
  const flightAltitude = props.flightAltitude || 50;
  const coordinatesString = coords
    .map(coord => `${coord[0]},${coord[1]},${flightAltitude}`)
    .join('\n          ');
  
  // Создаём KML структуру
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Drone Mission - ${props.droneModel || 'Маршрут полёта'}</name>
    <description>${escapeXML(description)}</description>
    
    <!-- Стили -->
    <Style id="routeStyle">
      <LineStyle>
        <color>ff00ff00</color>
        <width>3</width>
      </LineStyle>
    </Style>
    
    <Style id="startPointStyle">
      <IconStyle>
        <color>ff00ff00</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/grn-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <Style id="endPointStyle">
      <IconStyle>
        <color>ff0000ff</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <Style id="waypointStyle">
      <IconStyle>
        <color>ffffff00</color>
        <scale>0.5</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <!-- Маршрут полёта -->
    <Placemark>
      <name>Маршрут полёта</name>
      <description>Полный маршрут с ${coords.length} точками</description>
      <styleUrl>#routeStyle</styleUrl>
      <LineString>
        <extrude>1</extrude>
        <tessellate>1</tessellate>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>
          ${coordinatesString}
        </coordinates>
      </LineString>
    </Placemark>
    
    <!-- Стартовая точка -->
    <Placemark>
      <name>Старт</name>
      <description>Начальная точка маршрута</description>
      <styleUrl>#startPointStyle</styleUrl>
      <Point>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${coords[0][0]},${coords[0][1]},${flightAltitude}</coordinates>
      </Point>
    </Placemark>
    
    <!-- Конечная точка -->
    <Placemark>
      <name>Финиш</name>
      <description>Конечная точка маршрута</description>
      <styleUrl>#endPointStyle</styleUrl>
      <Point>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>${coords[coords.length - 1][0]},${coords[coords.length - 1][1]},${flightAltitude}</coordinates>
      </Point>
    </Placemark>
    
  </Document>
</kml>`;
  
  return kml;
}

/**
 * Экранирует специальные символы XML
 * @param {string} text - Исходный текст
 * @returns {string} - Экранированный текст
 */
function escapeXML(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Экспортирует маршрут в формат KML
 * @param {Object} routeData - Данные маршрута
 * @param {string} filename - Имя файла (опционально)
 */
function exportToKML(routeData = currentRoute, filename = null) {
  logger.info('Начало экспорта KML', { module: 'ExportManager' });
  
  if (!routeData) {
    logger.error('Нет данных маршрута для экспорта KML', { module: 'ExportManager' });
    showExportNotification('Нет данных маршрута для экспорта', 'error');
    return;
  }
  
  try {
    // Генерируем имя файла, если не указано
    if (!filename) {
      filename = generateFilename('mission', 'kml', routeData);
    }
    
    // Генерируем KML содержимое
    const kmlContent = generateKML(routeData);
    
    // Скачиваем файл
    downloadFile(kmlContent, filename, 'application/vnd.google-earth.kml+xml');
    
    logger.info('KML успешно экспортирован', {
      module: 'ExportManager',
      context: {
        filename,
        size: `${(kmlContent.length / 1024).toFixed(2)} KB`,
        waypoints: routeData.geometry.coordinates.length
      }
    });
  } catch (error) {
    logger.error('Ошибка при экспорте KML', {
      module: 'ExportManager',
      context: { filename },
      error: { message: error.message, stack: error.stack }
    });
    showExportNotification('Ошибка при экспорте KML', 'error');
  }
}

// ============================================================================
// Экспорт в KMZ
// ============================================================================

/**
 * Экспортирует маршрут в формат KMZ (compressed KML)
 * @param {Object} routeData - Данные маршрута
 * @param {string} filename - Имя файла (опционально)
 */
async function exportToKMZ(routeData = currentRoute, filename = null) {
  logger.info('Начало экспорта KMZ', { module: 'ExportManager' });
  
  if (!routeData) {
    logger.error('Нет данных маршрута для экспорта KMZ', { module: 'ExportManager' });
    showExportNotification('Нет данных маршрута для экспорта', 'error');
    return;
  }
  
  // Проверяем наличие библиотеки JSZip
  if (typeof JSZip === 'undefined') {
    logger.error('Библиотека JSZip не загружена', { module: 'ExportManager' });
    showExportNotification('Ошибка: библиотека JSZip не загружена', 'error');
    return;
  }
  
  try {
    // Генерируем имя файла, если не указано
    if (!filename) {
      filename = generateFilename('mission', 'kmz', routeData);
    }
    
    // Генерируем KML содержимое
    const kmlContent = generateKML(routeData);
    
    // Создаём ZIP-архив
    const zip = new JSZip();
    zip.file('doc.kml', kmlContent);
    
    // Генерируем blob асинхронно
    const blob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 } // Максимальное сжатие
    });
    
    // Скачиваем файл
    downloadFile(blob, filename, 'application/vnd.google-earth.kmz');
    
    logger.info('KMZ успешно экспортирован', {
      module: 'ExportManager',
      context: {
        filename,
        originalSize: `${(kmlContent.length / 1024).toFixed(2)} KB`,
        compressedSize: `${(blob.size / 1024).toFixed(2)} KB`,
        compression: `${((1 - blob.size / kmlContent.length) * 100).toFixed(1)}%`,
        waypoints: routeData.geometry.coordinates.length
      }
    });
  } catch (error) {
    logger.error('Ошибка при экспорте KMZ', {
      module: 'ExportManager',
      context: { filename },
      error: { message: error.message, stack: error.stack }
    });
    showExportNotification('Ошибка при экспорте KMZ', 'error');
  }
}

// ============================================================================
// Экспорт функций для использования в других модулях
// ============================================================================

// Делаем функции доступными глобально
window.exportManager = {
  // Управление маршрутом
  setCurrentRoute,
  clearCurrentRoute,
  getCurrentRoute,
  
  // Экспорт
  exportToGeoJSON,
  exportToKML,
  exportToKMZ,
  
  // Утилиты
  downloadFile,
  generateFilename
};

logger.info('Export Manager загружен', { module: 'ExportManager' });

