#include "workspace.hpp"

#include <algorithm>
#include <cmath>
#include <utility>

namespace skynet {

WorkspaceError applyWorkspace(
    Workspace& state, const WorkspaceCommand& command,
    const std::unordered_set<std::string>& knownApps) {
    const auto& name = command.name;
    const auto& id = command.appId;
    if ((name == "open" || name == "close" || name == "split" || name == "restore" ||
         name == "dock" || name == "undock") &&
        knownApps.count(id) == 0) {
        return WorkspaceError::unknownApp;
    }

    auto next = state;
    if (name == "dock" || name == "undock") {
        for (auto* list : {&next.desktop, &next.dock}) {
            list->erase(std::remove(list->begin(), list->end(), id), list->end());
        }
        auto& list = name == "dock" ? next.dock : next.desktop;
        const auto position = std::find(list.begin(), list.end(), command.beforeAppId);
        if (!command.beforeAppId.empty() && position == list.end()) {
            return WorkspaceError::invalidLauncherPosition;
        }
        list.insert(position, id);
    } else if (name == "home") {
        next.mode = "desktop";
    } else if (name == "overview") {
        next.mode = "overview";
    } else if (name == "open" || name == "restore") {
        const auto existing = std::find(next.panes.begin(), next.panes.end(), id);
        const auto empty = std::find(next.panes.begin(), next.panes.end(), std::nullopt);
        if (name == "open" && next.mode == "apps" && next.panes.size() == 2 &&
            empty != next.panes.end() && existing == next.panes.end()) {
            *empty = id;
        } else if (!(name == "restore" && existing != next.panes.end())) {
            next.panes = {id};
        }
        next.recent.erase(
            std::remove(next.recent.begin(), next.recent.end(), id), next.recent.end());
        next.recent.insert(next.recent.begin(), id);
        next.mode = "apps";
    } else if (name == "close") {
        next.recent.erase(
            std::remove(next.recent.begin(), next.recent.end(), id), next.recent.end());
        for (auto& pane : next.panes) {
            if (pane == id) pane.reset();
        }
        if (std::all_of(next.panes.begin(), next.panes.end(),
                        [](const auto& pane) { return !pane; })) {
            next.panes.clear();
            if (next.mode == "apps") next.mode = "desktop";
        }
    } else if (name == "split") {
        if (command.edge != "left" && command.edge != "right") {
            return WorkspaceError::invalidEdge;
        }
        const auto destination = command.edge == "left" ? 0U : 1U;
        const auto origin = std::find(next.panes.begin(), next.panes.end(), id);
        if (next.panes.size() == 2 && origin != next.panes.end()) {
            if (static_cast<std::size_t>(origin - next.panes.begin()) != destination) {
                std::swap(next.panes[0], next.panes[1]);
                next.ratio = std::clamp(1 - next.ratio, 1.0 / 3, 2.0 / 3);
            }
        } else {
            next.panes = {std::nullopt, std::nullopt};
            next.panes[destination] = id;
            next.ratio = 0.5;
        }
        next.mode = "apps";
    } else if (name == "resize") {
        if (!command.ratio || !std::isfinite(*command.ratio) ||
            *command.ratio < 1.0 / 3 || *command.ratio > 2.0 / 3) {
            return WorkspaceError::invalidRatio;
        }
        next.ratio = *command.ratio;
    } else if (name == "collapse") {
        if (next.mode != "apps" || next.panes.size() != 2 ||
            (command.edge != "left" && command.edge != "right")) {
            return WorkspaceError::invalidCollapse;
        }
        const auto remaining = next.panes[command.edge == "left" ? 1 : 0];
        next.panes.clear();
        if (remaining) next.panes.push_back(remaining);
        next.mode = remaining ? "apps" : "desktop";
        next.ratio = 0.5;
    } else {
        return WorkspaceError::unknownCommand;
    }
    state = std::move(next);
    return WorkspaceError::none;
}

}  // namespace skynet
