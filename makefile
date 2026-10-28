SHELL := /bin/sh
.DEFAULT_GOAL := help

PROJECT_ROOT := $(CURDIR)
SKYNET_DIR := $(PROJECT_ROOT)/3rd/skynet
LUA_DIR := $(SKYNET_DIR)/3rd/lua
CJSON_DIR := $(PROJECT_ROOT)/3rd/lua-cjson
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
else ifeq ($(UNAME_S),FreeBSD)
OPENSSL_PREFIX ?= /usr/local
DETECTED_PLATFORM := freebsd
CJSON_CFLAGS := -fPIC -pthread -DMULTIPLE_THREADS
CJSON_LDFLAGS := -shared -pthread
else ifeq ($(UNAME_S),Linux)
DETECTED_PLATFORM := linux
CJSON_CFLAGS := -fPIC -pthread -DMULTIPLE_THREADS
CJSON_LDFLAGS := -shared -pthread
else
DETECTED_PLATFORM := unsupported
CJSON_CFLAGS := -fPIC -pthread -DMULTIPLE_THREADS
CJSON_LDFLAGS := -shared -pthread
endif

ifeq ($(strip $(OPENSSL_PREFIX)),)
OPENSSL_INCLUDE_DIR ?= /usr/include
OPENSSL_LIB_DIR ?= /usr/lib
else
OPENSSL_INCLUDE_DIR ?= $(OPENSSL_PREFIX)/include
OPENSSL_LIB_DIR ?= $(OPENSSL_PREFIX)/lib
endif

BUSTED_LPATH := ./src/lualib/?.lua;./src/lualib/?/init.lua;./3rd/lua-openai/?.lua;./3rd/lua-openai/?/init.lua;./3rd/tableshape/?.lua;./3rd/tableshape/?/init.lua;./tests/?.lua;./tests/?/init.lua
BUSTED_CPATH := ./luaclib/?.so

.PHONY: help build check check-format test test-live cjson \
	linux macosx freebsd mingw check-openssl mingw-cjson mingw-tls \
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
		"  make test       离线 Busted 单元测试" \
		"  make test-live  调用真实 DeepSeek Responses API" \
		"  make check      格式检查 + 离线单元测试" \
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
	@$(MAKE) cjson

cjson:
	@mkdir -p "$(LUACLIB_DIR)"
	@$(MAKE) -C "$(CJSON_DIR)" clean TARGET="$(LUACLIB_DIR)/cjson.so"
	@$(MAKE) -C "$(CJSON_DIR)" \
		TARGET="$(LUACLIB_DIR)/cjson.so" \
		CC="$(CC)" \
		LUA_INCLUDE_DIR="$(LUA_DIR)" \
		CJSON_CFLAGS="$(CJSON_CFLAGS)" \
		CJSON_LDFLAGS="$(CJSON_LDFLAGS)"

mingw: check-openssl mingw-tls
	@$(MAKE) mingw-cjson

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

test: cjson
	@command -v "$(BUSTED)" >/dev/null 2>&1 || { \
		printf '%s\n' "未找到 busted，请先运行 luarocks install busted" >&2; \
		exit 1; \
	}
	@"$(BUSTED)" --lpath="$(BUSTED_LPATH)" --cpath="$(BUSTED_CPATH)" tests/unit

test-live: build
	@"$(PROJECT_ROOT)/tests/integration/live_smoke.sh"

check-format:
	@"$(PROJECT_ROOT)/tools/check_format.sh"

check: check-format test

clean:
	@-$(MAKE) -C "$(SKYNET_DIR)" clean
	@-$(MAKE) -C "$(CJSON_DIR)" clean TARGET="$(LUACLIB_DIR)/cjson.so"
	@rm -f "$(LUACLIB_DIR)/cjson.so"
	@-rmdir "$(LUACLIB_DIR)" 2>/dev/null || true

cleanall:
	@-$(MAKE) -C "$(SKYNET_DIR)" cleanall
	@-$(MAKE) -C "$(CJSON_DIR)" clean TARGET="$(LUACLIB_DIR)/cjson.so"
	@rm -rf "$(LUACLIB_DIR)"
