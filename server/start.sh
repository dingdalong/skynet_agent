#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
compose() { docker compose --env-file "${SKYNET_ENV_FILE:-server/.env}" "$@"; }
compose up -d --wait mongodb
docker build -f server/Dockerfile --target agent -t "${AGENT_BUILD_IMAGE:-skynet-agent-app:local}" .
compose up --build -d --wait gateway
