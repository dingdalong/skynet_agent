#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
command=${1:-status}
compose() { docker compose --env-file "${SKYNET_ENV_FILE:-server/.env}" "$@"; }
case "$command" in
    status)
        compose --profile apps ps -a
        compose exec -T gateway sh console.sh status
        ;;
    stop)
        compose exec -T gateway sh console.sh stop
        gateway_id=$(compose ps -aq gateway)
        result=$(docker wait "$gateway_id")
        [ "$result" = 0 ] || { echo "主服清理失败，退出码 $result" >&2; exit 1; }
        compose --profile apps down
        ;;
    force-stop) compose --profile apps kill && compose --profile apps down ;;
    *) echo '用法: control.sh status|stop|force-stop' >&2; exit 1 ;;
esac
