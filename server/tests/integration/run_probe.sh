#!/bin/sh
set -eu

project_root=$(CDPATH= cd -P "$(dirname "$0")/../.." && pwd)
cd "$project_root"
export AGENT_TEST_PROBE=${1:?请指定 Lua 测试探针}
export AGENT_TEST_MODE=${2:-test}
exec ./3rd/skynet/skynet tests/integration/probe.config
