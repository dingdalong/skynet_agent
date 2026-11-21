#!/bin/sh
set -eu

server_root=$(CDPATH= cd -P "$(dirname "$0")/../.." && pwd)
cd "$server_root/.."
export COMPOSE_PROJECT_NAME="skynet-live-$(date +%s)-$$"
export GATEWAY_PORT=0
env_file=${SKYNET_ENV_FILE:-"$server_root/.env"}
compose() { docker compose --env-file "$env_file" --profile apps "$@"; }

cleanup() {
    result=$?
    if [ "$result" -ne 0 ]; then compose logs --tail 30 gateway agent >&2; fi
    compose down --volumes
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

SKYNET_ENV_FILE="$env_file" "$server_root/start.sh"
address=$(compose port gateway 18787)
export AGENT_WS_URL="ws://$address/agent"
probe="$server_root/tests/integration/run_probe.sh"
attempt=0
until "$probe" agent_gateway_probe ready >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    [ "$attempt" -lt 60 ] || { echo "Agent 容器未就绪" >&2; exit 1; }
    sleep 0.5
done
"$probe" agent_gateway_probe live
