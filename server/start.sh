#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
compose() { docker compose --env-file "${SKYNET_ENV_FILE:-server/.env}" "$@"; }
compose config --format json | python3 -c '
import json, sys
env = json.load(sys.stdin)["services"]["mongodb"]["environment"]
for key in ("MONGO_INITDB_ROOT_PASSWORD", "APP_CENTER_MONGO_PASSWORD", "GATEWAY_MONGO_PASSWORD",
            "APP_CENTER_MONGO_PROVISION_PASSWORD"):
    if not env.get(key):
        name = "MONGO_BOOTSTRAP_PASSWORD" if key == "MONGO_INITDB_ROOT_PASSWORD" else key
        sys.exit("请先在 server/.env 配置 " + name)'
docker build -f server/Dockerfile --target agent -t skynet-agent-app:local .
compose up -d --wait mongodb
compose exec -T mongodb mongosh --quiet /docker-entrypoint-initdb.d/app-center.js
compose up --build -d gateway
