SHELL := /bin/sh
.DEFAULT_GOAL := all

BUILD_DIR ?= build
CFLAGS ?= -O2 -g -DNDEBUG
RUNTIME_CFLAGS := -std=gnu11 -fPIC -Wall -Wextra -Werror
RUNTIME_LIBS := $(if $(filter Linux,$(shell uname -s)),-lutil,)

LIBRARY := $(BUILD_DIR)/libagent_runtime.a
PROGRAMS := $(BUILD_DIR)/agent_worker $(BUILD_DIR)/process_launcher
TEST := $(BUILD_DIR)/runtime_tests
CORE_OBJECTS := $(addprefix $(BUILD_DIR)/,process.o filesystem.o sandbox.o patch.o)
OBJECTS := $(CORE_OBJECTS) $(addprefix $(BUILD_DIR)/,worker.o launcher.o test_runtime.o)
DEPENDENCIES := $(OBJECTS:.o=.d)
BUILD_CONFIG := $(BUILD_DIR)/.build-config
shell_quote = '$(subst ','"'"',$(1))'
BUILD_CONFIG_VALUES := $(foreach name,CC AR CPPFLAGS CFLAGS LDFLAGS LDLIBS,$(call shell_quote,$(name)=$($(name))))

.PHONY: all test clean
all: $(LIBRARY) $(PROGRAMS)

$(BUILD_DIR):
	@mkdir -p "$@"

# macOS Make 3.81 compares seconds, so a rewritten stamp alone can miss flag changes.
ifneq ($(shell printf '%s\n' $(BUILD_CONFIG_VALUES) | cmp -s - "$(BUILD_CONFIG)" || printf changed),)
.PHONY: $(BUILD_CONFIG)
endif
$(BUILD_CONFIG): | $(BUILD_DIR)
	@printf '%s\n' $(BUILD_CONFIG_VALUES) > "$@"

$(BUILD_DIR)/%.o: %.c makefile $(BUILD_CONFIG) | $(BUILD_DIR)
	$(CC) $(CPPFLAGS) $(CFLAGS) $(RUNTIME_CFLAGS) -MMD -MP -c "$<" -o "$@"

$(LIBRARY): $(CORE_OBJECTS)
	$(AR) rcs "$@" $(CORE_OBJECTS)

$(BUILD_DIR)/agent_worker: $(BUILD_DIR)/worker.o $(LIBRARY)
	$(CC) $(CFLAGS) $(LDFLAGS) -o "$@" $^ $(LDLIBS) $(RUNTIME_LIBS)

$(BUILD_DIR)/process_launcher: $(BUILD_DIR)/launcher.o
	$(CC) $(CFLAGS) $(LDFLAGS) -o "$@" $^ $(LDLIBS)

$(TEST): $(BUILD_DIR)/test_runtime.o $(LIBRARY)
	$(CC) $(CFLAGS) $(LDFLAGS) -o "$@" $^ $(LDLIBS) $(RUNTIME_LIBS)

test: $(TEST) $(BUILD_DIR)/process_launcher
	"$(TEST)" "$(abspath $(BUILD_DIR))/process_launcher"

clean:
	$(RM) $(OBJECTS) $(DEPENDENCIES) $(LIBRARY) $(PROGRAMS) $(TEST) $(BUILD_CONFIG)
	@rmdir "$(BUILD_DIR)" 2>/dev/null || true

-include $(DEPENDENCIES)
