/**
 * Скрипт для страницы личного кабинета
 * Загрузка и отображение миссий пользователя
 */

// Глобальные переменные
let currentPage = 1;
const ITEMS_PER_PAGE = 9;
let deleteModal;
let missionToDelete = null;

// Проверка авторизации при загрузке
document.addEventListener('DOMContentLoaded', async function() {
  // Проверяем авторизацию
  if (!AuthModule.isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }
  
  // Инициализация модального окна
  deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
  
  // Загрузка данных пользователя
  await loadUserData();
  
  // Загрузка миссий
  await loadMissions();
  
  // Обработчик кнопки удаления
  document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (missionToDelete) {
      await deleteMission(missionToDelete);
    }
  });

  if (typeof refreshLucideIcons === 'function') {
    refreshLucideIcons();
  }
});

/**
 * Загрузка данных пользователя
 */
async function loadUserData() {
  const user = AuthModule.getUser();
  
  const emailEl = document.getElementById('userEmail');
  if (!emailEl) return;

  const setEmailHtml = (email) => {
    emailEl.classList.add('user-email-nav');
    emailEl.innerHTML = `<i data-lucide="user"></i><span class="user-email-text"></span>`;
    const t = emailEl.querySelector('.user-email-text');
    if (t) t.textContent = email;
    if (typeof refreshLucideIcons === 'function') refreshLucideIcons();
  };

  if (user && user.email) {
    setEmailHtml(user.email);
  } else {
    const result = await AuthModule.getCurrentUser();
    if (result.success) {
      setEmailHtml(result.user.email);
    }
  }
}

/**
 * Загрузка миссий
 */
async function loadMissions(page = 1) {
  currentPage = page;
  const offset = (page - 1) * ITEMS_PER_PAGE;
  
  // Показываем loading
  document.getElementById('loadingState').style.display = 'block';
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('missionsGrid').style.display = 'none';
  document.getElementById('paginationContainer').style.display = 'none';
  
  // Загружаем миссии
  const result = await MissionManager.getMissions(ITEMS_PER_PAGE, offset);
  
  // Скрываем loading
  document.getElementById('loadingState').style.display = 'none';
  
  if (!result.success) {
    showAlert('danger', result.error || 'Ошибка загрузки миссий');
    return;
  }
  
  // Если миссий нет
  if (result.total === 0) {
    document.getElementById('emptyState').style.display = 'block';
    return;
  }
  
  // Отображаем миссии
  displayMissions(result.missions);
  
  // Отображаем пагинацию
  if (result.total > ITEMS_PER_PAGE) {
    displayPagination(result.total);
  }
}

/**
 * Отображение миссий
 */
function displayMissions(missions) {
  const grid = document.getElementById('missionsGrid');
  grid.innerHTML = '';
  grid.style.display = 'flex';
  
  missions.forEach(mission => {
    const card = createMissionCard(mission);
    grid.appendChild(card);
  });

  if (typeof refreshLucideIcons === 'function') {
    refreshLucideIcons();
  }
}

/**
 * Создание карточки миссии
 */
function createMissionCard(mission) {
  const col = document.createElement('div');
  col.className = 'col-12 col-md-6 col-lg-4';
  
  // Форматирование даты
  const createdDate = new Date(mission.created_at).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Расчёт площади из route_geojson
  const coverageArea = mission.route_geojson?.properties?.missionStats?.coverageAreaKm2 || 'N/A';
  const photos = mission.route_geojson?.properties?.missionStats?.estimatedPhotos || 'N/A';
  
  // Статус на русском
  const statusMap = {
    'draft': 'Черновик',
    'active': 'Активна',
    'completed': 'Завершена',
    'archived': 'В архиве'
  };
  
  col.innerHTML = `
    <div class="mission-card">
      <div class="mission-card-header">
        <h3 class="mission-title">${escapeHtml(mission.name)}</h3>
        <span class="mission-status ${mission.status}">${statusMap[mission.status] || mission.status}</span>
      </div>
      
      <p class="mission-description">${mission.description ? escapeHtml(mission.description) : 'Без описания'}</p>
      
      <div class="mission-meta">
        <div class="mission-meta-item">
          <span class="mission-meta-icon-wrap" aria-hidden="true"><i data-lucide="calendar"></i></span>
          <span class="mission-meta-label">Создана:</span>
          <span class="mission-meta-value">${createdDate}</span>
        </div>
        <div class="mission-meta-item">
          <span class="mission-meta-icon-wrap" aria-hidden="true"><i data-lucide="plane"></i></span>
          <span class="mission-meta-label">Дрон:</span>
          <span class="mission-meta-value">${escapeHtml(mission.drone_model)}</span>
        </div>
        <div class="mission-meta-item">
          <span class="mission-meta-icon-wrap" aria-hidden="true"><i data-lucide="map-pinned"></i></span>
          <span class="mission-meta-label">Площадь:</span>
          <span class="mission-meta-value">${coverageArea} км²</span>
        </div>
        <div class="mission-meta-item">
          <span class="mission-meta-icon-wrap" aria-hidden="true"><i data-lucide="camera"></i></span>
          <span class="mission-meta-label">Снимков:</span>
          <span class="mission-meta-value">${photos}</span>
        </div>
      </div>
      
      <div class="mission-footer">
        <button type="button" class="btn btn-primary btn-sm btn-lucide" onclick="loadMission('${mission.id}')">
          <i data-lucide="folder-open"></i><span>Загрузить</span>
        </button>
        <button type="button" class="btn btn-danger btn-sm btn-lucide" onclick="confirmDelete('${mission.id}', '${escapeHtml(mission.name)}')">
          <i data-lucide="trash-2"></i><span>Удалить</span>
        </button>
      </div>
    </div>
  `;
  
  return col;
}

/**
 * Отображение пагинации
 */
function displayPagination(total) {
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';
  
  // Предыдущая страница
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
  prevLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">‹ Назад</a>`;
  pagination.appendChild(prevLi);
  
  // Номера страниц (показываем максимум 5)
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  
  for (let i = start; i <= end; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === currentPage ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>`;
    pagination.appendChild(li);
  }
  
  // Следующая страница
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
  nextLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">Вперёд ›</a>`;
  pagination.appendChild(nextLi);
  
  document.getElementById('paginationContainer').style.display = 'block';
}

/**
 * Изменение страницы
 */
function changePage(page) {
  if (page < 1) return;
  loadMissions(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Загрузка миссии на карту
 */
function loadMission(missionId) {
  // Переход на главную страницу с параметром mission_id
  window.location.href = `index.html?mission_id=${missionId}`;
}

/**
 * Подтверждение удаления
 */
function confirmDelete(missionId, missionName) {
  missionToDelete = missionId;
  document.getElementById('deleteMissionName').textContent = missionName;
  deleteModal.show();
}

/**
 * Удаление миссии
 */
async function deleteMission(missionId) {
  const deleteBtn = document.getElementById('confirmDeleteBtn');
  deleteBtn.disabled = true;
  deleteBtn.textContent = 'Удаление...';
  
  const result = await MissionManager.deleteMission(missionId);
  
  deleteBtn.disabled = false;
  deleteBtn.textContent = 'Удалить';
  
  if (result.success) {
    deleteModal.hide();
    showAlert('success', 'Миссия успешно удалена');
    
    // Перезагружаем список миссий
    setTimeout(() => {
      loadMissions(currentPage);
    }, 1000);
  } else {
    showAlert('danger', result.error || 'Ошибка удаления миссии');
  }
  
  missionToDelete = null;
}

/**
 * Показ alert сообщения
 */
function showAlert(type, message) {
  const alertContainer = document.getElementById('alertContainer');
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  alertContainer.appendChild(alert);
  
  // Автоматическое скрытие через 5 секунд
  setTimeout(() => {
    alert.remove();
  }, 5000);
}

/**
 * Экранирование HTML
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Экспорт функций для глобального использования
window.changePage = changePage;
window.loadMission = loadMission;
window.confirmDelete = confirmDelete;

