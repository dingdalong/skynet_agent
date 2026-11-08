#!/bin/sh
set -eu

project_root=$(CDPATH= cd -P "$(dirname "$0")/../../.." && pwd)

cd "$project_root/client"
exec "$project_root/server/tests/integration/run_with_fake_gateway.sh" \
    pnpm exec playwright test --config playwright.fullstack.config.ts "$@"
