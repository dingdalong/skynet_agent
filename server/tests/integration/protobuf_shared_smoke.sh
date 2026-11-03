#!/bin/sh
set -eu

project_root=$(CDPATH= cd -P "$(dirname "$0")/../.." && pwd)
if ! output=$(
    cd "$project_root"
    3rd/skynet/skynet tests/integration/protobuf_shared.config 2>&1
); then
    printf '%s\n' "Skynet protobuf 跨 VM 测试失败" >&2
    printf '%s\n' "$output" >&2
    exit 1
fi

if ! printf '%s\n' "$output" | grep -q "PROTOBUF_SHARED_OK"; then
    printf '%s\n' "Skynet protobuf 跨 VM 测试未得到成功标记" >&2
    printf '%s\n' "$output" >&2
    exit 1
fi

printf '%s\n' "Skynet protobuf 跨 VM smoke test 通过"
