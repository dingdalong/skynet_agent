#!/bin/sh
set -eu

command=${1:-status}
port=${2:-18000}
case "$command" in
    status) method=status ;;
    stop) method=shutdown ;;
    force-stop) method=force_shutdown ;;
    *) printf '%s\n' '用法: control.sh status|stop|force-stop [本机控制台端口]' >&2; exit 1 ;;
esac
case "$port" in
    ''|*[!0-9]*) printf '%s\n' '端口必须是整数' >&2; exit 1 ;;
esac
if [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
    printf '%s\n' '端口范围必须为 1..65535' >&2
    exit 1
fi
# 控制台的 HTTP 入口在响应后主动断开，避免 nc 等待交互连接超时。
body=$(printf 'call .main "%s"' "$method")
response=$(printf 'POST / HTTP/1.0\r\nContent-Length: %s\r\n\r\n%s' "${#body}" "$body" \
    | nc -w 15 127.0.0.1 "$port")
printf '%s\n' "$response"
case "$response" in
    *'<CMD OK>'*) ;;
    *) exit 1 ;;
esac
