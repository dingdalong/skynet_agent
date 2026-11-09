#!/bin/sh
set -eu
project_root=$(CDPATH= cd -P "$(dirname "$0")/../../.." && pwd)
cd "$project_root/client"
pnpm build
VITE_AGENT_WS_URL=ws://127.0.0.1:18791/agent cargo build --manifest-path src-tauri/Cargo.toml --example chat_reload_probe --features tauri/custom-protocol
AGENT_REAL_SCENARIO=desktop-execution exec node "$project_root/server/tests/integration/run_with_real_gateway.mjs" node tests/execution/run.mjs
