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
- MS SQL Server
- JWT (jsonwebtoken)
- bcryptjs
- mssql

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
MS SQL Database
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
npm install
npm run dev
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
