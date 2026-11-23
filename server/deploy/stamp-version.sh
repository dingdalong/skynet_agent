#!/bin/sh
set -eu
# 在最终镜像内计算，只包含这个节点实际携带的文件。
version_file=$1
release=$(cat "$version_file")
printf '%s\n' "$release" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'
set -- /opt/skynet
if [ -d /usr/local/libexec ]; then set -- "$@" /usr/local/libexec; fi
find "$@" -type f -print0 > /tmp/node-files
LC_ALL=C sort -z /tmp/node-files | xargs -0 sha256sum > /tmp/node-checksums
digest=$(sha256sum /tmp/node-checksums)
printf '%s+%.12s\n' "$release" "$digest" > "$version_file"
rm /tmp/node-files /tmp/node-checksums
