#!/bin/sh
set -eu

project_root=$(CDPATH= cd -P "$(dirname "$0")" && pwd)
env_file="$project_root/.env"

if [ ! -f "$env_file" ]; then
	printf '%s\n' "缺少配置文件: $env_file" >&2
	exit 1
fi

set -a
. "$env_file"
set +a

: "${DEEPSEEK_BASE_URL:?请在 .env 中设置 DEEPSEEK_BASE_URL}"
: "${DEEPSEEK_API_KEY:?请在 .env 中设置 DEEPSEEK_API_KEY}"

case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*)
        skynet_binary="$project_root/3rd/skynet/skynet.exe"
        ;;
    *)
        skynet_binary="$project_root/3rd/skynet/skynet"
        ;;
esac

if [ ! -x "$skynet_binary" ]; then
    printf '%s\n' "未找到 Skynet 可执行文件，请先运行 make build" >&2
    exit 1
fi

mkdir -p "$project_root/logs"
cd "$project_root"
exec "$skynet_binary" "$project_root/etc/config"
