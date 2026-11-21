#!/bin/bash
set -eu
umask 077
for secret in /auth/app-center /data/db/.bootstrap-password; do
    if [ ! -s "$secret" ]; then
        openssl rand -hex 32 > "$secret.tmp"
        mv "$secret.tmp" "$secret"
    fi
    chown mongodb:mongodb "$secret"
done
export MONGO_INITDB_ROOT_USERNAME=bootstrap
export MONGO_INITDB_ROOT_PASSWORD_FILE=/data/db/.bootstrap-password
exec /usr/local/bin/docker-entrypoint.sh mongod --bind_ip_all
