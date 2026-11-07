SHELL := /bin/sh
.DEFAULT_GOAL := help

PROJECT_ROOT := $(CURDIR)
SERVER_DIR := $(PROJECT_ROOT)/server
CLIENT_DIR := $(PROJECT_ROOT)/client

# 构建会生成前端资源，集成测试也共用端口，多个根目标必须顺序执行。
.NOTPARALLEL:
.PHONY: help install dev build check check-full proto-generate

help:
	@printf '%s\n' \
		"Skynet Agent" \
		"" \
		"  make install        安装客户端依赖" \
		"  make dev            启动桌面 App 开发模式（服务端单独启动）" \
		"  make build          构建当前平台服务端和桌面 App" \
		"  make check          日常检查：两端检查、单测及 macOS 原生主链路" \
		"  make check-full     完整检查：追加服务端集成、Web 全链路和多浏览器 UI" \
		"  make proto-generate 从 common/proto 生成客户端协议代码" \
		"  make help           显示命令说明" \
		"" \
		"服务管理：./server/start.sh；./server/control.sh status|stop|force-stop [端口]" \
		"专项命令：make -C server help；pnpm --dir client run"

install:
	@pnpm --dir "$(CLIENT_DIR)" install

dev:
	@pnpm --dir "$(CLIENT_DIR)" dev:desktop

build:
	@$(MAKE) -C "$(SERVER_DIR)" build
	@pnpm --dir "$(CLIENT_DIR)" build:desktop

check:
	@$(MAKE) -C "$(SERVER_DIR)" build check-format test
	@pnpm --dir "$(CLIENT_DIR)" check
	@pnpm --dir "$(CLIENT_DIR)" check:native
	@pnpm --dir "$(CLIENT_DIR)" test:native

check-full: check
	@$(MAKE) -C "$(SERVER_DIR)" test-integration
	@pnpm --dir "$(CLIENT_DIR)" test:e2e:full
	@pnpm --dir "$(CLIENT_DIR)" --filter @skynet/design-system build-storybook
	@pnpm --dir "$(CLIENT_DIR)" test:e2e

proto-generate:
	@pnpm --dir "$(CLIENT_DIR)" proto:generate
