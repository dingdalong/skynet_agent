#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
revision=8d14f4a9f48b2baea56603372c3e653b94e2d34f
source_url="https://raw.githubusercontent.com/nlaratta/hig-review/$revision"
download_dir=$(mktemp -d "$script_dir/.download.XXXXXX")
trap 'rm -rf "$download_dir"' EXIT HUP INT TERM

curl -L --fail --silent --show-error --max-time 60 "$source_url/plugin/server.mjs" -o "$download_dir/server.mjs"
curl -L --fail --silent --show-error --max-time 60 "$source_url/plugin/THIRD_PARTY_LICENSES.txt" -o "$download_dir/THIRD_PARTY_LICENSES.txt"
curl -L --fail --silent --show-error --max-time 60 "$source_url/LICENSE" -o "$download_dir/LICENSE"
(cd "$download_dir" && shasum -a 256 -c "$script_dir/SHA256SUMS")
mkdir -p "$script_dir/runtime"
for filename in server.mjs THIRD_PARTY_LICENSES.txt LICENSE; do
  mv "$download_dir/$filename" "$script_dir/runtime/$filename"
done
