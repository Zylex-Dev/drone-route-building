/**
 * Модуль управления миссиями
 * CRUD операции для сохранённых миссий
 */

const MissionManager = (function() {
  const MISSIONS_ENDPOINT = window.APP_CONFIG.API_ENDPOINTS.MISSIONS;
  
  /**
   * Создание новой миссии
   */
  async function saveMission(missionData) {
    try {
      const response = await fetch(MISSIONS_ENDPOINT, {
        method: 'POST',
        headers: AuthModule.getAuthHeaders(),
        body: JSON.stringify(missionData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.detail || data.errors?.join(', ') || 'Ошибка сохранения миссии'
        };
      }
      
      return {
        success: true,
        mission: data
      };
    } catch (error) {
      console.error('Save mission error:', error);
      return {
        success: false,
        error: 'Ошибка соединения с сервером'
      };
    }
  }
  
  /**
   * Получение списка миссий пользователя
   */
  async function getMissions(limit = 10, offset = 0) {
    try {
      const url = `${MISSIONS_ENDPOINT}?limit=${limit}&offset=${offset}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: AuthModule.getAuthHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          AuthModule.logout();
          return { success: false, error: 'Сессия истекла' };
        }
        return { success: false, error: 'Ошибка загрузки миссий' };
      }
      
      const data = await response.json();
      
      return {
        success: true,
        missions: data.missions,
        total: data.total
      };
    } catch (error) {
      console.error('Get missions error:', error);
      return {
        success: false,
        error: 'Ошибка соединения с сервером'
      };
    }
  }
  
  /**
   * Получение конкретной миссии по ID
   */
  async function getMissionById(missionId) {
    try {
      const response = await fetch(`${MISSIONS_ENDPOINT}/${missionId}`, {
        method: 'GET',
        headers: AuthModule.getAuthHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          AuthModule.logout();
          return { success: false, error: 'Сессия истекла' };
        }
        if (response.status === 404) {
          return { success: false, error: 'Миссия не найдена' };
        }
        return { success: false, error: 'Ошибка загрузки миссии' };
      }
      
      const mission = await response.json();
      
      return {
        success: true,
        mission: mission
      };
    } catch (error) {
      console.error('Get mission error:', error);
      return {
        success: false,
        error: 'Ошибка соединения с сервером'
      };
    }
  }
  
  /**
   * Обновление миссии
   */
  async function updateMission(missionId, updateData) {
    try {
      const response = await fetch(`${MISSIONS_ENDPOINT}/${missionId}`, {
        method: 'PUT',
        headers: AuthModule.getAuthHeaders(),
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          AuthModule.logout();
          return { success: false, error: 'Сессия истекла' };
        }
        const data = await response.json();
        return {
          success: false,
          error: data.detail || 'Ошибка обновления миссии'
        };
      }
      
      const mission = await response.json();
      
      return {
        success: true,
        mission: mission
      };
    } catch (error) {
      console.error('Update mission error:', error);
      return {
        success: false,
        error: 'Ошибка соединения с сервером'
      };
    }
  }
  
  /**
   * Удаление миссии
   */
  async function deleteMission(missionId) {
    try {
      const response = await fetch(`${MISSIONS_ENDPOINT}/${missionId}`, {
        method: 'DELETE',
        headers: AuthModule.getAuthHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          AuthModule.logout();
          return { success: false, error: 'Сессия истекла' };
        }
        if (response.status === 404) {
          return { success: false, error: 'Миссия не найдена' };
        }
        return { success: false, error: 'Ошибка удаления миссии' };
      }
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Delete mission error:', error);
      return {
        success: false,
        error: 'Ошибка соединения с сервером'
      };
    }
  }
  
  // Публичный API
  return {
    saveMission,
    getMissions,
    getMissionById,
    updateMission,
    deleteMission
  };
})();

// Экспорт для глобального использования
window.MissionManager = MissionManager;

