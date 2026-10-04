#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
mkdir -p backups
archive="backups/wanime-$(date -u +%Y%m%dT%H%M%SZ).dump"
if ! docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$archive"; then
  rm -- "$archive"
  exit 1
fi
echo "Backup saved: $archive"
# 自動削除せず、保管期限・別サーバー保管は運用者が設定する。
