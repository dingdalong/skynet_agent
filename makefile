SHELL := /bin/sh
.DEFAULT_GOAL := help

PROJECT_ROOT := $(CURDIR)
SERVER_DIR := $(PROJECT_ROOT)/server
CLIENT_DIR := $(PROJECT_ROOT)/client
PNPM ?= pnpm
XCODE_DEVELOPER_DIR ?= /Applications/Xcode.app/Contents/Developer
PLATFORM ?= $(shell node -p '({darwin:"macos",win32:"windows",linux:"linux"})[process.platform] || "unknown"')

.NOTPARALLEL:
.PHONY: help install dev build check check-full client-check client-build client-archive client-test client-dev client-core-test client-platforms client-doctor client-preflight

help:
	@printf '%s\n' \
		"Skynet Agent" \
		"" \
		"  make install        安装项目客户端依赖与 CocoaPods" \
		"  make dev            按 PLATFORM 构建并启动客户端（服务端单独启动）" \
		"  make build          构建服务端和所选平台 Release 客户端" \
		"  make check          服务端与客户端基础回归" \
		"  make check-full     基础回归、服务端集成及客户端原生集成（界面另用 Computer Use 验收）" \
		"  make client-check   格式、类型、令牌、边界、逻辑和原生集成测试" \
		"  make client-test    所选平台的原生运行时和生命周期集成测试" \
		"  make client-build   构建客户端；PLATFORM=ios 生成通用模拟器 App" \
		"  make client-archive PLATFORM=ios 生成 iPhone/iPad 真机归档" \
		"  make client-dev     按 PLATFORM 构建并启动客户端" \
		"  make client-platforms 查看真实平台支持状态" \
		"  make client-doctor  查看平台状态与锁定依赖版本" \
		"  make client-core-test 独立验证共享 C++ 核心" \
		"" \
		"服务管理：./server/start.sh；./server/control.sh status|stop|force-stop [端口]" \
		"扩展管理：./server/control.sh extensions-status|extensions-reload [端口]"

install: client-preflight
	@cd "$(CLIENT_DIR)" && "$(PNPM)" install --frozen-lockfile
	@DEVELOPER_DIR="$(XCODE_DEVELOPER_DIR)" node client/tooling/build.mjs install --platform "$(PLATFORM)"

dev: client-dev

build: client-preflight
	@$(MAKE) -C "$(SERVER_DIR)" build
	@$(MAKE) client-build

check:
	@$(MAKE) -C "$(SERVER_DIR)" check-format test
	@$(MAKE) client-check

check-full: check
	@$(MAKE) -C "$(SERVER_DIR)" test-integration

client-check:
	@cd "$(CLIENT_DIR)" && "$(PNPM)" run format:check
	@cd "$(CLIENT_DIR)" && "$(PNPM)" run typecheck
	@cd "$(CLIENT_DIR)" && "$(PNPM)" run protocol:check
	@node client/tooling/generate-tokens.mjs --check
	@node client/tooling/check-boundaries.mjs
	@cd "$(CLIENT_DIR)" && "$(PNPM)" test
	@$(MAKE) client-core-test
	@$(MAKE) client-test

client-test:
	@DEVELOPER_DIR="$(XCODE_DEVELOPER_DIR)" node client/tooling/build.mjs test --platform "$(PLATFORM)"

client-build:
	@DEVELOPER_DIR="$(XCODE_DEVELOPER_DIR)" node client/tooling/build.mjs build --platform "$(PLATFORM)"

client-archive:
	@DEVELOPER_DIR="$(XCODE_DEVELOPER_DIR)" node client/tooling/build.mjs archive --platform "$(PLATFORM)"

client-dev:
	@DEVELOPER_DIR="$(XCODE_DEVELOPER_DIR)" node client/tooling/build.mjs dev --platform "$(PLATFORM)"

client-preflight:
	@node client/tooling/build.mjs build --platform "$(PLATFORM)" --preflight

client-platforms:
	@node client/tooling/build.mjs list

client-doctor:
	@node client/tooling/build.mjs doctor

client-core-test:
	@node client/tooling/test-core.mjs
