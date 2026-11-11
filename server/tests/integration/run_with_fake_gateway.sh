#!/bin/sh
set -eu

if [ "$#" -eq 0 ]; then
    printf '%s\n' "用法: run_with_fake_gateway.sh <Lua probe>" >&2
    exit 1
fi

project_root=$(CDPATH= cd -P "$(dirname "$0")/../.." && pwd)
probe=$1
gateway_port=18791
fake_llm_port=18792
gateway_url="ws://127.0.0.1:$gateway_port/agent"
fake_llm_url="http://127.0.0.1:$fake_llm_port"
temp_dir=$(mktemp -d)
fake_llm_pid=
server_pid=
probe_pid=
server_root=$project_root
channel=test
fake_llm_log="$temp_dir/fake-llm.log"
server_log="$temp_dir/server.log"

cleanup() {
    result=$?
    if [ "$result" -ne 0 ]; then
        for log in "$server_log" "$fake_llm_log"; do
            if [ -f "$log" ]; then cat "$log" >&2; fi
        done
    fi
    for pid in "$probe_pid" "$server_pid" "$fake_llm_pid"; do
        if [ -z "$pid" ]; then continue; fi
        kill "$pid" 2>/dev/null || true
        attempt=0
        while kill -0 "$pid" 2>/dev/null && [ "$attempt" -lt 30 ]; do
            attempt=$((attempt + 1))
            sleep 0.1
        done
        kill -KILL "$pid" 2>/dev/null || true
        wait "$pid" 2>/dev/null || true
    done
    rm -rf "$temp_dir"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [ "$probe" = hotfix_watch_probe ]; then
    server_root="$temp_dir/server"
    channel=develop
    mkdir -p "$server_root"
    cp -R "$project_root/src" "$project_root/etc" "$server_root/"
    cp "$project_root/etc/cfg/channel/test.lua" "$server_root/etc/cfg/channel/develop.lua"
    for directory in 3rd luaclib bin; do
        ln -s "$project_root/$directory" "$server_root/$directory"
    done
    ln -s "$project_root/../common" "$temp_dir/common"
fi

FAKE_LLM_PORT="$fake_llm_port" "$project_root/tests/integration/run_probe.sh" fake_llm_server \
    >"$fake_llm_log" 2>&1 &
fake_llm_pid=$!

attempt=1
fake_llm_ready=
while [ "$attempt" -le 20 ]; do
    if grep -q FAKE_LLM_READY "$fake_llm_log"; then
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
cat >"$env_file" <<EOF
SKYNET_CFG_CHANNEL=$channel
DEEPSEEK_API_KEY=e2e-test-key
AGENT_WORKSPACE_ROOT="$temp_dir/work_dir"
EOF

if [ "$probe" = hotfix_watch_probe ]; then
    (
        set -a
        . "$env_file"
        set +a
        cd "$server_root"
        exec "$project_root/3rd/skynet/skynet" etc/config
    ) >"$server_log" 2>&1 &
else
    SKYNET_ENV_FILE="$env_file" "$project_root/start.sh" >"$server_log" 2>&1 &
fi
server_pid=$!

attempt=1
gateway_ready=
while [ "$attempt" -le 40 ]; do
    if AGENT_WS_URL="$gateway_url" \
        "$project_root/tests/integration/run_probe.sh" agent_gateway_probe ready >/dev/null 2>&1; then
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
AGENT_WS_URL="$gateway_url" AGENT_FAKE_LLM_URL="$fake_llm_url" \
    AGENT_TEST_SERVER_ROOT="$server_root" AGENT_TEST_SERVER_LOG="$server_log" \
    "$project_root/tests/integration/run_probe.sh" "$probe" &
probe_pid=$!
wait "$probe_pid"
command_status=$?
probe_pid=
set -e
case "$probe" in
    hotfix_watch_probe|service_control_probe)
        attempt=0
        while [ "$command_status" -eq 0 ] && kill -0 "$server_pid" 2>/dev/null; do
            if [ "$attempt" -ge 150 ]; then
                printf '%s\n' "关闭命令未在预期时间内结束 Skynet 进程" >&2
                command_status=1
                break
            fi
            attempt=$((attempt + 1))
            sleep 0.1
        done
        ;;
esac
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
fi
exit "$command_status"
