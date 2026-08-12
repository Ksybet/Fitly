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
- Автоматический HTTPS через Caddy
- Автоматическая очистка просроченной сессии

---

# 🌐 Backend инфраструктура
- VPS (Ubuntu)
- Docker Compose
- PostgreSQL 17
- Одноразовый контейнер миграций
- Backend API в production-контейнере
- Caddy reverse proxy в production Compose
- Автоматические TLS-сертификаты Let's Encrypt
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

### Проверка Yandex Cloud Postbox

Для отправки email используется Amazon-compatible API Yandex Cloud Postbox. Перед проверкой подтвердите домен отправителя, выдайте сервисному аккаунту роль `postbox.sender` и укажите в `backend/.env` его static access key (`POSTBOX_ACCESS_KEY_ID` и `POSTBOX_SECRET_ACCESS_KEY`) вместе с подтверждённым `POSTBOX_FROM_EMAIL`. Реальные ключи не добавляются в Git.

Однократная ручная проверка отправляет фиксированное тестовое письмо и выводит только факт принятия письма провайдером и `messageId`:

```bash
cd backend
npm run email:smoke -- recipient@example.com
```

`accepted: true` означает, что Postbox принял письмо на обработку. Эта команда не подтверждает доставку в почтовый ящик получателя и не выполняет автоматические повторы.

### Production

На сервере создайте собственный `.env` с production-секретами и запустите:

```bash
docker compose --env-file .env -f compose.yaml -f compose.production.yaml up --build --detach --wait
```

PostgreSQL и API не публикуются на host. Caddy слушает порты 80 и 443, ожидает healthy API, проксирует `api.fitlyapp.ru` во внутренний `api:3000`, передаёт стандартные `X-Forwarded-*` заголовки и автоматически получает TLS-сертификаты. Перед первым запуском направьте A/AAAA-записи домена на сервер и откройте входящие порты 80/443.

Сертификаты и состояние Caddy сохраняются в volumes `caddy_data` и `caddy_config`. Production-образ API работает от непривилегированного пользователя, имеет read-only root filesystem и не содержит тестов, миграций или devDependencies.

Посмотреть состояние и логи:

```bash
docker compose --env-file .env -f compose.yaml -f compose.production.yaml ps --all
docker compose --env-file .env -f compose.yaml -f compose.production.yaml logs --follow api
docker compose --env-file .env -f compose.yaml -f compose.production.yaml logs --follow caddy
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
