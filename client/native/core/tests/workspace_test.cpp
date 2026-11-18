#include "skynet_workspace.h"
#include "workspace.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <limits>

namespace {
void check(bool value, const char* message) {
    if (!value) {
        std::cerr << message << '\n';
        std::exit(1);
    }
}
}

int main() {
    using namespace skynet;
    // Keep UTF-8 identity coverage independent of the compiler's source code page.
    constexpr auto unicodeId = u8"\u6d4b\u8bd5";
    const std::unordered_set<std::string> apps{"settings", "agent", unicodeId};
    Workspace state;
    const auto apply = [&](WorkspaceCommand command) {
        return applyWorkspace(state, command, apps);
    };
    check(apply({"open", "settings", "", {}}) == WorkspaceError::none, "open");
    check(apply({"split", "settings", "left", {}}) == WorkspaceError::none, "split");
    check(apply({"resize", "", "", 1.0 / 3}) == WorkspaceError::none, "resize");
    check(apply({"open", "agent", "", {}}) == WorkspaceError::none, "fill desktop");
    check(state.panes[0] == "settings" && state.panes[1] == "agent", "two apps");
    check(apply({"split", "settings", "right", {}}) == WorkspaceError::none, "swap");
    check(state.panes[0] == "agent" && state.panes[1] == "settings" &&
          std::abs(state.ratio - 2.0 / 3) < 0.000001, "preserve widths");
    const auto before = state;
    for (const auto ratio : {0.0, 0.32, 0.68, 1.0, std::numeric_limits<double>::quiet_NaN()}) {
        check(apply({"resize", "", "", ratio}) == WorkspaceError::invalidRatio, "reject ratio");
        check(state.panes == before.panes && state.ratio == before.ratio, "atomic rejection");
    }
    check(apply({"resize", "", "", {}}) == WorkspaceError::invalidRatio, "missing ratio");
    check(apply({"open", "missing", "", {}}) == WorkspaceError::unknownApp, "unknown app");
    check(apply({"split", "agent", "middle", {}}) == WorkspaceError::invalidEdge, "invalid edge");
    check(apply({"unknown", "", "", {}}) == WorkspaceError::unknownCommand, "unknown command");
    check(apply({"overview", "", "", {}}) == WorkspaceError::none, "overview");
    check(apply({"restore", "agent", "", {}}) == WorkspaceError::none &&
          state.panes == before.panes, "restore composition");
    check(apply({"collapse", "", "right", {}}) == WorkspaceError::none &&
          state.panes.size() == 1 && state.panes[0] == "agent" &&
          state.recent == before.recent, "collapse retains running apps");
    check(apply({"collapse", "", "left", {}}) == WorkspaceError::invalidCollapse, "inactive collapse");
    check(apply({"overview", "", "", {}}) == WorkspaceError::none, "overview again");
    check(apply({"close", "agent", "", {}}) == WorkspaceError::none &&
          state.mode == "overview" && state.panes.empty(), "empty overview");
    check(apply({"home", "", "", {}}) == WorkspaceError::none && state.mode == "desktop", "home");
    check(apply({"open", "settings", "", {}}) == WorkspaceError::none, "open for desktop collapse");
    check(apply({"split", "settings", "left", {}}) == WorkspaceError::none, "desktop split");
    check(apply({"collapse", "", "left", {}}) == WorkspaceError::none &&
          state.mode == "desktop" && state.panes.empty(), "collapse into desktop");

    auto* handle = sk_workspace_create("apps", 0.5);
    check(handle != nullptr, "allocate C handle");
    check(sk_workspace_allow_app(handle, unicodeId) == 0, "UTF-8 identity");
    check(sk_workspace_add_pane(handle, nullptr) == 0, "null desktop");
    check(sk_workspace_add_pane(handle, unicodeId) == 0, "append app");
    check(sk_workspace_add_recent(handle, unicodeId) == 0, "append recent");
    check(sk_workspace_apply(handle, "split", unicodeId, "left", 0, 0, "") == 0, "C transition");
    check(sk_workspace_add_docked(handle, "agent") == 0 &&
          sk_workspace_apply(handle, "dock", unicodeId, "", 0, 0, "agent") == 0 &&
          sk_workspace_dock_count(handle) == 2 &&
          std::string(sk_workspace_docked(handle, 0)) == unicodeId, "insert before a dock item");
    check(sk_workspace_apply(handle, "dock", unicodeId, "", 0, 0, "") == 0 &&
          sk_workspace_dock_count(handle) == 2 &&
          std::string(sk_workspace_docked(handle, 1)) == unicodeId, "reorder without duplication");
    check(sk_workspace_apply(handle, "dock", unicodeId, "", 0, 0, "missing") != 0 &&
          sk_workspace_apply(handle, "dock", "missing", "", 0, 0, "") != 0 &&
          sk_workspace_dock_count(handle) == 2, "reject invalid drops atomically");
    check(sk_workspace_apply(handle, "undock", unicodeId, "", 0, 0, "") == 0 &&
          sk_workspace_dock_count(handle) == 1, "return to desktop without closing");
    check(std::string(sk_workspace_pane(handle, 0)) == unicodeId &&
          sk_workspace_pane(handle, 1) == nullptr, "C snapshot");
    check(sk_workspace_recent_count(handle) == 1 &&
          std::string(sk_workspace_recent(handle, 0)) == unicodeId, "C recent");
    check(sk_workspace_pane(handle, 99) == nullptr, "C bounds");
    sk_workspace_destroy(handle);
    check(sk_workspace_apply(nullptr, "home", "", "", 0, 0, "") != 0, "null handle");
    std::cout << "Workspace transitions and C ABI passed\n";
}
