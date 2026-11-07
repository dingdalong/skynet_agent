SHELL := /bin/sh
.DEFAULT_GOAL := help

PROJECT_ROOT := $(CURDIR)
SERVER_DIR := $(PROJECT_ROOT)/server
CLIENT_DIR := $(PROJECT_ROOT)/client

.PHONY: server-status server-stop server-force-stop help build test check check-format clean cleanall check-all \
	proto-generate proto-check \
	server-build server-test server-check server-check-format server-start \
	server-test-protobuf-shared server-test-agent-gateway server-test-hotfix-watch \
	server-test-hotfix-runtime server-test-live server-clean server-cleanall \
	server-test-service-runtime server-test-service-control \
	ui-install ui-dev ui-desktop ui-storybook ui-check ui-check-format ui-build \
	ui-build-desktop ui-e2e ui-e2e-native ui-check-native e2e

help:
	@printf '%s\n' \
		"Skynet Agent" \
		"" \
		"服务端:" \
		"  make server-build                构建当前平台 Skynet 服务端" \
		"  make server-test                 运行服务端单元测试" \
		"  make server-check                运行服务端完整检查" \
		"  make server-test-agent-gateway   运行假模型与四服务网关聊天测试" \
		"  make server-start                使用 server/.env 启动服务端" \
		"  make server-status               查询服务状态（CONTROL_PORT 可覆盖端口）" \
		"  make server-stop                 关闭服务端进程" \
		"  make server-force-stop           显式强制关闭服务端进程（含启动阶段）" \
		"  make server-test-service-runtime 验证服务生命周期、RPC 与热修" \
		"  make server-test-service-control 验证状态查询和进程关闭" \
		"  make server-test-live            通过网关调用真实 DeepSeek" \
		"  make server-clean                清理服务端编译产物" \
		"" \
		"客户端:" \
		"  make proto-generate               从 common/proto 生成客户端协议代码" \
		"  make proto-check                  检查共享 proto 与生成代码一致" \
		"  make ui-install                  安装前端和桌面端依赖" \
		"  make ui-dev                      启动 Web 开发服务器" \
		"  make ui-desktop                  启动 Tauri 桌面客户端" \
		"  make ui-check                    检查设计系统、客户端和 Storybook" \
		"  make ui-build                    构建 Web 客户端" \
		"  make ui-build-desktop            构建 macOS/桌面安装包" \
		"  make ui-e2e                      运行快速 Mock UI 端到端测试" \
		"  make ui-check-native             检查 Rust 客户端核心与协议" \
		"  make ui-e2e-native                验证 macOS 原生页面重载与长连接" \
		"  make e2e                         运行 Chromium 全链路端到端测试" \
		"" \
		"组合:" \
		"  make check-all                   执行服务端检查和客户端检查" \
		"  make check-format                检查两端源码格式" \
		"  make build                       构建服务端，保持原有语义"

build: server-build

test: server-test

check: server-check

check-format: server-check-format ui-check-format

clean: server-clean

cleanall: server-cleanall

check-all: server-check ui-check

proto-generate:
	@pnpm --dir "$(CLIENT_DIR)" proto:generate

proto-check:
	@pnpm --dir "$(CLIENT_DIR)" proto:check

server-build:
	@$(MAKE) -C "$(SERVER_DIR)" build

server-test:
	@$(MAKE) -C "$(SERVER_DIR)" test

server-check:
	@$(MAKE) -C "$(SERVER_DIR)" check

server-check-format:
	@$(MAKE) -C "$(SERVER_DIR)" check-format

server-start:
	@"$(SERVER_DIR)/start.sh"

server-test-protobuf-shared:
	@$(MAKE) -C "$(SERVER_DIR)" test-protobuf-shared

server-status:
	@"$(SERVER_DIR)/control.sh" status $(CONTROL_PORT)

server-stop:
	@"$(SERVER_DIR)/control.sh" stop $(CONTROL_PORT)

server-force-stop:
	@"$(SERVER_DIR)/control.sh" force-stop $(CONTROL_PORT)

server-test-agent-gateway:
	@$(MAKE) -C "$(SERVER_DIR)" test-agent-gateway

server-test-hotfix-watch:
	@$(MAKE) -C "$(SERVER_DIR)" test-hotfix-watch

server-test-hotfix-runtime:
	@$(MAKE) -C "$(SERVER_DIR)" test-hotfix-runtime

server-test-service-runtime:
	@$(MAKE) -C "$(SERVER_DIR)" test-service-runtime

server-test-service-control:
	@$(MAKE) -C "$(SERVER_DIR)" test-service-control

server-test-live:
	@$(MAKE) -C "$(SERVER_DIR)" test-live

server-clean:
	@$(MAKE) -C "$(SERVER_DIR)" clean

server-cleanall:
	@$(MAKE) -C "$(SERVER_DIR)" cleanall

ui-install:
	@pnpm --dir "$(CLIENT_DIR)" install

ui-dev:
	@pnpm --dir "$(CLIENT_DIR)" dev

ui-desktop:
	@pnpm --dir "$(CLIENT_DIR)" dev:desktop

ui-storybook:
	@pnpm --dir "$(CLIENT_DIR)" storybook

ui-check:
	@pnpm --dir "$(CLIENT_DIR)" check
	@pnpm --dir "$(CLIENT_DIR)" --filter @skynet/design-system build-storybook

ui-check-format:
	@"$(CLIENT_DIR)/tools/check_format.sh"

ui-build:
	@pnpm --dir "$(CLIENT_DIR)" build

ui-build-desktop:
	@pnpm --dir "$(CLIENT_DIR)" build:desktop

ui-e2e:
	@pnpm --dir "$(CLIENT_DIR)" test:e2e

e2e:
	@pnpm --dir "$(CLIENT_DIR)" test:e2e:full

ui-check-native:
	@pnpm --dir "$(CLIENT_DIR)" check:native

ui-e2e-native:
	@pnpm --dir "$(CLIENT_DIR)" test:native
