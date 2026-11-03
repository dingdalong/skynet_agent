#!/bin/sh
set -eu

project_root=$(CDPATH= cd -P "$(dirname "$0")/../.." && pwd)
env_file=${SKYNET_ENV_FILE:-"$project_root/.env"}
temp_dir=$(mktemp -d)
server_pid=

cleanup() {
    if [ -n "$server_pid" ]; then
        kill "$server_pid" 2>/dev/null || true
        wait "$server_pid" 2>/dev/null || true
    fi
    rm -rf "$temp_dir"
}
trap cleanup EXIT INT TERM

if [ ! -f "$env_file" ]; then
    printf '%s\n' "缺少配置文件: $env_file" >&2
    exit 1
fi

set -a
. "$env_file"
set +a

gateway_url=${AGENT_WS_URL:-ws://127.0.0.1:18787/agent}
server_log="$temp_dir/server.log"

SKYNET_ENV_FILE="$env_file" "$project_root/start.sh" >"$server_log" 2>&1 &
server_pid=$!

attempt=1
gateway_ready=
while [ "$attempt" -le 40 ]; do
    if AGENT_WS_URL="$gateway_url" \
        node "$project_root/tests/integration/agent_gateway_probe.mjs" --ready >/dev/null 2>&1; then
        gateway_ready=1
        break
    fi
    if ! kill -0 "$server_pid" 2>/dev/null; then
        printf '%s\n' "Agent 网关进程提前退出" >&2
        cat "$server_log" >&2
        exit 1
    fi
    attempt=$((attempt + 1))
    sleep 0.25
done
if [ -z "$gateway_ready" ]; then
    printf '%s\n' "Agent 网关未在预期时间内启动" >&2
    cat "$server_log" >&2
    exit 1
fi

if ! AGENT_WS_URL="$gateway_url" \
    node "$project_root/tests/integration/agent_gateway_probe.mjs" --live; then
    printf '%s\n' "DeepSeek Provider live smoke test 失败" >&2
    cat "$server_log" >&2
    exit 1
fi
