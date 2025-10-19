/**
 * Модуль профессионального логирования на основе Winston
 * Поддерживает 5 уровней логирования: error, warn, info, debug, trace
 * Логи сохраняются в файлы с ротацией и выводятся в консоль
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Директория для хранения логов
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../logs');

// Создаём директорию для логов, если её нет
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Определение уровней логирования
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
};

// Цвета для консольного вывода
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
  trace: 'magenta'
};

winston.addColors(colors);

// Формат для консольного вывода (human-readable с цветами)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, module, requestId, ...meta }) => {
    let log = `[${timestamp}] ${level}`;
    
    if (module) log += ` [${module}]`;
    if (requestId) log += ` [ReqID: ${requestId}]`;
    
    log += `: ${message}`;
    
    // Добавляем метаданные, если есть
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Формат для файлового вывода (JSON для машинной обработки)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Базовая конфигурация транспортов
const getTransports = (filename, level = 'info') => {
  return new DailyRotateFile({
    filename: path.join(LOG_DIR, `${filename}-%DATE%.log`),
    datePattern: 'YYYY-MM-DD',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    level: level,
    format: fileFormat
  });
};

// ============================================================================
// Главный логгер приложения
// ============================================================================
const appLogger = winston.createLogger({
  levels: levels,
  level: process.env.LOG_LEVEL || 'debug',
  transports: [
    // Консоль (для разработки)
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'debug'
    }),
    // Все логи в combined.log
    getTransports('combined', 'trace'),
    // Только ошибки в error.log
    getTransports('error', 'error')
  ],
  exitOnError: false
});

// ============================================================================
// HTTP логгер (для запросов и ответов)
// ============================================================================
const httpLogger = winston.createLogger({
  levels: levels,
  level: 'debug',
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
      level: 'info'
    }),
    getTransports('requests', 'debug')
  ],
  exitOnError: false
});

// ============================================================================
// Логгер расчётов (для детальных математических операций)
// ============================================================================
const calculationLogger = winston.createLogger({
  levels: levels,
  level: 'trace',
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    }),
    getTransports('calculations', 'trace')
  ],
  exitOnError: false
});

// ============================================================================
// Логгер клиентских логов (от frontend)
// ============================================================================
const clientLogger = winston.createLogger({
  levels: levels,
  level: 'trace',
  transports: [
    getTransports('client', 'trace')
  ],
  exitOnError: false
});

// ============================================================================
// Вспомогательные функции для удобного логирования
// ============================================================================

/**
 * Создаёт дочерний логгер с указанием модуля
 * @param {string} moduleName - Название модуля
 * @param {Object} logger - Родительский логгер (по умолчанию appLogger)
 * @returns {Object} Логгер с привязкой к модулю
 */
function createModuleLogger(moduleName, logger = appLogger) {
  return {
    error: (message, meta = {}) => logger.error(message, { module: moduleName, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { module: moduleName, ...meta }),
    info: (message, meta = {}) => logger.info(message, { module: moduleName, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { module: moduleName, ...meta }),
    trace: (message, meta = {}) => logger.trace(message, { module: moduleName, ...meta })
  };
}

/**
 * Логирование времени выполнения операции
 * @param {string} operationName - Название операции
 * @param {Function} operation - Функция для выполнения
 * @param {Object} logger - Логгер (по умолчанию appLogger)
 * @returns {Promise} Результат операции
 */
async function logExecutionTime(operationName, operation, logger = appLogger) {
  const startTime = Date.now();
  logger.debug(`Начало операции: ${operationName}`);
  
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    logger.info(`Операция завершена: ${operationName}`, { duration: `${duration}ms` });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Ошибка в операции: ${operationName}`, { 
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// ============================================================================
// Экспорт логгеров
// ============================================================================
module.exports = {
  // Основные логгеры
  app: appLogger,
  http: httpLogger,
  calculation: calculationLogger,
  client: clientLogger,
  
  // Вспомогательные функции
  createModuleLogger,
  logExecutionTime,
  
  // Уровни для reference
  levels
};

