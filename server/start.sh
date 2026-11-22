#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
compose() { docker compose --env-file "${SKYNET_ENV_FILE:-server/.env}" "$@"; }
# 切换旧部署前先排空持有共享凭据的节点，并处理脱离旧中心的运行中容器。
project=$(compose config --format json | python3 -c '
import json, sys
config = json.load(sys.stdin)
env = config["services"]["mongodb"]["environment"]
for key in ("APP_CENTER_MONGO_PASSWORD", "GATEWAY_MONGO_PASSWORD", "APP_CENTER_MONGO_PROVISION_PASSWORD"):
    if not env.get(key): sys.exit("请先在 server/.env 配置 " + key)
print(config["name"])')
docker build -f server/Dockerfile --target agent -t skynet-agent-app:local .
isolated() { [ "$(docker inspect -f '{{index .Config.Labels "io.skynet.app-databases"}}' "$1")" = 1 ]; }
for id in $(compose ps -q app-center gateway); do
    if ! isolated "$id"; then ./server/control.sh stop; break; fi
done
for id in $(docker ps -q --filter "label=io.skynet.project=$project"); do
    if ! isolated "$id"; then docker stop "$id"; fi
done
compose up -d --wait mongodb
compose exec -T mongodb mongosh --quiet /docker-entrypoint-initdb.d/app-center.js
compose up --build -d gateway
