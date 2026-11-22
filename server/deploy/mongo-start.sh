#!/bin/bash
set -eu
umask 077
: "${APP_CENTER_MONGO_PASSWORD:?请在 server/.env 中设置 APP_CENTER_MONGO_PASSWORD}"
: "${GATEWAY_MONGO_PASSWORD:?请在 server/.env 中设置 GATEWAY_MONGO_PASSWORD}"
: "${APP_CENTER_MONGO_PROVISION_PASSWORD:?请配置应用数据库管理密码}"
secret=/data/db/.bootstrap-password
if [ ! -s "$secret" ]; then
    openssl rand -hex 32 > "$secret.tmp"
    mv "$secret.tmp" "$secret"
fi
chown mongodb:mongodb "$secret"
export MONGO_INITDB_ROOT_USERNAME=bootstrap
export MONGO_INITDB_ROOT_PASSWORD_FILE=/data/db/.bootstrap-password
exec /usr/local/bin/docker-entrypoint.sh mongod --bind_ip_all
