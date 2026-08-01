# AN.Beauty — Ultra-Premium Beauty Platform

Премиальный салон: лендинг, онлайн-запись, кабинеты клиента / мастера / админа. Фронт — Vite SPA, бэк — Fastify + Prisma + PostgreSQL.

## Локальный запуск

### 1. База

Postgres должен быть доступен (локальный сервис или `npm run db:up` с Docker).

```bash
cp .env.example .env
cp server/.env.example server/.env
# Задайте ADMIN_PASSWORD в server/.env перед seed
cd server && npm install && npm run db:deploy && npm run db:seed && cd ..
```

**Внимание:** `db:seed` полностью очищает БД и создаёт только аккаунт админа. Не запускайте на живой базе с реальными данными.

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

Админ-логин задаётся через `ADMIN_EMAIL` / `ADMIN_PASSWORD` в `server/.env` при seed. Каталог услуг, мастеров и акции создаются уже в админке.

Скрытый путь админки: см. `PORTAL_ADMIN` в `src/lib/portalRoutes.ts`.

## Деплой на VPS (Docker + CI/CD)

Пошаговая инструкция: **[DEPLOY.md](DEPLOY.md)**

Кратко: `docker-compose.prod.yml` (Caddy + nginx + API + Postgres) и GitHub Actions (`.github/workflows/deploy.yml`) — пуш в `master` сам обновляет сервер.

Первый раз: DNS → env на VPS → `docker compose ... up` → **один** seed → секреты GitHub → дальше только `git push`.

## Бэкапы и восстановление

Docker volume `anbeauty_pgdata` **не заменяет** бэкап. Делайте регулярные дампы и копируйте их off-host.

### Ручной бэкап

Linux / macOS / VPS:

```bash
chmod +x scripts/backup-db.sh scripts/restore-db.sh
./scripts/backup-db.sh
```

Windows:

```powershell
npm run db:backup
# или: .\scripts\backup-db.ps1
```

Файлы: `backups/anbeauty-YYYY-MM-DD.dump` (хранятся 14 дней, настраивается `BACKUP_KEEP_DAYS` / `-KeepDays`).

### Cron на VPS (каждый день в 03:00)

```cron
0 3 * * * /absolute/path/to/an.beauty/scripts/backup-db.sh >> /var/log/anbeauty-backup.log 2>&1
```

### Восстановление

```bash
./scripts/restore-db.sh backups/anbeauty-YYYY-MM-DD.dump
# подтверждение: YES
```

Windows: `.\scripts\restore-db.ps1 -Dump .\backups\anbeauty-YYYY-MM-DD.dump`

После restore при необходимости: `npm run db:deploy`.

## Маршруты фронта

| Путь | Кто |
|------|-----|
| `/` | Лендинг |
| `/booking` | Запись |
| `/login` | Вход / регистрация клиента |
| `/cabinet` | CLIENT |
| `PORTAL_STAFF` / `PORTAL_ADMIN` | MASTER / ADMIN — скрытые пути в `src/lib/portalRoutes.ts` |

## Стек

- React 19 + TypeScript + Vite + Framer Motion
- Fastify + JWT + bcrypt + Zod
- PostgreSQL + Prisma
