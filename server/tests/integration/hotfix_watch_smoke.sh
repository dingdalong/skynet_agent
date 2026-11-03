#!/bin/sh
set -eu

project_root=$(CDPATH= cd -P "$(dirname "$0")/../.." && pwd)
exec node "$project_root/tests/integration/hotfix_watch_probe.mjs"
