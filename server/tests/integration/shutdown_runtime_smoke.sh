#!/bin/sh
set -eu

project_root=$(CDPATH= cd -P "$(dirname "$0")/../.." && pwd)
cd "$project_root"
temp_dir=$(mktemp -d)
runtime_pid=
runtime_log=
port=${SHUTDOWN_TEST_CONTROL_PORT:-18002}

cleanup() {
    result=$?
    if [ "$result" -ne 0 ] && [ -n "$runtime_log" ]; then
        cat "$runtime_log" >&2
    fi
    if [ -n "$runtime_pid" ]; then
        kill "$runtime_pid" 2>/dev/null || true
        wait "$runtime_pid" 2>/dev/null || true
    fi
    rm -rf "$temp_dir"
}
trap cleanup EXIT INT TERM

wait_for_marker() {
    attempt=0
    while [ "$attempt" -lt 200 ]; do
        if grep -Fq "$1" "$runtime_log"; then
            return
        fi
        if ! kill -0 "$runtime_pid" 2>/dev/null; then
            break
        fi
        attempt=$((attempt + 1))
        sleep 0.05
    done
    printf 'shutdown mode=%s 缺少标记: %s\n' "$mode" "$1" >&2
    exit 1
}

for mode in normal login failure slow_close startup_slow startup_wait force_ready closing_wait; do
    runtime_log="$temp_dir/$mode.log"
    SHUTDOWN_TEST_MODE="$mode" SHUTDOWN_TEST_CONTROL_PORT="$port" \
        3rd/skynet/skynet tests/integration/shutdown_runtime.config >"$runtime_log" 2>&1 &
    runtime_pid=$!
    expected=0
    case "$mode" in
        startup_slow)
            wait_for_marker SHUTDOWN_FIXTURE_INIT_FINISHED
            wait_for_marker '启动完成'
            ./control.sh stop "$port" >"$temp_dir/control.log"
            expected=0
            ;;
        startup_wait)
            wait_for_marker SHUTDOWN_FIXTURE_INIT_WAITING
            ./control.sh status "$port" >"$temp_dir/status.log"
            grep -q initializing "$temp_dir/status.log"
            ./control.sh force-stop "$port" >"$temp_dir/control.log"
            expected=1
            ;;
        force_ready)
            wait_for_marker SHUTDOWN_FIXTURE_READY
            ./control.sh force-stop "$port" >"$temp_dir/control.log"
            expected=1
            ;;
        closing_wait)
            wait_for_marker SHUTDOWN_FIXTURE_READY
            ./control.sh stop "$port" >"$temp_dir/stop.log"
            ./control.sh stop "$port" >"$temp_dir/repeated-stop.log"
            wait_for_marker SHUTDOWN_FIXTURE_CLOSE_WAITING
            ./control.sh force-stop "$port" >"$temp_dir/control.log"
            expected=1
            ;;
    esac
    case "$mode" in
        startup_slow|startup_wait|force_ready|closing_wait)
            grep -q '<CMD OK>' "$temp_dir/control.log"
            ;;
        *)
            wait_for_marker "SHUTDOWN_FIXTURE_FINISHED $mode"
            if [ "$mode" = failure ]; then expected=1; fi
            ;;
    esac
    attempt=0
    while kill -0 "$runtime_pid" 2>/dev/null; do
        if [ "$attempt" -ge 400 ]; then
            printf 'shutdown mode=%s 测试进程未按预期退出\n' "$mode" >&2
            exit 1
        fi
        attempt=$((attempt + 1))
        sleep 0.05
    done
    status=0
    wait "$runtime_pid" || status=$?
    runtime_pid=
    if [ "$status" -ne "$expected" ]; then
        printf 'shutdown mode=%s status=%s expected=%s\n' "$mode" "$status" "$expected" >&2
        exit 1
    fi
done
printf '%s\n' 'Skynet 无超时启动与关闭、清理失败和显式强制关闭测试通过'
