#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f deploy/postgres.env ]]; then
  echo "Crie deploy/postgres.env a partir de deploy/postgres.env.example (senha forte)."
  exit 1
fi

docker compose -f docker-compose.postgres.yml up -d

echo "Aguardando Postgres ficar saudável..."
for i in $(seq 1 60); do
  if docker compose -f docker-compose.postgres.yml ps postgres 2>/dev/null | grep -q "healthy"; then
    echo "Postgres pronto."
    docker compose -f docker-compose.postgres.yml ps
    exit 0
  fi
  sleep 2
done

echo "Timeout. Verifique: docker compose -f docker-compose.postgres.yml logs postgres"
exit 1
