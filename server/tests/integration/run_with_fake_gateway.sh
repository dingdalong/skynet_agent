#!/bin/sh
set -eu

if [ "$#" -eq 0 ]; then
    printf '%s\n' "用法: run_with_fake_gateway.sh <command> [args...]" >&2
    exit 1
fi

project_root=$(CDPATH= cd -P "$(dirname "$0")/../.." && pwd)
gateway_port=18791
fake_llm_port=18792
gateway_url="ws://127.0.0.1:$gateway_port/agent"
fake_llm_url="http://127.0.0.1:$fake_llm_port"
temp_dir=$(mktemp -d)
fake_llm_pid=
server_pid=

cleanup() {
    if [ -n "$server_pid" ]; then
        kill "$server_pid" 2>/dev/null || true
        wait "$server_pid" 2>/dev/null || true
    fi
    if [ -n "$fake_llm_pid" ]; then
        kill "$fake_llm_pid" 2>/dev/null || true
        wait "$fake_llm_pid" 2>/dev/null || true
    fi
    rm -rf "$temp_dir"
}
trap cleanup EXIT INT TERM

fake_llm_log="$temp_dir/fake-llm.log"
node "$project_root/tests/integration/fake_llm_server.mjs" "--port=$fake_llm_port" \
    >"$fake_llm_log" 2>&1 &
fake_llm_pid=$!

attempt=1
fake_llm_ready=
while [ "$attempt" -le 20 ]; do
    if HEALTH_URL="$fake_llm_url/health" \
        node -e 'fetch(process.env.HEALTH_URL).then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))'; then
        fake_llm_ready=1
        break
    fi
    if ! kill -0 "$fake_llm_pid" 2>/dev/null; then
        printf '%s\n' "假模型服务提前退出" >&2
        cat "$fake_llm_log" >&2
        exit 1
    fi
    attempt=$((attempt + 1))
    sleep 0.1
done
if [ -z "$fake_llm_ready" ]; then
    printf '%s\n' "假模型服务未在预期时间内启动" >&2
    cat "$fake_llm_log" >&2
    exit 1
fi

env_file="$temp_dir/env"
server_log="$temp_dir/server.log"
cat >"$env_file" <<EOF
SKYNET_CFG_CHANNEL=test
DEEPSEEK_API_KEY=e2e-test-key
AGENT_WORKSPACE_ROOT="$temp_dir/work_dir"
EOF

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

set +e
AGENT_WS_URL="$gateway_url" AGENT_FAKE_LLM_URL="$fake_llm_url" AGENT_SERVER_PID="$server_pid" "$@"
command_status=$?
set -e
if ! kill -0 "$server_pid" 2>/dev/null; then
    set +e
    wait "$server_pid"
    server_status=$?
    set -e
    server_pid=
    if [ "$server_status" -ne 0 ]; then
        printf 'Skynet 进程异常退出 status=%s\n' "$server_status" >&2
        command_status=1
    fi
fi
if [ "$command_status" -ne 0 ]; then
    printf '%s\n' "假模型全链路命令执行失败" >&2
    cat "$server_log" >&2
    cat "$fake_llm_log" >&2
fi
exit "$command_status"
