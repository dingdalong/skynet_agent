SHELL := /bin/sh
.DEFAULT_GOAL := help

PROJECT_ROOT := $(CURDIR)
SERVER_DIR := $(PROJECT_ROOT)/server
CLIENT_DIR := $(PROJECT_ROOT)/client
PNPM ?= pnpm
XCODE_DEVELOPER_DIR ?= /Applications/Xcode.app/Contents/Developer

.NOTPARALLEL:
.PHONY: help install dev build check check-full client-check client-e2e client-build client-test

help:
	@printf '%s\n' \
		"Skynet Agent" \
		"" \
		"  make install        安装项目客户端依赖与 CocoaPods" \
		"  make dev            构建并启动 macOS 客户端（服务端单独启动）" \
		"  make build          构建服务端和 macOS Release 客户端" \
		"  make check          服务端与客户端基础回归" \
		"  make check-full     基础回归、服务端集成及客户端原生 E2E" \
		"  make client-check   格式、类型、令牌、边界、逻辑和原生集成测试" \
		"  make client-test    原生 Actor、进程隔离与连接生命周期测试" \
		"  make client-e2e     macOS 原生 E2E（需显式启用前台输入）" \
		"  make client-build   构建 client/dist/macos/Skynet Agent.app" \
		"" \
		"服务管理：./server/start.sh；./server/control.sh status|stop|force-stop [端口]"

install:
	@cd "$(CLIENT_DIR)" && "$(PNPM)" install --frozen-lockfile
	@DEVELOPER_DIR="$(XCODE_DEVELOPER_DIR)" node client/tooling/macos.mjs install

dev:
	@DEVELOPER_DIR="$(XCODE_DEVELOPER_DIR)" node client/tooling/macos.mjs dev

build:
	@$(MAKE) -C "$(SERVER_DIR)" build
	@$(MAKE) client-build

check:
	@$(MAKE) -C "$(SERVER_DIR)" check-format test
	@$(MAKE) client-check

check-full: check
	@$(MAKE) -C "$(SERVER_DIR)" test-integration
	@$(MAKE) client-e2e

client-check:
	@cd "$(CLIENT_DIR)" && "$(PNPM)" run format:check
	@cd "$(CLIENT_DIR)" && "$(PNPM)" run typecheck
	@node client/tooling/generate-tokens.mjs --check
	@node client/tooling/check-boundaries.mjs
	@cd "$(CLIENT_DIR)" && "$(PNPM)" test
	@$(MAKE) client-test

client-test:
	@DEVELOPER_DIR="$(XCODE_DEVELOPER_DIR)" node client/tooling/macos.mjs test

client-e2e:
	@node client/tooling/e2e.mjs --preflight
	@$(MAKE) client-build
	@DEVELOPER_DIR="$(XCODE_DEVELOPER_DIR)" node client/tooling/e2e.mjs

client-build:
	@DEVELOPER_DIR="$(XCODE_DEVELOPER_DIR)" node client/tooling/macos.mjs build
