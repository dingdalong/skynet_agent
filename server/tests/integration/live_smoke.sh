#!/bin/sh
set -eu

server_root=$(CDPATH= cd -P "$(dirname "$0")/../.." && pwd)
make -C "$server_root" build
cd "$server_root/.."
export COMPOSE_PROJECT_NAME="skynet-live-$(date +%s)-$$"
export AGENT_BUILD_IMAGE="$COMPOSE_PROJECT_NAME-agent:test"
MONGO_ROOT_PASSWORD=$(openssl rand -hex 24)
export MONGO_HOST=127.0.0.1 MONGO_ROOT_PASSWORD
env_file=${SKYNET_ENV_FILE:-"$server_root/.env"}
compose() { docker compose --env-file "$env_file" "$@"; }

ready=0
startup_log=$(mktemp)
cleanup() {
    result=$?
    if [ "$result" -ne 0 ]; then compose logs --tail 30 gateway app-center >&2; fi
    if [ "$ready" -eq 1 ]; then "$server_root/control.sh" stop || true; fi
    docker rm -f "$COMPOSE_PROJECT_NAME-app-agent" >/dev/null 2>&1 || true
    docker volume rm "${COMPOSE_PROJECT_NAME}_agent-work" >/dev/null 2>&1 || true
    compose down --volumes --rmi local
    docker image rm "$AGENT_BUILD_IMAGE" >/dev/null 2>&1 || true
    rm -f "$startup_log"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

export SKYNET_ENV_FILE="$env_file"
APP_CENTER_ADMIN_TOKEN=$(openssl rand -hex 24)
export APP_CENTER_ADMIN_TOKEN
probe="$server_root/tests/integration/run_probe.sh"
for attempt in 1 2 3; do
    output=$("$probe" allocate_ports)
    ports=$(printf '%s\n' "$output" | grep -Ex '[0-9]+ [0-9]+ [0-9]+ [0-9]+') || { printf '%s\n' "$output" >&2; exit 1; }
    set -- $ports
    [ "$#" -eq 4 ] || { echo '端口分配失败' >&2; exit 1; }
    export GATEWAY_PORT=$1 APP_CENTER_PORT=$2 GATEWAY_CLUSTER_PORT=$3 MONGO_PORT=$4
    if "$server_root/start.sh" >"$startup_log" 2>&1; then
        ready=1
        break
    fi
    compose logs --no-color gateway app-center >>"$startup_log" 2>&1 || true
    cat "$startup_log" >&2
    [ "$attempt" -lt 3 ] || exit 1
    if grep -Eiq 'address already in use|port is already allocated|EADDRINUSE' "$startup_log"; then
        compose down --volumes
    elif grep -Fq 'Listen error' "$startup_log"; then
        # Skynet 的监听错误省略了 errno。回收本项目后仍被监听，才确认端口冲突。
        compose down --volumes
        nc -z 127.0.0.1 "$GATEWAY_PORT" || nc -z 127.0.0.1 "$APP_CENTER_PORT" ||
            nc -z 127.0.0.1 "$GATEWAY_CLUSTER_PORT" || exit 1
    else
        exit 1
    fi
done
agent_request=$("$server_root/appctl" submit --app-id agent --name Agent --image "$AGENT_BUILD_IMAGE")
export AGENT_TEST_REQUEST_ID="$agent_request"
export AGENT_WS_URL="ws://127.0.0.1:$GATEWAY_PORT/agent"
attempt=0
until "$probe" agent_gateway_probe approve_agent >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    [ "$attempt" -lt 60 ] || { echo "Agent 未通过审批或未就绪" >&2; exit 1; }
    sleep 0.5
done
"$probe" agent_gateway_probe live_tools
"$probe" agent_gateway_probe live
