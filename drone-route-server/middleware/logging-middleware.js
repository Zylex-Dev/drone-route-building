/**
 * Middleware для логирования HTTP запросов и ответов
 * Генерирует уникальный ID для каждого запроса и логирует детали
 */

const { http: logger } = require('../utils/logger');
const { v4: uuidv4 } = require('crypto');

/**
 * Генерирует уникальный ID запроса
 */
function generateRequestId() {
  // Используем timestamp + случайную строку для уникальности
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Middleware для логирования входящих запросов
 */
function requestLogger(req, res, next) {
  // Генерируем уникальный ID для запроса
  req.requestId = generateRequestId();
  req.startTime = Date.now();
  
  // Логируем входящий запрос
  logger.info('Входящий запрос', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    contentLength: req.get('content-length'),
    referer: req.get('referer')
  });
  
  // Логируем тело запроса (только для POST/PUT/PATCH)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    // Для больших объектов логируем только ключи
    const bodyToLog = JSON.stringify(req.body).length > 1000 
      ? { keys: Object.keys(req.body), size: JSON.stringify(req.body).length }
      : req.body;
    
    logger.debug('Тело запроса', {
      requestId: req.requestId,
      body: bodyToLog
    });
  }
  
  // Перехватываем метод res.json для логирования ответа
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    res.body = body;
    return originalJson(body);
  };
  
  // Перехватываем завершение ответа
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    
    const logData = {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length')
    };
    
    // Логируем размер ответа, если есть
    if (res.body) {
      const responseSize = JSON.stringify(res.body).length;
      logData.responseSize = `${responseSize} bytes`;
    }
    
    logger[logLevel]('Ответ отправлен', logData);
  });
  
  next();
}

/**
 * Middleware для обработки ошибок с логированием
 */
function errorLogger(err, req, res, next) {
  logger.error('Ошибка обработки запроса', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500
  });
  
  // Передаём ошибку дальше
  next(err);
}

/**
 * Middleware для логирования необработанных ошибок
 */
function unhandledErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  
  logger.error('Необработанная ошибка', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack
  });
  
  // Отправляем ответ клиенту
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Внутренняя ошибка сервера' 
      : err.message,
    requestId: req.requestId
  });
}

module.exports = {
  requestLogger,
  errorLogger,
  unhandledErrorHandler
};

