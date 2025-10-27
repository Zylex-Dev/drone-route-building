/**
 * API роуты для получения данных о погоде
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const weatherService = require('../services/weather-service');
const { app: logger } = require('../utils/logger');

// Схема валидации для запроса погоды
const weatherRequestSchema = Joi.object({
  latitude: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .messages({
      'number.min': 'Широта должна быть в диапазоне от -90 до 90',
      'number.max': 'Широта должна быть в диапазоне от -90 до 90',
      'any.required': 'Широта обязательна'
    }),
  
  longitude: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .messages({
      'number.min': 'Долгота должна быть в диапазоне от -180 до 180',
      'number.max': 'Долгота должна быть в диапазоне от -180 до 180',
      'any.required': 'Долгота обязательна'
    })
});

/**
 * GET /api/weather
 * Получить прогноз погоды для указанных координат
 */
router.get('/', async (req, res) => {
  const requestId = req.requestId;
  
  logger.info('Получен запрос на данные о погоде', {
    requestId,
    query: req.query
  });
  
  // Валидация параметров запроса
  const { error, value } = weatherRequestSchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    const errorMessages = error.details.map(detail => detail.message).join('; ');
    logger.error('Ошибка валидации параметров запроса погоды', {
      requestId,
      errors: errorMessages,
      receivedParams: req.query
    });
    
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации параметров',
      errors: errorMessages
    });
  }
  
  const { latitude, longitude } = value;
  
  try {
    const weatherData = await weatherService.getWeatherForecast(latitude, longitude);
    
    logger.info('Данные о погоде успешно отправлены клиенту', {
      requestId,
      latitude,
      longitude,
      flightConditions: weatherData.flightConditions.level
    });
    
    return res.json({
      success: true,
      weather: weatherData
    });
    
  } catch (error) {
    logger.error('Ошибка при получении данных о погоде', {
      requestId,
      error: error.message,
      stack: error.stack,
      latitude,
      longitude
    });
    
    return res.status(500).json({
      success: false,
      message: 'Не удалось получить данные о погоде',
      error: error.message
    });
  }
});

module.exports = router;

