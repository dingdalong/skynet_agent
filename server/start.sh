#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
compose() { docker compose --env-file "${SKYNET_ENV_FILE:-server/.env}" "$@"; }
docker build -f server/Dockerfile --target agent -t skynet-agent-app:local .
compose up -d --wait mongodb
compose exec -T mongodb mongosh --quiet /docker-entrypoint-initdb.d/app-center.js
compose up --build -d gateway
