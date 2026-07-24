# AN.Beauty — Ultra-Premium Beauty Platform

Премиальный салон: лендинг, онлайн-запись, кабинеты клиента / мастера / админа. Фронт — Vite SPA, бэк — Fastify + Prisma + PostgreSQL.

## Локальный запуск

### 1. База

Postgres должен быть доступен (локальный сервис или `npm run db:up` с Docker).

```bash
cp .env.example .env
cp server/.env.example server/.env
cd server && npm install && npm run db:deploy && npm run db:seed && cd ..
```

### 2. API

```bash
npm run api:dev
```

→ http://localhost:3001 · health: `/health`

### 3. Фронт

```bash
npm install
npm run dev
```

→ http://localhost:5173

Демо-логины:

| Роль | Email | Пароль |
|------|-------|--------|
| Admin | `admin@an.beauty` | `admin123` |
| Master | `elena@an.beauty` | `master123` |
| Client | `you@an.beauty` | `client123` |

## Деплой на сервер

Бэкенд самодостаточен в `server/`.

1. Создайте Postgres, пропишите `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `PORT` в env.
2. На машине API:

```bash
cd server
npm ci
npm run db:deploy
npm run build
npm start
```

Или Docker: `docker build -t anbeauty-api ./server && docker run --env-file .env -p 3001:3001 anbeauty-api`

3. Фронт: соберите с `VITE_API_URL=https://your-api-host` и раздайте `dist/`.

Код не меняется — только env.

## Маршруты фронта

| Путь | Кто |
|------|-----|
| `/` | Лендинг |
| `/booking` | Запись (нужен логин клиента для confirm) |
| `/login` | Вход / регистрация клиента |
| `/cabinet` | CLIENT |
| `PORTAL_STAFF` / `PORTAL_ADMIN` | MASTER / ADMIN — скрытые пути в `src/lib/portalRoutes.ts` |

## Стек

- React 19 + TypeScript + Vite + Framer Motion
- Fastify + JWT + bcrypt + Zod
- PostgreSQL + Prisma
