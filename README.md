# Fitly

Fitly — мобильное приложение для отслеживания здоровья, активности и состояния пользователя.

---

# 📱 Функциональность (MVP)

## 🔐 Авторизация
- Регистрация пользователя
- Вход по JWT
- Хранение access token (AsyncStorage)
- Автоматическая проверка сессии
- Автоматический выход при истечении JWT токена

---

## 👤 Профиль
- Просмотр данных пользователя
- Редактирование:
  - имени
  - веса
  - роста
  - даты рождения
  - пола

---

## 🏠 Главный экран (Home)
- Отображение активности за день:
  - шаги
  - сон
  - калории
  - вода
  - настроение

- Прогресс относительно целей
- Круговой прогресс шагов
- Быстрое редактирование данных
- Избранные карточки
- Отображение ИМТ
- Поддержка светлой и тёмной темы

---

## 🎯 Цели
- Установка целей:
  - шаги
  - калории
  - вода
  - сон
  - вес

- Отображение прогресса на главном экране

---

## 😴 Сон
- Ввод:
  - времени начала и окончания
  - длительности
  - качества сна

- Отображение статистики сна
- Напоминания о сне

---

## 😊 Настроение
- Выбор текущего настроения
- Оценка состояния
- Отображение на главном экране

---

## 💧 Вода
- Учёт выпитой воды
- Прогресс относительно цели
- Быстрое добавление данных

---

## 🔔 Уведомления
- Локальные уведомления через expo-notifications
- Напоминания о сне
- Android notification channels
- Запрос разрешений на уведомления

---

# 🛠️ Технологии

## Backend
- Node.js
- Express
- PostgreSQL
- JWT (jsonwebtoken)
- bcryptjs
- node-postgres (`pg`)
- node-pg-migrate

---

## Frontend
- React Native (Expo)
- Expo Router
- Axios
- AsyncStorage
- react-native-svg
- Animated API
- expo-notifications
- expo-secure-store

---

# 🏗️ Архитектура

```txt
Mobile App (React Native)
        ↓
REST API
        ↓
Server (Node.js + Express)
        ↓
PostgreSQL Database
```

---

# 📂 Структура проекта

```txt
Fitly/
├── frontend/
│   ├── app/
│   ├── src/
│   │   ├── api/
│   │   ├── context/
│   │   ├── components/
│   │   └── config/
│   └── assets/
│
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── config/
│   │   └── utils/
│   └── package.json
```

---

# 🔐 Безопасность
- JWT авторизация
- Bearer token
- Middleware проверка токена
- HTTPS через Nginx + Certbot
- Автоматическая очистка просроченной сессии

---

# 🌐 Backend инфраструктура
- VPS (Ubuntu)
- Docker Compose
- PostgreSQL 17
- Одноразовый контейнер миграций
- Backend API в production-контейнере
- Nginx reverse proxy на host
- HTTPS сертификат Let's Encrypt
- Домен: `api.fitlyapp.ru`

---

# 🚀 Запуск проекта

## Backend

Все Compose-конфигурации используют один файл `backend/.env`. Создайте его из шаблона и замените пароль PostgreSQL во всех трёх связанных значениях (`POSTGRES_PASSWORD`, `DATABASE_URL`, `TEST_DATABASE_URL`), а также задайте длинный случайный `JWT_SECRET`:

```bash
cd backend
cp .env.example .env
```

В PowerShell вместо `cp` можно использовать `Copy-Item .env.example .env`. Файл `.env` не добавляется в Git, а пароли не хранятся в Compose-файлах.

### Development

Development-конфигурация публикует API и PostgreSQL только на loopback-портах из `.env`, монтирует `src` и перезапускает Node при изменениях:

```bash
docker compose --env-file .env -f compose.yaml -f compose.development.yaml up --build --wait
```

После запуска API должен отвечать на `http://127.0.0.1:3000/health` при стандартном `API_HOST_PORT=3000`. PostgreSQL становится healthy первым, затем одноразовый `migrate` применяет схему, и только после его успешного завершения запускается API.

Остановить development-стек с сохранением данных:

```bash
docker compose --env-file .env -f compose.yaml -f compose.development.yaml down
```

### Test

Test-конфигурация создаёт временную PostgreSQL-базу `fitly_test`, применяет миграции и запускает unit/HTTP и PostgreSQL-интеграционные тесты. Код завершения команды совпадает с кодом test runner:

```bash
docker compose --env-file .env -f compose.yaml -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from api
docker compose --env-file .env -f compose.yaml -f compose.test.yaml down --volumes --remove-orphans
```

Тестовая БД существует только внутри test-стека и удаляется второй командой. Тесты дополнительно отказываются работать с базой, имя которой не заканчивается на `_test`.

### Production

На сервере создайте собственный `.env` с production-секретами и запустите:

```bash
docker compose --env-file .env -f compose.yaml -f compose.production.yaml up --build --detach --wait
```

PostgreSQL не публикуется на host. API публикуется только как `127.0.0.1:${API_HOST_PORT}` для существующего Nginx из `deploy/fitly-api.conf`. Production-образ работает от непривилегированного пользователя, имеет read-only root filesystem и не содержит тестов, миграций или devDependencies.

Посмотреть состояние и логи:

```bash
docker compose --env-file .env -f compose.yaml -f compose.production.yaml ps --all
docker compose --env-file .env -f compose.yaml -f compose.production.yaml logs --follow api
```

Повторный `up` безопасен: уже применённые миграции пропускаются. Обычный `down` сохраняет PostgreSQL volume; не используйте `down --volumes` для production-стека без намерения удалить данные.

### Локальные команды npm

Миграции применяются явно и хранятся в `backend/migrations`:

```bash
npm run migrate:up
npm run migrate:down
npm run migrate:create -- add-example-table
```

```bash
cd backend
npm test
```

Watch mode:

```bash
npm run test:watch
```

Coverage:

```bash
npm run test:coverage
```

---

## Frontend

Expo frontend не входит в backend Compose-стек. Мобильное приложение запускается локально и собирается через EAS; отдельный frontend-контейнер потребуется только при развёртывании web-версии.

```bash
cd frontend
npm install
npx expo start
```

---

# 📦 Сборка APK

```bash
eas build -p android --profile preview
```

---
