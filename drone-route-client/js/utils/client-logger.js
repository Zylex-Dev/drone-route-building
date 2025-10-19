/**
 * Клиентский логгер с буферизацией и автоматической отправкой на сервер
 * Поддерживает 5 уровней логирования: error, warn, info, debug, trace
 */

class ClientLogger {
  constructor(config = {}) {
    // Для Docker с Nginx прокси используем относительный путь
    // Nginx проксирует /api/* запросы на сервер Node.js
    const defaultApiUrl = '/api/logs/client';
    
    this.config = {
      apiUrl: config.apiUrl || (window.APP_CONFIG ? `${window.APP_CONFIG.API_BASE_URL}/api/logs/client` : defaultApiUrl),
      batchSize: config.batchSize || 50, // Отправлять при накоплении 50 логов
      flushInterval: config.flushInterval || 10000, // Отправлять каждые 10 секунд
      maxBufferSize: config.maxBufferSize || 100, // Максимальный размер буфера
      enableLocalStorage: config.enableLocalStorage !== false, // Дублировать в localStorage
      enabled: config.enabled !== false // Включено ли логирование
    };
    
    this.sessionId = this._generateSessionId();
    this.logBuffer = [];
    this.flushTimer = null;
    this.isSending = false;
    
    // Сбор информации о клиенте
    this.clientInfo = this._collectClientInfo();
    
    // Запускаем таймер автоотправки
    this._startFlushTimer();
    
    // Отправляем логи перед закрытием страницы
    this._setupBeforeUnload();
    
    // Инициализация завершена
    this.info('ClientLogger инициализирован', {
      sessionId: this.sessionId,
      config: this.config
    });
  }
  
  /**
   * Генерация уникального ID сессии
   */
  _generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}`;
  }
  
  /**
   * Сбор информации о клиенте
   */
  _collectClientInfo() {
    return {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: screen.width,
        height: screen.height
      },
      language: navigator.language,
      platform: navigator.platform,
      url: window.location.href
    };
  }
  
  /**
   * Запуск таймера автоотправки
   */
  _startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }
  
  /**
   * Отправка логов перед закрытием страницы
   */
  _setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
      this.flush(true); // Синхронная отправка
    });
  }
  
  /**
   * Добавление лога в буфер
   */
  _addLog(level, message, context = {}) {
    if (!this.config.enabled) return;
    
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        url: window.location.href
      }
    };
    
    // Если есть module в контексте, добавляем отдельно
    if (context.module) {
      logEntry.module = context.module;
    }
    
    // Для ошибок добавляем стек
    if (level === 'error' && context.error) {
      logEntry.error = {
        message: context.error.message,
        stack: context.error.stack,
        name: context.error.name
      };
    }
    
    // Добавляем в буфер
    this.logBuffer.push(logEntry);
    
    // Дублируем в localStorage для отладки
    if (this.config.enableLocalStorage) {
      this._saveToLocalStorage(logEntry);
    }
    
    // Проверяем размер буфера
    if (this.logBuffer.length >= this.config.batchSize) {
      this.flush();
    }
    
    // Для критических ошибок отправляем немедленно
    if (level === 'error') {
      this.flush();
    }
    
    // Удаляем старые логи, если буфер переполнен
    if (this.logBuffer.length > this.config.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.config.maxBufferSize);
    }
  }
  
  /**
   * Сохранение в localStorage
   */
  _saveToLocalStorage(logEntry) {
    try {
      const key = `log_${this.sessionId}`;
      const existing = localStorage.getItem(key);
      const logs = existing ? JSON.parse(existing) : [];
      
      logs.push(logEntry);
      
      // Храним максимум 100 последних логов
      if (logs.length > 100) {
        logs.shift();
      }
      
      localStorage.setItem(key, JSON.stringify(logs));
    } catch (e) {
      // Игнорируем ошибки localStorage (может быть заполнен или отключен)
    }
  }
  
  /**
   * Отправка буфера на сервер
   */
  flush(synchronous = false) {
    if (this.logBuffer.length === 0 || this.isSending) return;
    
    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];
    this.isSending = true;
    
    const payload = {
      sessionId: this.sessionId,
      userAgent: this.clientInfo.userAgent,
      viewport: this.clientInfo.viewport,
      url: window.location.href,
      logs: logsToSend
    };
    
    if (synchronous) {
      // Синхронная отправка через Beacon API (для beforeunload)
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(this.config.apiUrl, blob);
      } catch (e) {
        console.error('Ошибка отправки логов через Beacon:', e);
      }
      this.isSending = false;
    } else {
      // Асинхронная отправка через fetch
      fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      .then(response => {
        if (!response.ok) {
          console.error('Ошибка отправки логов на сервер:', response.status);
        }
      })
      .catch(error => {
        console.error('Ошибка отправки логов:', error);
        // Возвращаем логи в буфер при ошибке
        this.logBuffer = [...logsToSend, ...this.logBuffer];
      })
      .finally(() => {
        this.isSending = false;
      });
    }
  }
  
  /**
   * Получить логи из localStorage
   */
  getLocalLogs() {
    try {
      const key = `log_${this.sessionId}`;
      const existing = localStorage.getItem(key);
      return existing ? JSON.parse(existing) : [];
    } catch (e) {
      return [];
    }
  }
  
  /**
   * Очистить логи из localStorage
   */
  clearLocalLogs() {
    try {
      const key = `log_${this.sessionId}`;
      localStorage.removeItem(key);
    } catch (e) {
      // Игнорируем ошибки
    }
  }
  
  // ========================================================================
  // Публичные методы логирования
  // ========================================================================
  
  /**
   * Логирование ошибок (error)
   */
  error(message, context = {}) {
    this._addLog('error', message, context);
  }
  
  /**
   * Логирование предупреждений (warn)
   */
  warn(message, context = {}) {
    this._addLog('warn', message, context);
  }
  
  /**
   * Логирование информации (info)
   */
  info(message, context = {}) {
    this._addLog('info', message, context);
  }
  
  /**
   * Логирование отладки (debug)
   */
  debug(message, context = {}) {
    this._addLog('debug', message, context);
  }
  
  /**
   * Детальное логирование (trace)
   */
  trace(message, context = {}) {
    this._addLog('trace', message, context);
  }
  
  /**
   * Уничтожение логгера
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(true); // Финальная отправка
  }
}

// Создаём глобальный экземпляр логгера
window.logger = new ClientLogger();

// Экспортируем для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClientLogger;
}

