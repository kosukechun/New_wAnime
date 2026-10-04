#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -n "$(git status --porcelain)" ]]; then echo "Tracked or untracked changes exist. Commit or inspect them before deploying." >&2; exit 1; fi
bash scripts/backup.sh
git pull --ff-only origin main
docker compose build
docker compose run --rm migrate
docker compose up -d --wait
docker compose ps
