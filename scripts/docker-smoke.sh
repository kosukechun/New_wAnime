#!/usr/bin/env bash
set -euo pipefail

# Isolated CI resources only. Never attach production volumes or credentials.
smoke_id="wanime-smoke-${GITHUB_RUN_ID:-$$}"
smoke_db="${smoke_id}-db"
smoke_app="${smoke_id}-app"
smoke_network="${smoke_id}-network"
smoke_volume="${smoke_id}-data"
smoke_backup="$(mktemp)"
cleanup() {
  docker rm -f "$smoke_app" "$smoke_db" >/dev/null 2>&1 || true
  docker network rm "$smoke_network" >/dev/null 2>&1 || true
  docker volume rm "$smoke_volume" >/dev/null 2>&1 || true
  rm -f -- "$smoke_backup"
}
trap cleanup EXIT

docker network create "$smoke_network" >/dev/null
docker volume create "$smoke_volume" >/dev/null
docker run -d --name "$smoke_db" --network "$smoke_network" \
  --network-alias db -e POSTGRES_USER=wanime \
  -e POSTGRES_PASSWORD=ci-only-password -e POSTGRES_DB=wanime_test \
  -v "$smoke_volume:/var/lib/postgresql" postgres:18-bookworm >/dev/null
wait_db() {
  for attempt in $(seq 1 45); do
    if docker exec "$smoke_db" pg_isready -U wanime -d wanime_test >/dev/null 2>&1; then return; fi
    sleep 1
  done
  docker logs "$smoke_db"
  return 1
}
wait_db
smoke_database_url='postgresql://wanime:ci-only-password@db:5432/wanime_test'
docker run --rm --network "$smoke_network" \
  -e DATABASE_URL="$smoke_database_url" new-wanime:operations npm run db:migrate
docker exec "$smoke_db" psql -U wanime -d wanime_test -v ON_ERROR_STOP=1 \
  -c 'CREATE TABLE ci_persistence_probe (id integer PRIMARY KEY); INSERT INTO ci_persistence_probe VALUES (1);'

docker run -d --name "$smoke_app" --network "$smoke_network" \
  -p 127.0.0.1:18765:3000 -e DATABASE_URL="$smoke_database_url" \
  -e APP_URL=http://localhost:18765 new-wanime:test >/dev/null
for attempt in $(seq 1 45); do
  if curl --fail --silent http://localhost:18765/api/health >/dev/null; then break; fi
  sleep 1
done
curl --fail --silent http://localhost:18765/api/health
test "$(curl --silent --output /dev/null --write-out '%{http_code}' \
  -X POST -H 'Origin: http://localhost:18765' http://localhost:18765/api/admin/sync)" = 401

docker restart "$smoke_db" >/dev/null
wait_db
test "$(docker exec "$smoke_db" psql -U wanime -d wanime_test -tAc 'SELECT count(*) FROM ci_persistence_probe;')" = 1
curl --fail --silent http://localhost:18765/api/health

docker exec "$smoke_db" pg_dump -U wanime -d wanime_test -Fc > "$smoke_backup"
docker exec "$smoke_db" createdb -U wanime wanime_restore_test
docker exec -i "$smoke_db" pg_restore -U wanime -d wanime_restore_test --exit-on-error < "$smoke_backup"
test "$(docker exec "$smoke_db" psql -U wanime -d wanime_restore_test -tAc 'SELECT count(*) FROM ci_persistence_probe;')" = 1
test "$(docker exec "$smoke_db" psql -U wanime -d wanime_restore_test -tAc 'SELECT count(*) FROM _prisma_migrations;')" = 3
printf '\nDocker runtime, authentication, persistence and backup restore checks passed.\n'
