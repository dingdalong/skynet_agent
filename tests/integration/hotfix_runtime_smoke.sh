#!/bin/sh
set -eu

project_root=$(CDPATH= cd -P "$(dirname "$0")/../.." && pwd)
if ! output=$(
    cd "$project_root"
    3rd/skynet/skynet tests/integration/hotfix_runtime.config 2>&1
); then
    printf '%s\n' "Skynet 热修运行进程失败" >&2
    printf '%s\n' "$output" >&2
    exit 1
fi

if ! printf '%s\n' "$output" | grep -q "HOTFIX_RUNTIME_OK"; then
    printf '%s\n' "Skynet 热修运行测试失败" >&2
    printf '%s\n' "$output" >&2
    exit 1
fi

printf '%s\n' "Skynet hotfix runtime smoke test 通过"
