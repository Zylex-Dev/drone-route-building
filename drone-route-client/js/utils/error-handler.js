/**
 * Глобальный обработчик ошибок для клиентского приложения
 * Перехватывает необработанные исключения и отклонённые Promise
 */

(function() {
  'use strict';
  
  /**
   * Перехват JavaScript ошибок
   */
  window.onerror = function(message, source, lineno, colno, error) {
    if (window.logger) {
      window.logger.error('Необработанная JavaScript ошибка', {
        module: 'GlobalErrorHandler',
        error: {
          message: message,
          source: source,
          lineno: lineno,
          colno: colno,
          stack: error ? error.stack : undefined,
          name: error ? error.name : 'Error'
        },
        context: {
          url: window.location.href,
          userAgent: navigator.userAgent
        }
      });
    } else {
      console.error('Необработанная ошибка (logger не инициализирован):', message, error);
    }
    
    // Возвращаем false, чтобы браузер не показывал стандартное сообщение об ошибке
    return false;
  };
  
  /**
   * Перехват необработанных отклонённых Promise
   */
  window.onunhandledrejection = function(event) {
    const reason = event.reason;
    
    if (window.logger) {
      window.logger.error('Необработанное отклонение Promise', {
        module: 'GlobalErrorHandler',
        error: {
          message: reason ? (reason.message || String(reason)) : 'Unknown error',
          stack: reason ? reason.stack : undefined,
          name: reason ? (reason.name || 'PromiseRejection') : 'PromiseRejection'
        },
        context: {
          url: window.location.href,
          promise: event.promise
        }
      });
    } else {
      console.error('Необработанное отклонение Promise (logger не инициализирован):', reason);
    }
    
    // Предотвращаем вывод ошибки в консоль браузера
    event.preventDefault();
  };
  
  /**
   * Мониторинг производительности (опционально)
   * Логирует медленные операции
   */
  if (window.PerformanceObserver) {
    try {
      const perfObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Логируем только длительные операции (> 1000ms)
          if (entry.duration > 1000) {
            if (window.logger) {
              window.logger.warn('Медленная операция обнаружена', {
                module: 'PerformanceMonitor',
                context: {
                  name: entry.name,
                  duration: `${entry.duration.toFixed(2)}ms`,
                  entryType: entry.entryType,
                  startTime: entry.startTime
                }
              });
            }
          }
        }
      });
      
      // Наблюдаем за различными типами событий производительности
      perfObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'resource'] 
      });
    } catch (e) {
      console.warn('PerformanceObserver не поддерживается:', e);
    }
  }
  
  /**
   * Логирование события загрузки страницы
   */
  window.addEventListener('load', function() {
    if (window.logger && window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      const domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;
      
      window.logger.info('Страница полностью загружена', {
        module: 'PageLoad',
        context: {
          totalLoadTime: `${loadTime}ms`,
          domReadyTime: `${domReadyTime}ms`,
          url: window.location.href
        }
      });
    }
  });
  
  /**
   * Логирование навигации
   */
  window.addEventListener('beforeunload', function() {
    if (window.logger) {
      window.logger.info('Пользователь покидает страницу', {
        module: 'Navigation',
        context: {
          url: window.location.href,
          timestamp: new Date().toISOString()
        }
      });
    }
  });
  
  /**
   * Логирование видимости страницы
   */
  if (typeof document.hidden !== 'undefined') {
    document.addEventListener('visibilitychange', function() {
      if (window.logger) {
        window.logger.debug(`Видимость страницы изменена: ${document.hidden ? 'скрыта' : 'видима'}`, {
          module: 'VisibilityChange',
          context: {
            hidden: document.hidden,
            visibilityState: document.visibilityState
          }
        });
      }
    });
  }
  
  console.log('✓ Глобальный обработчик ошибок инициализирован');
})();

