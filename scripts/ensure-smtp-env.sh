#!/usr/bin/env bash
# Appends IONOS mail settings to /opt/an.beauty/.env (or APP_DIR/.env) if missing.
set -euo pipefail

APP_DIR="${1:-/opt/an.beauty}"
ENV_FILE="${APP_DIR}/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "File not found: $ENV_FILE"
  echo "Create .env first, then run again."
  exit 1
fi

if grep -qE '^SMTP_HOST=' "$ENV_FILE"; then
  echo "SMTP settings already present in $ENV_FILE"
  echo "Edit password if needed: nano $ENV_FILE"
  exit 0
fi

cat >> "$ENV_FILE" <<'EOF'

# --- Password reset mail (IONOS) — set SMTP_PASS ---
FRONTEND_URL=https://an-beauty.com
SMTP_HOST=smtp.ionos.de
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@an-beauty.com
SMTP_PASS=CHANGE_ME
MAIL_FROM="AN.Beauty <info@an-beauty.com>"
EOF

echo "Added SMTP block to $ENV_FILE"
echo "Now replace CHANGE_ME with the mailbox password:"
echo "  nano $ENV_FILE"
echo "Find SMTP_PASS=CHANGE_ME and paste the real password."
