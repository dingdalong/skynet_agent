#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
compose() { docker compose --env-file "${SKYNET_ENV_FILE:-server/.env}" "$@"; }
project=$(compose config --format json | python3 -c 'import json,sys; print(json.load(sys.stdin)["name"])')
apps() { docker ps "$@" --filter "label=io.skynet.project=$project"; }
case "${1:-status}" in
    status) compose ps -a; apps -a ;;
    stop)
        for node in app-center gateway; do
            id=$(compose ps -q "$node")
            [ -n "$id" ] || continue
            compose exec -T "$node" touch /tmp/skynet-stop
            result=$(docker wait "$id")
            [ "$result" = 0 ] || { echo "$node 清理失败，退出码 $result" >&2; exit 1; }
        done
        compose down
        ;;
    force-stop)
        compose kill app-center
        for id in $(apps -q); do docker kill "$id"; done
        compose down
        ;;
    *) echo '用法: control.sh status|stop|force-stop' >&2; exit 1 ;;
esac
