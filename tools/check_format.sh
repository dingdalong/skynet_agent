#!/bin/sh
set -eu

project_root=$(CDPATH= cd -P "$(dirname "$0")/.." && pwd)
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

while IFS= read -r file; do
	if [ ! -s "$file" ]; then
		continue
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
done <<EOF
$(find "$project_root" \
	\( -path "$project_root/.git" -o -path "$project_root/3rd" \
		-o -path "$project_root/luaclib" -o -path "$project_root/cservice" \
		-o -path "$project_root/logs" \) -prune -o \
	-type f \( -name '*.lua' -o -name '*.sh' -o -name '*.json' \
		-o -name '*.md' -o -name '*.config' -o -name 'makefile' \
		-o -name 'Makefile' -o -name '.editorconfig' -o -name '.gitignore' \
		-o -name '.env.example' \) -print | sort)
EOF

makefile_path="$project_root/makefile"
if [ -f "$makefile_path" ] && LC_ALL=C grep -n '^ ' "$makefile_path" >/dev/null 2>&1; then
	report "$makefile_path: makefile 行首应使用 tab"
fi

if [ "$failed" -ne 0 ]; then
	exit 1
fi

printf '%s\n' "格式检查通过"
