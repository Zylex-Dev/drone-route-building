/**
 * Модуль авторизации
 * Работа с JWT токенами и аутентификацией пользователей
 */

const AuthModule = (function() {
  const TOKEN_KEY = 'drone_auth_token';
  const USER_KEY = 'drone_user_data';
  
  /**
   * Регистрация нового пользователя
   */
  async function register(email, password) {
    try {
      const response = await fetch(window.APP_CONFIG.API_ENDPOINTS.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.detail || data.errors?.join(', ') || 'Ошибка регистрации'
        };
      }
      
      // Сохранение токена и данных пользователя
      saveToken(data.access_token);
      saveUser(data.user);
      
      return {
        success: true,
        user: data.user,
        token: data.access_token
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Ошибка соединения с сервером'
      };
    }
  }
  
  /**
   * Вход пользователя
   */
  async function login(email, password) {
    try {
      const response = await fetch(window.APP_CONFIG.API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.detail || 'Неверный email или пароль'
        };
      }
      
      // Сохранение токена и данных пользователя
      saveToken(data.access_token);
      saveUser(data.user);
      
      return {
        success: true,
        user: data.user,
        token: data.access_token
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Ошибка соединения с сервером'
      };
    }
  }
  
  /**
   * Выход из системы
   */
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = 'index.html';
  }
  
  /**
   * Получение текущего пользователя с сервера
   */
  async function getCurrentUser() {
    const token = getToken();
    
    if (!token) {
      return { success: false, error: 'Токен отсутствует' };
    }
    
    try {
      const response = await fetch(window.APP_CONFIG.API_ENDPOINTS.GET_ME, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        // Токен невалиден - выходим
        if (response.status === 401) {
          logout();
          return { success: false, error: 'Сессия истекла' };
        }
        return { success: false, error: 'Ошибка получения данных' };
      }
      
      const user = await response.json();
      saveUser(user);
      
      return {
        success: true,
        user: user
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return {
        success: false,
        error: 'Ошибка соединения с сервером'
      };
    }
  }
  
  /**
   * Проверка авторизации
   */
  function isAuthenticated() {
    return !!getToken();
  }
  
  /**
   * Получение токена из localStorage
   */
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  
  /**
   * Сохранение токена в localStorage
   */
  function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  
  /**
   * Получение данных пользователя из localStorage
   */
  function getUser() {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }
  
  /**
   * Сохранение данных пользователя в localStorage
   */
  function saveUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  
  /**
   * Создание заголовка Authorization для защищённых запросов
   */
  function getAuthHeaders() {
    const token = getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
  
  // Публичный API
  return {
    register,
    login,
    logout,
    getCurrentUser,
    isAuthenticated,
    getToken,
    getUser,
    getAuthHeaders
  };
})();

// Экспорт для глобального использования
window.AuthModule = AuthModule;

