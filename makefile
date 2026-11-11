SHELL := /bin/sh
.DEFAULT_GOAL := help

PROJECT_ROOT := $(CURDIR)
SERVER_DIR := $(PROJECT_ROOT)/server
CLIENT_DIR := $(PROJECT_ROOT)/client
APP_DIR := $(CLIENT_DIR)/apps/client
GALLERY_DIR := $(CLIENT_DIR)/apps/component_gallery
FLUTTER ?= $(PROJECT_ROOT)/.tools/flutter/bin/flutter
DART ?= $(PROJECT_ROOT)/.tools/flutter/bin/dart
XCODE_DEVELOPER_DIR ?= /Applications/Xcode.app/Contents/Developer

# Flutter 依赖解析、分析和原生构建共用生成配置，必须顺序执行。
.NOTPARALLEL:
.PHONY: help install dev build check check-full client-check client-e2e client-build gallery-dev gallery-e2e gallery-build

help:
	@printf '%s\n' \
		"Skynet Agent" \
		"" \
		"  make install        安装 Flutter 工作区依赖" \
		"  make dev            启动 macOS 客户端（服务端单独启动）" \
		"  make build          构建服务端和 macOS Release 客户端" \
		"  make check          服务端与 Flutter 基础回归（含公共协议）" \
		"  make check-full     基础回归、服务端集成、客户端和画廊原生 E2E" \
		"  make client-check   Flutter 格式、分析、规范及全部单元/组件测试" \
		"  make client-e2e     macOS Profile 端到端与帧耗时采样" \
		"  make client-build   构建 Skynet Agent.app" \
		"  make gallery-dev    启动可选组件画廊" \
		"  make gallery-e2e    画廊原生端到端测试" \
		"  make gallery-build  构建组件画廊" \
		"" \
		"服务管理：./server/start.sh；./server/control.sh status|stop|force-stop [端口]"

install:
	@cd "$(CLIENT_DIR)" && "$(FLUTTER)" pub get

dev:
	@cd "$(APP_DIR)" && DEVELOPER_DIR="$(XCODE_DEVELOPER_DIR)" "$(FLUTTER)" run -d macos

build:
	@$(MAKE) -C "$(SERVER_DIR)" build
	@$(MAKE) client-build

check:
	@$(MAKE) -C "$(SERVER_DIR)" check-format test
	@$(MAKE) client-check

check-full: check
	@$(MAKE) -C "$(SERVER_DIR)" test-integration
	@$(MAKE) client-e2e
	@$(MAKE) gallery-e2e

client-check:
	@cd "$(CLIENT_DIR)" && "$(DART)" format --output=none --set-exit-if-changed packages apps/client/lib apps/client/test apps/client/integration_test apps/client/test_driver apps/component_gallery/lib apps/component_gallery/test apps/component_gallery/integration_test tool
	@cd "$(CLIENT_DIR)" && "$(FLUTTER)" analyze
	@cd "$(CLIENT_DIR)" && "$(DART)" run tool/check_ui_rules.dart
	@cd "$(CLIENT_DIR)" && "$(DART)" run tool/check_imports.dart
	@cd "$(CLIENT_DIR)" && "$(DART)" test tool/test
	@cd "$(CLIENT_DIR)/packages/apple_ui" && "$(FLUTTER)" test
	@cd "$(GALLERY_DIR)" && "$(FLUTTER)" test
	@cd "$(APP_DIR)" && "$(FLUTTER)" test

client-e2e:
	@mkdir -p "$(CLIENT_DIR)/test-artifacts/macos-visual"
	@cd "$(APP_DIR)" && DEVELOPER_DIR="$(XCODE_DEVELOPER_DIR)" "$(FLUTTER)" drive --profile --no-dds --dart-define=INTEGRATION_TEST_SHOULD_REPORT_RESULTS_TO_NATIVE=false --driver=test_driver/integration_test.dart --target=integration_test/workspace_test.dart -d macos

client-build:
	@cd "$(APP_DIR)" && DEVELOPER_DIR="$(XCODE_DEVELOPER_DIR)" "$(FLUTTER)" build macos --release

gallery-dev:
	@cd "$(GALLERY_DIR)" && DEVELOPER_DIR="$(XCODE_DEVELOPER_DIR)" "$(FLUTTER)" run -d macos

gallery-e2e:
	@mkdir -p "$(CLIENT_DIR)/test-artifacts/component-gallery"
	@cd "$(GALLERY_DIR)" && DEVELOPER_DIR="$(XCODE_DEVELOPER_DIR)" "$(FLUTTER)" test integration_test/gallery_test.dart -d macos

gallery-build:
	@cd "$(GALLERY_DIR)" && DEVELOPER_DIR="$(XCODE_DEVELOPER_DIR)" "$(FLUTTER)" build macos --release
