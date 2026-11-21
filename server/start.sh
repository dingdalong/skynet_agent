#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
compose() { docker compose --env-file "${SKYNET_ENV_FILE:-server/.env}" "$@"; }
compose --profile apps build
compose --profile apps create --no-build
compose up -d --no-build gateway
