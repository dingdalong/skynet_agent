#pragma once

#include <optional>
#include <string>
#include <unordered_set>
#include <vector>

namespace skynet {

struct Workspace {
    std::string mode = "desktop";
    std::vector<std::optional<std::string>> panes;
    double ratio = 0.5;
    std::vector<std::string> recent;
};

struct WorkspaceCommand {
    std::string name;
    std::string appId;
    std::string edge;
    std::optional<double> ratio;
};

enum class WorkspaceError {
    none,
    unknownApp,
    invalidEdge,
    invalidRatio,
    invalidCollapse,
    unknownCommand,
    unavailable
};

// Pure transition: reject without modifying state; the owner persists the
// successful candidate before publishing it or starting any effects.
WorkspaceError applyWorkspace(
    Workspace& state, const WorkspaceCommand& command,
    const std::unordered_set<std::string>& knownApps);

}  // namespace skynet
