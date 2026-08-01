#!/usr/bin/env bash
# Restore Postgres from a custom-format dump created by backup-db.sh
set -euo pipefail

DUMP="${1:-}"
CONTAINER="${DB_CONTAINER:-anbeauty-db}"
DB_USER="${POSTGRES_USER:-anbeauty}"
DB_NAME="${POSTGRES_DB:-anbeauty}"

if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "Usage: $0 path/to/anbeauty-YYYY-MM-DD.dump" >&2
  exit 1
fi

if ! docker inspect "$CONTAINER" --format='{{.State.Running}}' 2>/dev/null | grep -q true; then
  echo "Error: container $CONTAINER is not running" >&2
  exit 1
fi

echo "WARNING: This will DROP and recreate schema data in database '$DB_NAME'."
echo "Dump: $DUMP"
read -r -p "Type YES to continue: " confirm
if [[ "$confirm" != "YES" ]]; then
  echo "Aborted."
  exit 1
fi

# Clean public schema then restore
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
SQL

docker exec -i "$CONTAINER" pg_restore -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl < "$DUMP"

echo "Restore complete. If the API schema is behind, run: npm run db:deploy"
