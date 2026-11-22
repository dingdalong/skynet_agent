#!/bin/bash
set -eu
: "${MONGO_INITDB_ROOT_PASSWORD:?请在 server/.env 中设置 MONGO_ROOT_PASSWORD}"
exec /usr/local/bin/docker-entrypoint.sh mongod --bind_ip_all
