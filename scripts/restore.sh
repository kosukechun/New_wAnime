#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
archive="${1:?Usage: bash scripts/restore.sh backups/wanime-TIMESTAMP.dump}"
if [[ ! -f "$archive" ]]; then echo "Backup does not exist" >&2; exit 1; fi
read -r -p "既存DBを置き換えます。RESTORE と入力: " answer
[[ "$answer" == "RESTORE" ]] || exit 1
docker compose stop app worker
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --exit-on-error' < "$archive"
docker compose up -d app worker
