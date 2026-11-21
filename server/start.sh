#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
compose() { docker compose --env-file "${SKYNET_ENV_FILE:-server/.env}" "$@"; }
services=$(compose ps --all --orphans --format '{{.Service}}')
if printf '%s\n' "$services" | grep -qx deployer; then
    echo '本项目仍有旧版 deployer 容器。请按 docs/DEVELOPMENT.md 的「切换旧部署」先关闭旧版服务。' >&2
    exit 1
fi
docker build -f server/Dockerfile --target agent -t skynet-agent-app:local .
compose up --build -d gateway
