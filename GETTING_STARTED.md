# Руководство по первому запуску

## Быстрый старт

### 1. Предварительные требования

- Docker и Docker Compose установлены на вашем компьютере
- Свободные порты: 80, 3000, 5432, 8000

### 2. Запуск проекта

```bash
# 1. Клонируйте репозиторий (если ещё не сделали)
git clone <repository-url>
cd drone-route-building

# 2. Создайте .env файл для auth-сервиса (опционально, есть значения по умолчанию)
cp drone-route-auth/.env.example drone-route-auth/.env

# 3. Запустите все сервисы
docker compose up --build
```

### 3. Доступ к приложению

После запуска откройте в браузере:
- **Приложение:** http://localhost
- **API Документация (Auth Service):** http://localhost:8000/docs
- **PostgreSQL:** localhost:5432

---

## Первый запуск - Пошаговая инструкция

### Шаг 1: Регистрация пользователя

1. Откройте http://localhost
2. Нажмите "Регистрация" в правом верхнем углу
3. Введите email и пароль (минимум 8 символов)
4. Нажмите "Зарегистрироваться"

### Шаг 2: Создание миссии

1. Нарисуйте полигон на карте (инструменты рисования слева)
2. Настройте параметры полёта:
   - Высота полёта
   - Боковое перекрытие
   - Продольное перекрытие
   - Модель дрона
3. Система автоматически рассчитает маршрут

### Шаг 3: Сохранение миссии

1. После построения маршрута появится кнопка "💾 Сохранить миссию"
2. Нажмите на неё
3. Введите название и описание миссии
4. Нажмите "Сохранить"

### Шаг 4: Управление миссиями

1. Перейдите в "Личный кабинет" (правый верхний угол)
2. Вы увидите список всех сохранённых миссий
3. Доступные действия:
   - **Загрузить**: открыть миссию на карте
   - **Удалить**: удалить миссию

---

## Структура проекта

```
drone-route-building/
├── drone-route-auth/          # Auth Service (Python/FastAPI)
│   ├── app/
│   │   ├── main.py
│   │   ├── models/            # SQLAlchemy модели
│   │   ├── schemas/           # Pydantic схемы
│   │   ├── services/          # Бизнес-логика
│   │   └── routes/            # API endpoints
│   ├── Dockerfile.auth
│   └── requirements.txt
│
├── drone-route-server/        # Route Service (Node.js/Express)
│   ├── index.js
│   ├── config/
│   ├── services/
│   ├── db/                    # SQL схема БД
│   └── Dockerfile.server
│
├── drone-route-client/        # Frontend (Vanilla JS)
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── profile.html
│   ├── js/
│   │   ├── modules/
│   │   │   ├── auth.js
│   │   │   ├── mission-manager.js
│   │   │   ├── mission-loader.js
│   │   │   └── save-mission-modal.js
│   │   └── main.js
│   └── css/
│
└── docker-compose.yml
```

---

## Тестовые данные

Для быстрого тестирования можно использовать seed данные:

```bash
# Применить seed данные (создаёт тестового пользователя)
docker exec -i drone_route_postgres psql -U droneuser -d drone_missions < drone-route-server/db/seed.sql
```

**Тестовый пользователь:**
- Email: test@example.com
- Password: password123

---

## Остановка и очистка

```bash
# Остановить все контейнеры
docker compose down

# Остановить и удалить volumes (очистит базу данных)
docker compose down -v

# Пересборка после изменений
docker compose up --build
```

---

## Troubleshooting

### Порты заняты

Если порты 80, 3000, 5432 или 8000 заняты, измените их в `docker-compose.yml`:

```yaml
ports:
  - "8080:80"   # Вместо 80:80
```

### База данных не инициализируется

```bash
# Пересоздайте volume базы данных
docker compose down -v
docker compose up
```

### Ошибки CORS

Если фронтенд не может подключиться к API:
1. Проверьте `js/config.js` - правильные ли URL
2. Убедитесь что все сервисы запущены: `docker compose ps`

### Проблемы с авторизацией

Если токен постоянно "протухает":
1. Проверьте `JWT_SECRET_KEY` в docker-compose.yml
2. Очистите localStorage в браузере (F12 → Application → Local Storage)

---

## Дополнительные ресурсы

- [API Documentation](./API.md)
- [Roadmap](./ROADMAP.md)
- [Analysis Report](./ANALYSIS_REPORT.md)

