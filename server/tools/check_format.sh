#!/usr/bin/env bash
set -euo pipefail

project_root=$(CDPATH= cd -P "$(dirname "$0")/.." && pwd)
common_root=$(CDPATH= cd -P "$project_root/../common" && pwd)
failed=0

report() {
	printf '%s\n' "$1" >&2
	failed=1
}

final_byte() {
	if [ ! -s "$1" ]; then
		printf '%s' ""
		return
	fi
	tail -c 1 "$1" | od -An -t u1 | tr -d ' \n'
}

last_two_bytes() {
	if [ ! -s "$1" ]; then
		printf '%s' ""
		return
	fi
	tail -c 2 "$1" | od -An -t u1 | tr -d ' \n'
}

check_file() {
	file=$1
	if [ ! -s "$file" ]; then
		return
	fi

	if [ "$(final_byte "$file")" != "10" ]; then
		report "$file: 文件末尾缺少换行"
	fi
	if [ "$(last_two_bytes "$file")" = "1010" ]; then
		report "$file: 文件末尾存在多个换行"
	fi

	if LC_ALL=C grep -n "$(printf '\r')$" "$file" >/dev/null 2>&1; then
		report "$file: 禁止 CRLF 行尾"
	fi

	case "$file" in
		*.md)
			;;
		*)
			if LC_ALL=C grep -n '[[:blank:]]$' "$file" >/dev/null 2>&1; then
				report "$file: 存在行尾空白"
			fi
			;;
	esac
}

while IFS= read -r file; do
	check_file "$file"
done <<EOF
$(find "$project_root" \
	\( -path "$project_root/.git" \
		-o -path "$project_root/3rd" -o -path "$project_root/luaclib" \
		-o -path "$project_root/cservice" -o -path "$project_root/logs" \
		-o -path "$project_root/work_dir" \
		-o -name build -o -name coverage \) -prune -o \
	-type f \( -name '*.c' -o -name '*.h' -o -name '*.sh' -o -name '*.json' \
		-o -name '*.md' -o -name '*.config' -o -name 'makefile' \
		-o -name 'Makefile' -o -name '.editorconfig' -o -name '.gitignore' \
		-o -name '.env.example' \) -print | sort)
EOF

while IFS= read -r file; do
	check_file "$file"
done <<EOF
$(find "$common_root/proto" -type f -name '*.json' -print | sort)
EOF

python3 "$project_root/tools/format_sources.py" --scope all --list0 | (
	while IFS= read -r -d '' file; do
		check_file "$file"
	done
	exit "$failed"
)

printf '%s\n' "格式检查通过"
