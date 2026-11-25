#!/bin/sh
set -eu
umask 077
action=$1
[ "$2" = agent ]
state=$FIXTURE_DIR/native-container
pid=
key=
if [ -f "$state" ]; then read -r pid key < "$state"; fi
running() { [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; }
case "$action" in
    start)
        database=$(cat)
        if ! running; then
            key=$(openssl rand -hex 32)
            unset MONGO_ROOT_PASSWORD
            export APP_DATABASE_CONFIG="$database" APP_ID=agent APP_SCHEMA=agent/schema.proto APP_REGISTRATION_KEY="$key"
            ./3rd/skynet/skynet etc/config.app </dev/null >>"$FIXTURE_DIR/app.log" 2>&1 &
            pid=$!
            printf '%s %s\n' "$pid" "$key" > "$state.tmp"
            mv "$state.tmp" "$state"
        fi
        exit 0 ;;
    wait|stop)
        if [ "$action" = stop ] && running; then kill -TERM "$pid"; fi
        attempt=0
        while running; do
            attempt=$((attempt + 1))
            [ "$attempt" -lt 200 ] || { echo "等待应用退出超时 pid=$pid" >&2; exit 1; }
            sleep 0.1
        done
        rm -f "$state" ;;
    inspect|resolve|remove) ;;
    *) exit 2 ;;
esac
if running; then
    printf '{"key":"%s","running":true,"exit_code":0,"image_id":"fixture"}\n' "$key"
else
    printf '{"running":false,"exit_code":0,"image_id":"fixture"}\n'
fi
