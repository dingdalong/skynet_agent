#!/bin/sh
set -eu
project_root=$(CDPATH= cd -P "$(dirname "$0")/../../.." && pwd)
cd "$project_root/client"
VITE_CHAT_TRANSPORT=websocket pnpm build
VITE_AGENT_WS_URL=ws://127.0.0.1:18793/agent \
    cargo build --manifest-path src-tauri/Cargo.toml --example chat_reload_probe --features tauri/custom-protocol
if [ "${1:-}" = "--integration" ]; then
    export CHAT_PROBE_MODE=integration
    exec "$project_root/server/tests/integration/run_with_fake_gateway.sh" node tests/native/run-native.mjs
fi
export CHAT_PROBE_MODE=real
exec node "$project_root/server/tests/integration/run_with_real_gateway.mjs" node tests/native/run-native.mjs
