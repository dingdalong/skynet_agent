#!/bin/sh
set -eu

project_root=$(CDPATH= cd -P "$(dirname "$0")/.." && pwd)
service_address=${1:?用法: $0 <服务地址> [debug_console端口]}
debug_port=${2:-8000}
debug_host=${HOTFIX_DEBUG_HOST:-127.0.0.1}
module_root=${HOTFIX_MODULE_ROOT:-"$project_root/src/lualib"}
poll_interval=${HOTFIX_POLL_INTERVAL:-0.5}
settle_interval=${HOTFIX_SETTLE_INTERVAL:-0.2}
nc_command=${HOTFIX_NC:-nc}

case "$service_address" in
    .*|:*) ;;
    *)
        printf '%s\n' "服务地址必须以 . 或 : 开头: $service_address" >&2
        exit 1
        ;;
esac

state_dir=$(mktemp -d "${TMPDIR:-/tmp}/skynet-agent-hotfix.XXXXXX")
last_snapshot="$state_dir/last"
pending_snapshot="$state_dir/pending"
current_snapshot="$state_dir/current"

cleanup() {
    rm -r "$state_dir"
}
trap cleanup EXIT
trap 'exit 0' HUP INT TERM

file_mtime() {
    stat -f '%m' "$1" 2>/dev/null || stat -c '%Y' "$1" 2>/dev/null || printf '0'
}

file_signature() {
    checksum=$(cksum "$1" 2>/dev/null || printf 'missing')
    printf '%s:%s' "$(file_mtime "$1")" "$checksum"
}

snapshot() {
    find "$module_root" -type f -name '*.lua' -print |
        LC_ALL=C sort |
        while IFS= read -r file; do
            printf '%s\t%s\n' "$file" "$(file_signature "$file")"
        done
}

extract_modules() {
    previous=$1
    current=$2
    comm -13 "$previous" "$current" |
        cut -f 1 |
        while IFS= read -r file; do
            relative=${file#"$module_root"/}
            case "$relative" in
                base/hotfix.lua|base/hotfix/*)
                    continue
                    ;;
            esac
            module_name=${relative%.lua}
            printf '%s ' "$module_name" | tr '/' '.'
        done
}

send_reload() {
    command="dbgcmd $service_address HOTFIX $1"
    printf '%s\n' "$command"
    printf '%s\n' "$command" | "$nc_command" -w 1 "$debug_host" "$debug_port"
}

snapshot > "$last_snapshot"
printf '%s\n' "监听 ${module_root}，服务 ${service_address}，调试端口 ${debug_port}"

while true; do
    sleep "$poll_interval"
    snapshot > "$pending_snapshot"
    if cmp -s "$last_snapshot" "$pending_snapshot"; then
        continue
    fi

    # 编辑器保存通常会连续产生多个写入事件，稳定后再统一热修。
    while true; do
        sleep "$settle_interval"
        snapshot > "$current_snapshot"
        if cmp -s "$pending_snapshot" "$current_snapshot"; then
            break
        fi
        cp "$current_snapshot" "$pending_snapshot"
    done

    modules=$(extract_modules "$last_snapshot" "$current_snapshot")
    modules=${modules% }
    cp "$current_snapshot" "$last_snapshot"
    if [ -z "$modules" ]; then
        continue
    fi

    if ! send_reload "$modules"; then
        printf '%s\n' "发送热修命令失败，服务或调试端口可能不可用" >&2
    fi
done
