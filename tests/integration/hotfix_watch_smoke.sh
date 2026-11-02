#!/bin/sh
set -eu

project_root=$(CDPATH= cd -P "$(dirname "$0")/../.." && pwd)
test_dir=$(mktemp -d "${TMPDIR:-/tmp}/skynet-agent-hotfix-watch.XXXXXX")
watch_pid=

cleanup() {
    if [ -n "$watch_pid" ]; then
        kill "$watch_pid" 2>/dev/null || true
        wait "$watch_pid" 2>/dev/null || true
    fi
    rm -r "$test_dir"
}
trap cleanup EXIT
trap 'exit 0' HUP INT TERM

module_root="$test_dir/lualib"
capture_file="$test_dir/capture"
fake_nc="$test_dir/nc"
mkdir -p "$module_root"
printf '%s\n' \
    '#!/bin/sh' \
    'tee "$HOTFIX_CAPTURE" >/dev/null' \
    > "$fake_nc"
chmod +x "$fake_nc"
printf '%s\n' 'return {}' > "$module_root/watched_fixture.lua"

HOTFIX_CAPTURE="$capture_file" \
HOTFIX_MODULE_ROOT="$module_root" \
HOTFIX_NC="$fake_nc" \
HOTFIX_POLL_INTERVAL=0.1 \
HOTFIX_SETTLE_INTERVAL=0.1 \
    "$project_root/tools/watch_hotfix.sh" .test 9000 > "$test_dir/watcher.log" 2>&1 &
watch_pid=$!

attempt=0
while ! grep -q "监听" "$test_dir/watcher.log"; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 50 ]; then
        printf '%s\n' "watcher 未完成初始化" >&2
        sed -n '1,120p' "$test_dir/watcher.log" >&2
        exit 1
    fi
    sleep 0.1
done

printf '%s\n' 'local module = {}' 'function module.run() return true end' 'return module' \
    > "$module_root/watched_fixture.lua"

attempt=0
while [ ! -s "$capture_file" ]; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 50 ]; then
        printf '%s\n' "watcher 未发送热修命令" >&2
        sed -n '1,120p' "$test_dir/watcher.log" >&2
        exit 1
    fi
    sleep 0.1
done

expected="dbgcmd .test HOTFIX watched_fixture"
if [ "$(sed -n '1p' "$capture_file")" != "$expected" ]; then
    printf '%s\n' "watcher 热修命令不正确" >&2
    sed -n '1,20p' "$capture_file" >&2
    exit 1
fi

printf '%s\n' "hotfix watcher smoke test 通过"
