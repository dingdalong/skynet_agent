#!/bin/sh
set -eu

project_root=$(CDPATH= cd -P "$(dirname "$0")/../.." && pwd)
output=$("$project_root/start.sh")

if [ -z "$output" ]; then
	printf '%s\n' "DeepSeek Provider live smoke test 未返回文本" >&2
	exit 1
fi

printf '%s\n' "$output"
