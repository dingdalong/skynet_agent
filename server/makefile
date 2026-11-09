SHELL := /bin/sh
.DEFAULT_GOAL := help

PROJECT_ROOT := $(CURDIR)
SKYNET_DIR := $(PROJECT_ROOT)/3rd/skynet
LUA_DIR := $(SKYNET_DIR)/3rd/lua
CJSON_DIR := $(PROJECT_ROOT)/3rd/lua-cjson
PROTOBUF_DIR := $(PROJECT_ROOT)/3rd/lua-protobuf
LFS_DIR := $(PROJECT_ROOT)/3rd/lfs
LUACLIB_DIR := $(PROJECT_ROOT)/luaclib

CC ?= cc
BUSTED ?= busted
UNAME_S := $(shell uname -s)
MINGW_CC ?= x86_64-w64-mingw32-gcc

ifeq ($(UNAME_S),Darwin)
OPENSSL_PREFIX ?= $(shell brew --prefix openssl 2>/dev/null)
DETECTED_PLATFORM := macosx
CJSON_CFLAGS := -fPIC -pthread -DMULTIPLE_THREADS
CJSON_LDFLAGS := -bundle -undefined dynamic_lookup -pthread
PROTOBUF_CFLAGS := -fPIC -pthread
PROTOBUF_LDFLAGS := -bundle -undefined dynamic_lookup -pthread
LFS_CFLAGS := -fPIC -pthread
LFS_LDFLAGS := -bundle -undefined dynamic_lookup -pthread
else ifeq ($(UNAME_S),FreeBSD)
OPENSSL_PREFIX ?= /usr/local
DETECTED_PLATFORM := freebsd
CJSON_CFLAGS := -fPIC -pthread -DMULTIPLE_THREADS
CJSON_LDFLAGS := -shared -pthread
PROTOBUF_CFLAGS := -fPIC -pthread
PROTOBUF_LDFLAGS := -shared -pthread
LFS_CFLAGS := -fPIC -pthread
LFS_LDFLAGS := -shared -pthread
else ifeq ($(UNAME_S),Linux)
DETECTED_PLATFORM := linux
CJSON_CFLAGS := -fPIC -pthread -DMULTIPLE_THREADS
CJSON_LDFLAGS := -shared -pthread
PROTOBUF_CFLAGS := -fPIC -pthread
PROTOBUF_LDFLAGS := -shared -pthread
LFS_CFLAGS := -fPIC -pthread
LFS_LDFLAGS := -shared -pthread
else
DETECTED_PLATFORM := unsupported
CJSON_CFLAGS := -fPIC -pthread -DMULTIPLE_THREADS
CJSON_LDFLAGS := -shared -pthread
PROTOBUF_CFLAGS := -fPIC -pthread
PROTOBUF_LDFLAGS := -shared -pthread
LFS_CFLAGS := -fPIC -pthread
LFS_LDFLAGS := -shared -pthread
endif

ifeq ($(strip $(OPENSSL_PREFIX)),)
OPENSSL_INCLUDE_DIR ?= /usr/include
OPENSSL_LIB_DIR ?= /usr/lib
else
OPENSSL_INCLUDE_DIR ?= $(OPENSSL_PREFIX)/include
OPENSSL_LIB_DIR ?= $(OPENSSL_PREFIX)/lib
endif

BUSTED_LPATH := ./?.lua;./?/init.lua;./../common/?.lua;./../common/?/init.lua;./src/lualib/?.lua;./src/lualib/?/init.lua;./src/lualib/base/?.lua;./src/service/?/?.lua;./3rd/lua-openai/?.lua;./3rd/lua-openai/?/init.lua;./3rd/lua-protobuf/?.lua;./3rd/lua-protobuf/?/init.lua;./3rd/tableshape/?.lua;./3rd/tableshape/?/init.lua;./tests/?.lua;./tests/?/init.lua
BUSTED_CPATH := ./luaclib/?.so

# 集成测试共用网关端口，构建也会重写 C 模块，不能并行调度这些目标。
.NOTPARALLEL:
.PHONY: help build check check-format test test-integration test-protobuf-shared test-agent-gateway test-hotfix-watch test-hotfix-runtime test-service-runtime test-service-control test-tool-process test-live \
	cjson protobuf lfs process filesystem native test-native linux macosx freebsd mingw check-openssl mingw-cjson mingw-protobuf mingw-lfs mingw-tls \
	clean cleanall

help:
	@printf '%s\n' \
		"Skynet LLM agent" \
		"" \
		"构建:" \
		"  make build      当前平台构建（Linux/macOS/FreeBSD）" \
		"  make linux      Linux 构建" \
		"  make macosx     macOS 构建" \
		"  make freebsd    FreeBSD 构建" \
		"  make mingw      MinGW 交叉构建" \
		"" \
		"检查:" \
		"  make test       共用 C 核心与离线 Busted 单元测试" \
		"  make native     构建共用工具核心与辅助程序" \
		"  make test-integration     构建并运行全部假模型与运行时集成测试" \
		"  make test-protobuf-shared  验证 protobuf schema 跨 VM 共享" \
		"  make test-agent-gateway    运行假模型与四服务网关聊天测试" \
		"  make test-service-runtime  验证服务命令、RPC 超时与热修" \
		"  make test-service-control  验证状态查询和进程关闭" \
		"  make test-live  通过网关调用真实 DeepSeek" \
		"  make check      格式检查、单元测试与集成测试" \
		"" \
		"清理:" \
		"  make clean      删除编译产物" \
		"  make cleanall   删除编译产物及第三方增量产物"

build:
ifeq ($(DETECTED_PLATFORM),unsupported)
	@printf '%s\n' "当前系统不受支持，请显式选择 linux、macosx、freebsd 或 mingw" >&2
	@exit 1
else
	@$(MAKE) $(DETECTED_PLATFORM)
endif

check-openssl:
	@if [ ! -f "$(OPENSSL_INCLUDE_DIR)/openssl/ssl.h" ]; then \
		printf '%s\n' "未找到 OpenSSL 头文件，请设置 OPENSSL_PREFIX 或 OPENSSL_INCLUDE_DIR" >&2; \
		exit 1; \
	fi

linux macosx freebsd: check-openssl
	@$(MAKE) -C "$(SKYNET_DIR)" "$@" \
		TLS_MODULE=ltls \
		TLS_INC="$(OPENSSL_INCLUDE_DIR)" \
		TLS_LIB="$(OPENSSL_LIB_DIR)"
	@$(MAKE) cjson protobuf lfs process filesystem

cjson:
	@mkdir -p "$(LUACLIB_DIR)"
	@$(MAKE) -C "$(CJSON_DIR)" clean TARGET="$(LUACLIB_DIR)/cjson.so"
	@$(MAKE) -C "$(CJSON_DIR)" \
		TARGET="$(LUACLIB_DIR)/cjson.so" \
		CC="$(CC)" \
		LUA_INCLUDE_DIR="$(LUA_DIR)" \
		CJSON_CFLAGS="$(CJSON_CFLAGS)" \
		CJSON_LDFLAGS="$(CJSON_LDFLAGS)"

protobuf:
	@mkdir -p "$(LUACLIB_DIR)"
	@$(CC) -O2 -Wall $(PROTOBUF_CFLAGS) \
		-I"$(LUA_DIR)" \
		"$(PROTOBUF_DIR)/pb.c" \
		-o "$(LUACLIB_DIR)/pb.so" \
		$(PROTOBUF_LDFLAGS)

lfs:
	@mkdir -p "$(LUACLIB_DIR)"
	@$(CC) -O2 -Wall $(LFS_CFLAGS) \
		-I"$(LUA_DIR)" \
		"$(LFS_DIR)/src/lfs.c" \
		-o "$(LUACLIB_DIR)/lfs.so" \
		$(LFS_LDFLAGS)

mingw: check-openssl mingw-tls
	@$(MAKE) mingw-cjson mingw-protobuf mingw-lfs

mingw-cjson:
	@mkdir -p "$(LUACLIB_DIR)"
	@$(MAKE) -C "$(CJSON_DIR)" clean TARGET="$(LUACLIB_DIR)/cjson.so"
	@$(MAKE) -C "$(CJSON_DIR)" \
		TARGET="$(LUACLIB_DIR)/cjson.so" \
		CC="$(MINGW_CC)" \
		LUA_INCLUDE_DIR="$(LUA_DIR)" \
		CJSON_CFLAGS="-DMULTIPLE_THREADS -pthread -DDISABLE_INVALID_NUMBERS" \
		CJSON_LDFLAGS="-shared -pthread -Wl,--allow-shlib-undefined" \
		LDFLAGS="-L$(LUA_DIR) -llua54"

mingw-protobuf:
	@mkdir -p "$(LUACLIB_DIR)"
	@$(MINGW_CC) -O2 -Wall -fPIC -pthread \
		-I"$(LUA_DIR)" \
		"$(PROTOBUF_DIR)/pb.c" \
		-o "$(LUACLIB_DIR)/pb.so" \
		-shared -pthread -Wl,--allow-shlib-undefined \
		-L"$(LUA_DIR)" -llua54

mingw-lfs:
	@mkdir -p "$(LUACLIB_DIR)"
	@$(MINGW_CC) -O2 -Wall -fPIC -pthread \
		-I"$(LUA_DIR)" \
		"$(LFS_DIR)/src/lfs.c" \
		-o "$(LUACLIB_DIR)/lfs.so" \
		-shared -pthread -Wl,--allow-shlib-undefined \
		-L"$(LUA_DIR)" -llua54

mingw-tls:
	@$(MAKE) -C "$(SKYNET_DIR)" -f mingw.mk all CC="$(MINGW_CC)"
	@mkdir -p "$(SKYNET_DIR)/luaclib"
	@$(MINGW_CC) -g -O2 -Wall -std=gnu99 \
		-I"$(LUA_DIR)" \
		-I"$(SKYNET_DIR)/skynet-src" \
		-I"$(SKYNET_DIR)/3rd/compat-mingw" \
		-include "$(SKYNET_DIR)/3rd/compat-mingw/compat.h" \
		-I"$(OPENSSL_INCLUDE_DIR)" \
		-fPIC --shared \
		-Wl,--export-all-symbols,--enable-auto-import,--allow-shlib-undefined,--unresolved-symbols=ignore-all \
		"$(SKYNET_DIR)/lualib-src/ltls.c" \
		-o "$(SKYNET_DIR)/luaclib/ltls.so" \
		-L"$(LUA_DIR)" -llua54 \
		-L"$(SKYNET_DIR)" -lskynet \
		-L"$(OPENSSL_LIB_DIR)" -lssl -lcrypto \
		-lws2_32 -lcrypt32 -static-libgcc

test: cjson protobuf lfs process filesystem test-native
	@command -v "$(BUSTED)" >/dev/null 2>&1 || { \
		printf '%s\n' "未找到 busted，请先运行 luarocks install busted" >&2; \
		exit 1; \
	}
	@"$(BUSTED)" --lpath="$(BUSTED_LPATH)" --cpath="$(BUSTED_CPATH)" \
		--helper=src/lualib/base/preload.lua tests/unit

test-protobuf-shared: protobuf lfs
	@"$(PROJECT_ROOT)/tests/integration/protobuf_shared_smoke.sh"

test-agent-gateway:
	@"$(PROJECT_ROOT)/tests/integration/agent_gateway_smoke.sh"

test-live: build
	@"$(PROJECT_ROOT)/tests/integration/live_smoke.sh"

check-format:
	@"$(PROJECT_ROOT)/tools/check_format.sh"

test-hotfix-watch: build
	@"$(PROJECT_ROOT)/tests/integration/hotfix_watch_smoke.sh"

test-hotfix-runtime:
	@"$(PROJECT_ROOT)/tests/integration/hotfix_runtime_smoke.sh"

test-service-runtime:
	@"$(PROJECT_ROOT)/tests/integration/service_runtime_smoke.sh"

test-service-control:
	@"$(PROJECT_ROOT)/tests/integration/shutdown_runtime_smoke.sh"
	@"$(PROJECT_ROOT)/tests/integration/run_with_fake_gateway.sh" node "$(PROJECT_ROOT)/tests/integration/service_control_probe.mjs"

test-integration: build test-tool-process test-protobuf-shared test-agent-gateway test-hotfix-watch test-hotfix-runtime test-service-runtime test-service-control

check: check-format test test-integration

clean:
	@-$(MAKE) -C "$(SKYNET_DIR)" clean
	@-$(MAKE) -C "$(CJSON_DIR)" clean TARGET="$(LUACLIB_DIR)/cjson.so"
	@rm -f "$(LUACLIB_DIR)/cjson.so" "$(LUACLIB_DIR)/pb.so" "$(LUACLIB_DIR)/lfs.so" \
		"$(LUACLIB_DIR)/agent_process.so" "$(LUACLIB_DIR)/agent_filesystem.so" "$(PROJECT_ROOT)/bin/process_launcher"
	@-rmdir "$(LUACLIB_DIR)" 2>/dev/null || true

cleanall:
	@-$(MAKE) -C "$(SKYNET_DIR)" cleanall
	@-$(MAKE) -C "$(CJSON_DIR)" clean TARGET="$(LUACLIB_DIR)/cjson.so"
	@rm -rf "$(LUACLIB_DIR)"

# Both hosts build the same native sources in independent output directories.
NATIVE_DIR := $(PROJECT_ROOT)/../common/native/agent_runtime
NATIVE_BUILD := $(PROJECT_ROOT)/build/native
.PHONY: native test-native
native:
	@$(MAKE) -C "$(NATIVE_DIR)" BUILD_DIR="$(NATIVE_BUILD)" CC="$(CC)" all
	@mkdir -p "$(PROJECT_ROOT)/bin"
	@cp "$(NATIVE_BUILD)/process_launcher" "$(NATIVE_BUILD)/agent_worker" "$(PROJECT_ROOT)/bin/"

test-native: native
	@$(MAKE) -C "$(NATIVE_DIR)" BUILD_DIR="$(NATIVE_BUILD)" CC="$(CC)" test

process: native
	@mkdir -p "$(LUACLIB_DIR)"
	@$(CC) -O2 -Wall -Wextra $(LFS_CFLAGS) -I"$(LUA_DIR)" -I"$(NATIVE_DIR)" \
		"$(PROJECT_ROOT)/src/lualib-src/process.c" "$(NATIVE_BUILD)/libagent_runtime.a" -o "$(LUACLIB_DIR)/agent_process.so" $(LFS_LDFLAGS) $(if $(filter Linux,$(UNAME_S)),-lutil,)

filesystem: native
	@mkdir -p "$(LUACLIB_DIR)"
	@$(CC) -O2 -Wall -Wextra $(LFS_CFLAGS) -I"$(LUA_DIR)" -I"$(NATIVE_DIR)" \
		"$(PROJECT_ROOT)/src/lualib-src/filesystem.c" "$(NATIVE_BUILD)/libagent_runtime.a" -o "$(LUACLIB_DIR)/agent_filesystem.so" $(LFS_LDFLAGS) $(if $(filter Linux,$(UNAME_S)),-lutil,)

test-tool-process:
	@cd "$(PROJECT_ROOT)" && "$(SKYNET_DIR)/skynet" tests/integration/tool_process.config
