#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
compose() { docker compose --env-file "${SKYNET_ENV_FILE:-server/.env}" "$@"; }
docker build -f server/Dockerfile --target agent -t skynet-agent-app:local .
compose up --build -d gateway
