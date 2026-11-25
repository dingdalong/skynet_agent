"""按指定范围格式化工作区中的自有 Lua 和 proto 文件。"""

import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys


def source_files(root, scope):
    paths = set()
    patterns = [
        "--", "*.lua", "*.proto",
        ":(exclude)server/3rd/**",
        ":(exclude)client/vendor/**",
        ":(exclude,glob)**/node_modules/**",
        ":(exclude,glob)**/Pods/**",
        ":(exclude).build/**",
    ]
    if scope == "all":
        queries = [["ls-files", "--cached", "--others", "--exclude-standard"]]
    else:
        queries = [
            ["diff", "--cached", "--name-only", "--no-renames", "--diff-filter=AMT"],
            ["ls-files", "--modified", "--others", "--exclude-standard"],
        ]
    for args in queries:
        output = subprocess.check_output(["git", *args, "-z", *patterns], cwd=root)
        paths.update(root / os.fsdecode(name) for name in output.split(b"\0") if name)
    return sorted(path for path in paths if path.is_file() and path.resolve() == path)


def lua_server():
    override = os.environ.get("LUA_LANGUAGE_SERVER")
    if override:
        return override
    extensions = Path.home() / ".vscode" / "extensions"
    registry = extensions / "extensions.json"
    if registry.is_file():
        for entry in json.loads(registry.read_text(encoding="utf-8")):
            if entry["identifier"]["id"].lower() == "sumneko.lua":
                name = "lua-language-server.exe" if os.name == "nt" else "lua-language-server"
                return extensions / entry["relativeLocation"] / "server" / "bin" / name
    raise ValueError("找不到 sumneko.lua，请安装 VS Code 的 Lua 扩展或设置 LUA_LANGUAGE_SERVER")


def lua_command(server, root, path, scope):
    command = [server, Path(__file__).with_name("format_lua.lua"), path.as_uri(), scope]
    for directory in path.parents:
        config = directory / ".editorconfig"
        if config.is_file():
            command.extend([directory.as_uri(), config])
        if directory == root:
            break
    return command


def proto_command():
    binary = os.environ.get("CLANG_FORMAT") or shutil.which("clang-format")
    if binary:
        command = [binary]
    elif sys.platform == "darwin":
        command = ["xcrun", "clang-format"]
    else:
        raise ValueError("找不到 clang-format，请安装或设置 CLANG_FORMAT")
    style = "{BasedOnStyle: Google, IndentWidth: 2, SortIncludes: Never, LineEnding: LF, InsertNewlineAtEOF: true}"
    return [*command, "--fail-on-incomplete-format", f"--style={style}"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scope", choices=("changed", "all"), default="changed")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    paths = source_files(root, args.scope)
    server = lua_server() if any(path.suffix == ".lua" for path in paths) else None
    proto = proto_command() if any(path.suffix == ".proto" for path in paths) else None
    for path in paths:
        if path.suffix == ".lua":
            command = lua_command(server, root, path, args.scope)
        else:
            command = [*proto, f"--assume-filename={path}"]
        source = path.read_bytes()
        try:
            formatted = subprocess.check_output(command, input=source)
        except (OSError, subprocess.CalledProcessError) as error:
            raise ValueError(f"{path.relative_to(root)} 格式化失败: {error}") from error
        if formatted != source:
            path.write_bytes(formatted)
            print(f"已格式化 {path.relative_to(root)}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))
