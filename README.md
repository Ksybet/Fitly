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
- Nginx reverse proxy
- PM2
- HTTPS сертификат Let's Encrypt
- Домен: `api.fitlyapp.ru`

---

# 🚀 Запуск проекта

## Backend

```bash
cd backend
docker compose up -d
npm install
npm run migrate:up
npm run dev
```

Скопируйте `backend/.env.example` в `backend/.env` и замените `JWT_SECRET` на длинное случайное значение. `DATABASE_URL` задаёт основную PostgreSQL-базу. Docker Compose поднимает один PostgreSQL-сервер и при первом запуске создаёт две отдельные базы: `fitly` для разработки и `fitly_test` для интеграционных тестов.

Миграции применяются явно и хранятся в `backend/migrations`:

```bash
npm run migrate:up
npm run migrate:down
npm run migrate:create -- add-example-table
```

### Backend tests

```bash
cd backend
npm test
```

Интеграционные тесты с реальной PostgreSQL используют только `TEST_DATABASE_URL` и отказываются работать с базой, имя которой не заканчивается на `_test`:

```bash
npm run test:integration
npm run test:all
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
