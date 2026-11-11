#!/bin/sh
set -eu

project_root=$(CDPATH= cd -P "$(dirname "$0")/../.." && pwd)

exec "$project_root/tests/integration/run_with_fake_gateway.sh" \
    agent_gateway_probe
