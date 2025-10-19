/**
 * Endpoint для приёма логов от клиентской части приложения
 * Принимает батч-логи, валидирует и сохраняет в отдельный файл
 */

const express = require('express');
const Joi = require('joi');
const { client: clientLogger } = require('../utils/logger');

const router = express.Router();

// Схема валидации для одной записи лога
const logEntrySchema = Joi.object({
  level: Joi.string().valid('error', 'warn', 'info', 'debug', 'trace').required(),
  message: Joi.string().required(),
  timestamp: Joi.string().isoDate().required(),
  module: Joi.string().optional(),
  context: Joi.object().optional(),
  error: Joi.object({
    message: Joi.string(),
    stack: Joi.string(),
    name: Joi.string()
  }).optional()
});

// Схема валидации для батча логов
const clientLogsSchema = Joi.object({
  sessionId: Joi.string().required(),
  userAgent: Joi.string().optional(),
  viewport: Joi.object({
    width: Joi.number(),
    height: Joi.number()
  }).optional(),
  url: Joi.string().optional(),
  logs: Joi.array().items(logEntrySchema).min(1).max(100).required()
});

/**
 * POST /api/logs/client
 * Принимает батч логов от клиента
 */
router.post('/client', (req, res) => {
  const requestId = req.requestId;
  
  // Валидация входных данных
  const { error, value } = clientLogsSchema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true 
  });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message).join('; ');
    clientLogger.warn('Невалидные клиентские логи', {
      requestId,
      errors: errorMessages,
      receivedKeys: Object.keys(req.body)
    });
    
    return res.status(400).json({ 
      success: false, 
      message: 'Ошибка валидации логов', 
      errors: errorMessages 
    });
  }

  const { sessionId, userAgent, viewport, url, logs } = value;
  
  // Обогащаем метаданными с сервера
  const serverMeta = {
    sessionId,
    userAgent: userAgent || req.get('user-agent'),
    clientIp: req.ip || req.connection.remoteAddress,
    receivedAt: new Date().toISOString(),
    requestId
  };
  
  if (viewport) serverMeta.viewport = viewport;
  if (url) serverMeta.clientUrl = url;
  
  // Логируем получение батча
  clientLogger.info(`Получен батч клиентских логов (${logs.length} записей)`, {
    ...serverMeta,
    logsCount: logs.length
  });
  
  // Логируем каждую запись отдельно
  logs.forEach((log, index) => {
    const logMethod = clientLogger[log.level] || clientLogger.info;
    
    const logData = {
      ...serverMeta,
      clientTimestamp: log.timestamp,
      batchIndex: index
    };
    
    if (log.module) logData.module = log.module;
    if (log.context) logData.context = log.context;
    if (log.error) logData.error = log.error;
    
    logMethod(`[CLIENT] ${log.message}`, logData);
  });
  
  // Успешный ответ
  res.json({
    success: true,
    message: 'Логи успешно сохранены',
    logsReceived: logs.length
  });
});

module.exports = router;

