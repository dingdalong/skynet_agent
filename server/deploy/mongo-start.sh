#!/bin/bash
set -eu
: "${MONGO_INITDB_ROOT_PASSWORD:?请在 server/.env 中设置 MONGO_BOOTSTRAP_PASSWORD}"
: "${APP_CENTER_MONGO_PASSWORD:?请在 server/.env 中设置 APP_CENTER_MONGO_PASSWORD}"
: "${APP_CENTER_MONGO_PROVISION_PASSWORD:?请配置应用数据库管理密码}"
exec /usr/local/bin/docker-entrypoint.sh mongod --bind_ip_all
