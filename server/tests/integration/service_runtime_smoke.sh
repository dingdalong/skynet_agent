#!/bin/sh
set -eu

project_root=$(CDPATH= cd -P "$(dirname "$0")/../.." && pwd)
cd "$project_root"
output=$(3rd/skynet/skynet tests/integration/service_runtime.config 2>&1) || {
    printf '%s\n' "$output" >&2
    exit 1
}
printf '%s\n' "$output" | grep -q SERVICE_RUNTIME_OK || {
    printf '%s\n' "$output" >&2
    exit 1
}
printf '%s\n' 'Skynet 服务运行时、RPC 与热修测试通过'
