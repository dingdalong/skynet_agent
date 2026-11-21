#!/bin/sh
set -eu

server_root=$(CDPATH= cd -P "$(dirname "$0")/../.." && pwd)
cd "$server_root/.."
export COMPOSE_PROJECT_NAME="skynet-live-$(date +%s)-$$"
ports=$(python3 -c 'import random,socket
sockets=[]
while len(sockets)<4:
    sock=socket.socket()
    try: sock.bind(("127.0.0.1",random.randrange(20000,32000)))
    except OSError: sock.close(); continue
    sockets.append(sock)
print(*(sock.getsockname()[1] for sock in sockets))')
set -- $ports
export GATEWAY_PORT=$1 APP_CENTER_PORT=$2 GATEWAY_CLUSTER_PORT=$3 APP_MONGO_PORT=$4
env_file=${SKYNET_ENV_FILE:-"$server_root/.env"}
compose() { docker compose --env-file "$env_file" "$@"; }

cleanup() {
    result=$?
    if [ "$result" -ne 0 ]; then compose logs --tail 30 gateway app-center >&2; fi
    SKYNET_ENV_FILE="$env_file" "$server_root/control.sh" stop || true
    docker rm -f "$COMPOSE_PROJECT_NAME-app-agent" >/dev/null 2>&1 || true
    docker volume rm "${COMPOSE_PROJECT_NAME}_agent-work" >/dev/null 2>&1 || true
    compose down --volumes
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

export SKYNET_ENV_FILE="$env_file"
APP_CENTER_ADMIN_TOKEN=$(python3 -c 'import secrets; print(secrets.token_hex(24))')
export APP_CENTER_ADMIN_TOKEN
"$server_root/start.sh"
agent_request=$("$server_root/appctl" submit --app-id agent --name Agent --image skynet-agent-app:local)
export AGENT_TEST_REQUEST_ID="$agent_request"
export AGENT_WS_URL="ws://127.0.0.1:$GATEWAY_PORT/agent"
probe="$server_root/tests/integration/run_probe.sh"
attempt=0
until "$probe" agent_gateway_probe approve_agent >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    [ "$attempt" -lt 60 ] || { echo "Agent 未通过审批或未就绪" >&2; exit 1; }
    sleep 0.5
done
"$probe" agent_gateway_probe live
