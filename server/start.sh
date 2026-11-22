#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
compose() { docker compose --env-file "${SKYNET_ENV_FILE:-server/.env}" "$@"; }
compose config --format json | python3 -c '
import json, sys
env = json.load(sys.stdin)["services"]["mongodb"]["environment"]
if not env.get("MONGO_INITDB_ROOT_PASSWORD"):
    sys.exit("请先在 server/.env 配置 MONGO_ROOT_PASSWORD")'
docker build -f server/Dockerfile --target agent -t skynet-agent-app:local .
compose up -d --wait mongodb
compose up --build -d gateway
