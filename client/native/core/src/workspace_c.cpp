#include "skynet_workspace.h"
#include "workspace.hpp"
#include <utility>

struct sk_workspace {
    skynet::Workspace state;
    std::unordered_set<std::string> knownApps;
};

namespace {
constexpr int unavailable = static_cast<int>(skynet::WorkspaceError::unavailable);

template <typename Operation>
int mutate(sk_workspace* workspace, Operation operation) noexcept {
    if (!workspace) return unavailable;
    try {
        operation(*workspace);
        return 0;
    } catch (...) {
        return unavailable;
    }
}
}  // namespace

extern "C" {

sk_workspace* sk_workspace_create(const char* mode, double ratio) {
    if (!mode) return nullptr;
    try {
        auto state = skynet::Workspace{};
        state.mode = mode;
        state.ratio = ratio;
        return new sk_workspace{std::move(state), {}};
    } catch (...) {
        return nullptr;
    }
}

void sk_workspace_destroy(sk_workspace* workspace) { delete workspace; }

int sk_workspace_add_pane(sk_workspace* workspace, const char* app_id) {
    return mutate(workspace, [app_id](auto& value) {
        value.state.panes.push_back(
            app_id ? std::optional<std::string>(app_id) : std::nullopt);
    });
}

int sk_workspace_add_recent(sk_workspace* workspace, const char* app_id) {
    if (!app_id) return unavailable;
    return mutate(workspace, [app_id](auto& value) { value.state.recent.emplace_back(app_id); });
}

int sk_workspace_allow_app(sk_workspace* workspace, const char* app_id) {
    if (!app_id) return unavailable;
    return mutate(workspace, [app_id](auto& value) { value.knownApps.emplace(app_id); });
}

int sk_workspace_add_docked(sk_workspace* workspace, const char* app_id) {
    if (!app_id) return unavailable;
    return mutate(workspace, [app_id](auto& value) { value.state.dock.emplace_back(app_id); });
}

int sk_workspace_add_desktop(sk_workspace* workspace, const char* app_id) {
    if (!app_id) return unavailable;
    return mutate(workspace, [app_id](auto& value) { value.state.desktop.emplace_back(app_id); });
}

int sk_workspace_apply(sk_workspace* workspace, const char* command,
                       const char* app_id, const char* edge, int has_ratio, double ratio,
                       const char* before_app_id) {
    if (!workspace || !command || !app_id || !edge || !before_app_id) return unavailable;
    try {
        const skynet::WorkspaceCommand input{
            command, app_id, edge, has_ratio ? std::optional<double>(ratio) : std::nullopt, before_app_id};
        return static_cast<int>(
            skynet::applyWorkspace(workspace->state, input, workspace->knownApps));
    } catch (...) {
        return unavailable;
    }
}

const char* sk_workspace_error(int code) {
    switch (static_cast<skynet::WorkspaceError>(code)) {
        case skynet::WorkspaceError::none: return "";
        case skynet::WorkspaceError::unknownApp: return "Unknown app";
        case skynet::WorkspaceError::invalidEdge: return "Split edge required";
        case skynet::WorkspaceError::invalidRatio: return "Invalid split ratio";
        case skynet::WorkspaceError::invalidLauncherPosition: return "App position no longer exists";
        case skynet::WorkspaceError::invalidCollapse:
            return "Collapse requires a split workspace and a valid edge";
        case skynet::WorkspaceError::unknownCommand: return "Unknown workspace command";
        default: return "Workspace unavailable";
    }
}

const char* sk_workspace_error_kind(int code) {
    switch (static_cast<skynet::WorkspaceError>(code)) {
        case skynet::WorkspaceError::unknownApp: return "app";
        case skynet::WorkspaceError::unknownCommand: return "command";
        case skynet::WorkspaceError::unavailable: return "workspace";
        default: return "input";
    }
}

const char* sk_workspace_mode(const sk_workspace* workspace) {
    return workspace ? workspace->state.mode.c_str() : nullptr;
}
double sk_workspace_ratio(const sk_workspace* workspace) {
    return workspace ? workspace->state.ratio : 0;
}
size_t sk_workspace_pane_count(const sk_workspace* workspace) {
    return workspace ? workspace->state.panes.size() : 0;
}
const char* sk_workspace_pane(const sk_workspace* workspace, size_t index) {
    if (!workspace || index >= workspace->state.panes.size() ||
        !workspace->state.panes[index]) return nullptr;
    return workspace->state.panes[index]->c_str();
}
size_t sk_workspace_recent_count(const sk_workspace* workspace) {
    return workspace ? workspace->state.recent.size() : 0;
}
const char* sk_workspace_recent(const sk_workspace* workspace, size_t index) {
    if (!workspace || index >= workspace->state.recent.size()) return nullptr;
    return workspace->state.recent[index].c_str();
}
size_t sk_workspace_dock_count(const sk_workspace* workspace) {
    return workspace ? workspace->state.dock.size() : 0;
}
const char* sk_workspace_docked(const sk_workspace* workspace, size_t index) {
    if (!workspace || index >= workspace->state.dock.size()) return nullptr;
    return workspace->state.dock[index].c_str();
}
size_t sk_workspace_desktop_count(const sk_workspace* workspace) {
    return workspace ? workspace->state.desktop.size() : 0;
}
const char* sk_workspace_desktop(const sk_workspace* workspace, size_t index) {
    if (!workspace || index >= workspace->state.desktop.size()) return nullptr;
    return workspace->state.desktop[index].c_str();
}

}
