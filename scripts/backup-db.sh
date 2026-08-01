#!/usr/bin/env bash
# Daily Postgres backup for Docker container anbeauty-db
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
CONTAINER="${DB_CONTAINER:-anbeauty-db}"
DB_USER="${POSTGRES_USER:-anbeauty}"
DB_NAME="${POSTGRES_DB:-anbeauty}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

if ! docker inspect "$CONTAINER" --format='{{.State.Running}}' 2>/dev/null | grep -q true; then
  echo "Error: container $CONTAINER is not running" >&2
  exit 1
fi

STAMP="$(date +%Y-%m-%d)"
OUT="$BACKUP_DIR/anbeauty-${STAMP}.dump"

echo "Backing up $DB_NAME from $CONTAINER → $OUT"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$OUT"

# Prune old dumps
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'anbeauty-*.dump' -mtime +"$KEEP_DAYS" -print -delete 2>/dev/null || true

echo "Done. Size: $(wc -c < "$OUT") bytes"
echo "Keep last ${KEEP_DAYS} days in $BACKUP_DIR"
echo "Tip: copy dumps off-host (S3/rsync). Docker volume alone is not a backup."
