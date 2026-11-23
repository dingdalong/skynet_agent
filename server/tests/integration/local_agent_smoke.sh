#!/bin/sh
set -eu
cd "$(dirname "$0")/../../.."

compose() { docker compose --env-file "${SKYNET_ENV_FILE:-server/.env}" "$@"; }
port=$(compose exec -T gateway printenv GATEWAY_PORT)
project=$(compose exec -T app-center printenv APP_PROJECT)

docker build -q -f server/Dockerfile --target agent -t skynet-agent-app:local . >/dev/null
AGENT_TEST_IMAGE=$(docker image inspect -f '{{.Id}}' skynet-agent-app:local)
AGENT_RUNNING_IMAGE=$(docker inspect -f '{{if .State.Running}}{{.Image}}{{end}}' "${project}-app-agent" 2>/dev/null || :)
APP_CENTER_ADMIN_TOKEN=$(compose exec -T app-center printenv APP_CENTER_ADMIN_TOKEN)
export AGENT_TEST_IMAGE AGENT_RUNNING_IMAGE APP_CENTER_ADMIN_TOKEN
export AGENT_WS_URL="ws://127.0.0.1:${port}/agent"
if [ ! -x server/3rd/skynet/skynet ] || [ ! -f server/luaclib/pb.so ]; then
    make -C server build
fi
exec server/tests/integration/run_probe.sh local_agent_probe
