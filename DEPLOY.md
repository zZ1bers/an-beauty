# Деплой AN.Beauty на VPS (Docker + CI/CD)

Схема: **GitHub Actions** при пуше в `master`/`main` заходит по SSH на VPS и пересобирает контейнеры.

```
GitHub push → SSH → git pull → docker compose build/up → Caddy (HTTPS) → nginx (SPA) → API → Postgres
```

---

## Шаг 0. Что нужно заранее

1. VPS (Ubuntu 22.04/24.04) с публичным IP
2. Домен (например `anbeauty.example.com`), DNS A-запись → IP VPS
3. Репозиторий на GitHub
4. SSH-доступ к серверу

---

## Шаг 1. Подготовка VPS (один раз)

Зайди на сервер:

```bash
ssh root@YOUR_VPS_IP
```

Установи Docker:

```bash
apt update && apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sh
```

Создай пользователя деплоя (опционально, но лучше не root):

```bash
adduser --disabled-password deploy
usermod -aG docker deploy
mkdir -p /opt/an.beauty
chown deploy:deploy /opt/an.beauty
```

Открой порты 80 и 443 (для Let's Encrypt / HTTPS):

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## Шаг 2. Ключ SSH для GitHub Actions

На **своём ПК**:

```bash
ssh-keygen -t ed25519 -C "github-actions-anbeauty" -f ./anbeauty_deploy -N ""
```

Публичный ключ на VPS:

```bash
ssh-copy-id -i ./anbeauty_deploy.pub deploy@YOUR_VPS_IP
# или вручную в /home/deploy/.ssh/authorized_keys
```

Приватный ключ (`anbeauty_deploy` без `.pub`) позже положи в GitHub Secret `VPS_SSH_KEY`.

---

## Шаг 3. Клон репозитория на VPS

```bash
sudo -u deploy -i
cd /opt
git clone git@github.com:YOUR_ORG/an.beauty.git an.beauty
# или https://github.com/YOUR_ORG/an.beauty.git
cd /opt/an.beauty
```

Если клон по HTTPS — для `git pull` из CI удобнее deploy key или SSH remote.

---

## Шаг 4. Env на сервере

```bash
cp deploy/.env.production.example .env
nano .env
```

Заполни минимум:

| Переменная | Пример |
|---|---|
| `DOMAIN` | `anbeauty.example.com` |
| `POSTGRES_PASSWORD` | длинный случайный |
| `JWT_SECRET` | длинный случайный |
| `CORS_ORIGIN` | `https://anbeauty.example.com` |
| `PUBLIC_URL` | `https://anbeauty.example.com/api` |
| `ADMIN_*` | только для первого seed |

Файл `.env` **не коммить**.

---

## Шаг 5. Первый ручной запуск

```bash
cd /opt/an.beauty
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml ps
curl -I https://YOUR_DOMAIN
```

Caddy сам получит HTTPS-сертификат (нужны корректный DNS и открытые 80/443).

### Первый seed (только один раз!)

Seed **стирает всю БД**. Запускай только на пустой базе (подставь пароль из `.env`):

```bash
cd /opt/an.beauty
set -a && source .env && set +a
docker compose -f docker-compose.prod.yml --env-file .env exec \
  -e ADMIN_EMAIL="$ADMIN_EMAIL" \
  -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  -e NODE_ENV=production \
  api npx prisma db seed
```

Админ-панель: `https://YOUR_DOMAIN/x7Km2pQ9vR4nW8hL`

---

## Шаг 6. GitHub Secrets (CI/CD)

В репозитории GitHub → **Settings → Secrets and variables → Actions**:

| Secret | Значение |
|---|---|
| `VPS_HOST` | IP или hostname VPS |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | содержимое приватного ключа `anbeauty_deploy` |
| `VPS_PORT` | `22` (если не стандартный — свой порт) |
| `VPS_APP_DIR` | `/opt/an.beauty` |

Workflow: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

После пуша в `master`/`main` (или кнопки **Run workflow**) Actions задеплоит обновление.

**Seed в CI не запускается** — чтобы не стереть прод.

---

## Шаг 7. Бэкапы на VPS

```bash
chmod +x /opt/an.beauty/scripts/backup-db.sh
crontab -e
```

Добавь:

```cron
0 3 * * * /opt/an.beauty/scripts/backup-db.sh >> /var/log/anbeauty-backup.log 2>&1
```

Копируй `backups/*.dump` куда-то ещё (S3 / другой диск).

Восстановление:

```bash
/opt/an.beauty/scripts/restore-db.sh /opt/an.beauty/backups/anbeauty-YYYY-MM-DD.dump
```

---

## Шаг 8. Обычная работа

1. Правишь код локально
2. `git push origin master`
3. GitHub Actions деплоит на VPS
4. Сайт обновляется сам

Проверка логов:

```bash
docker compose -f docker-compose.prod.yml logs -f --tail=100
```

---

## Частые проблемы

| Проблема | Что проверить |
|---|---|
| Нет HTTPS | DNS A → IP, порты 80/443, `DOMAIN` в `.env` |
| 502 | `docker compose ... logs api` |
| CORS | `CORS_ORIGIN=https://твой-домен` без слэша в конце |
| Пустой сайт после деплоя | `docker compose ... build --no-cache web` |
| git pull failed в CI | deploy user имеет доступ к репо (deploy key) |

---

## Структура контейнеров

| Сервис | Роль |
|---|---|
| `caddy` | HTTPS + прокси на `web` |
| `web` | nginx: SPA + `/api` → api |
| `api` | Fastify + migrate deploy при старте |
| `db` | Postgres 16 |
