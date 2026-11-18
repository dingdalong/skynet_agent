import XCTest

@testable import SkynetHostCore

final class WorkspaceTests: XCTestCase {
    func testDesktopInsertionRecoveryAndCatalogChanges() throws {
        var workspace = Workspace()
        let apps: Set<String> = ["agent", "settings", "notes"]
        workspace.reconcileLaunchers(knownApps: apps)
        XCTAssertEqual(workspace.desktop, ["notes", "settings"])
        try workspace.apply("undock", ["appId": "settings", "beforeAppId": "notes"], knownApps: apps)
        try workspace.apply("undock", ["appId": "agent", "beforeAppId": "notes"], knownApps: apps)
        XCTAssertThrowsError(
            try workspace.apply("dock", ["appId": "settings", "beforeAppId": "notes"], knownApps: apps))
        workspace = try JSONDecoder().decode(Workspace.self, from: JSONEncoder().encode(workspace))
        XCTAssertEqual(workspace.desktop, ["settings", "agent", "notes"])
        XCTAssertEqual(workspace.dock, [])
        workspace.reconcileLaunchers(knownApps: ["agent", "settings", "calendar"])
        XCTAssertEqual(workspace.desktop, ["settings", "agent", "calendar"])
    }

    func testDockOrderSurvivesRelaunchIncludingEmptyDock() throws {
        let apps: Set<String> = ["settings", "agent"]
        var workspace = Workspace()
        XCTAssertEqual(workspace.dock, ["agent"])
        try workspace.apply("dock", ["appId": "settings", "beforeAppId": "agent"], knownApps: apps)
        workspace = try JSONDecoder().decode(Workspace.self, from: JSONEncoder().encode(workspace))
        XCTAssertEqual(workspace.dock, ["settings", "agent"])
        for id in workspace.dock { try workspace.apply("undock", ["appId": id], knownApps: apps) }
        workspace = try JSONDecoder().decode(Workspace.self, from: JSONEncoder().encode(workspace))
        XCTAssertEqual(workspace.dock, [])
        XCTAssertEqual(workspace.mode, "desktop")
        XCTAssertTrue(workspace.recent.isEmpty)
    }

    func testSplitDesktopLaunchAndRestore() throws {
        var workspace = Workspace()
        let apps: Set<String> = ["settings", "agent"]
        try workspace.apply("open", ["appId": "settings"], knownApps: apps)
        try workspace.apply("split", ["appId": "settings", "edge": "left"], knownApps: apps)
        XCTAssertEqual(workspace.panes, ["settings", nil])
        try workspace.apply("resize", ["ratio": 1.0 / 3.0], knownApps: apps)
        try workspace.apply("open", ["appId": "agent"], knownApps: apps)
        XCTAssertEqual(workspace.panes, ["settings", "agent"])
        try workspace.apply("overview", [:], knownApps: apps)
        try workspace.apply("restore", ["appId": "agent"], knownApps: apps)
        XCTAssertEqual(workspace.panes, ["settings", "agent"])
        XCTAssertEqual(workspace.ratio, 1.0 / 3.0)
        try workspace.apply("close", ["appId": "settings"], knownApps: apps)
        XCTAssertEqual(workspace.panes, [nil, "agent"])
        try workspace.apply("home", [:], knownApps: apps)
        XCTAssertEqual(workspace.mode, "desktop")
    }

    func testRejectUnknownAppsAndInvalidRatios() throws {
        var workspace = Workspace()
        XCTAssertThrowsError(try workspace.apply("open", ["appId": "missing"], knownApps: []))
        XCTAssertThrowsError(try workspace.apply("resize", ["ratio": Double.nan], knownApps: []))
        XCTAssertThrowsError(try workspace.apply("resize", ["ratio": 2], knownApps: []))
        for ratio in [0.0, 0.32, 0.68, 1.0] {
            XCTAssertThrowsError(try workspace.apply("resize", ["ratio": ratio], knownApps: []))
        }
        for ratio in [1.0 / 3, 0.5, 2.0 / 3] {
            try workspace.apply("resize", ["ratio": ratio], knownApps: [])
            XCTAssertEqual(workspace.ratio, ratio)
        }
    }

    func testSplitSwapsKeepBothAppsAndTheirWidths() throws {
        var workspace = Workspace()
        let apps: Set<String> = ["settings", "agent"]
        try workspace.apply("open", ["appId": "settings"], knownApps: apps)
        try workspace.apply("split", ["appId": "settings", "edge": "left"], knownApps: apps)
        try workspace.apply("resize", ["ratio": 1.0 / 3], knownApps: apps)
        try workspace.apply("open", ["appId": "agent"], knownApps: apps)
        try workspace.apply("split", ["appId": "settings", "edge": "right"], knownApps: apps)
        XCTAssertEqual(workspace.panes, ["agent", "settings"])
        XCTAssertEqual(workspace.ratio, 2.0 / 3)
        try workspace.apply("split", ["appId": "agent", "edge": "left"], knownApps: apps)
        XCTAssertEqual(workspace.panes, ["agent", "settings"])
        try workspace.apply("split", ["appId": "agent", "edge": "right"], knownApps: apps)
        XCTAssertEqual(workspace.panes, ["settings", "agent"])
        XCTAssertEqual(workspace.ratio, 1.0 / 3, accuracy: 0.000001)
    }

    func testEmptyOverviewStaysDismissible() throws {
        var workspace = Workspace()
        let apps: Set<String> = ["agent"]
        try workspace.apply("open", ["appId": "agent"], knownApps: apps)
        try workspace.apply("overview", [:], knownApps: apps)
        try workspace.apply("close", ["appId": "agent"], knownApps: apps)
        XCTAssertEqual(workspace.mode, "overview")
        XCTAssertTrue(workspace.recent.isEmpty)
        try workspace.apply("home", [:], knownApps: apps)
        XCTAssertEqual(workspace.mode, "desktop")
    }

    func testCollapseKeepsTheOtherPaneAndBothAppsInBackground() throws {
        let apps: Set<String> = ["settings", "agent"]
        for panes: [String?] in [["settings", "agent"], ["settings", nil], [nil, "agent"]] {
            for edge in ["left", "right"] {
                var workspace = Workspace()
                workspace.mode = "apps"
                workspace.panes = panes
                workspace.ratio = edge == "left" ? 1.0 / 3 : 2.0 / 3
                workspace.recent = ["agent", "settings"]
                let remaining = panes[edge == "left" ? 1 : 0]
                try workspace.apply("collapse", ["edge": edge], knownApps: apps)
                XCTAssertEqual(workspace.panes, remaining.map { [$0] } ?? [])
                XCTAssertEqual(workspace.mode, remaining == nil ? "desktop" : "apps")
                XCTAssertEqual(workspace.recent, ["agent", "settings"])
                XCTAssertEqual(workspace.ratio, 0.5)
            }
        }
    }

    func testCollapseRejectsInvalidEdgeAndInactiveSplit() throws {
        let apps: Set<String> = ["settings", "agent"]
        var workspace = Workspace()
        workspace.mode = "apps"
        workspace.panes = ["settings", "agent"]
        for input: [String: Any] in [[:], ["edge": "middle"], ["edge": 1]] {
            XCTAssertThrowsError(try workspace.apply("collapse", input, knownApps: apps))
            XCTAssertEqual(workspace.panes, ["settings", "agent"])
        }
        for mode in ["desktop", "overview"] {
            workspace.mode = mode
            XCTAssertThrowsError(try workspace.apply("collapse", ["edge": "left"], knownApps: apps))
            XCTAssertEqual(workspace.mode, mode)
            XCTAssertEqual(workspace.panes, ["settings", "agent"])
        }
        workspace.mode = "apps"
        for panes: [String?] in [[], ["settings"]] {
            workspace.panes = panes
            XCTAssertThrowsError(try workspace.apply("collapse", ["edge": "right"], knownApps: apps))
            XCTAssertEqual(workspace.panes, panes)
        }
    }

    func testActionSchemasAreClosedAndValidateValues() throws {
        let schema: [String: Any] = [
            "type": "object", "properties": ["name": ["type": "string", "maxLength": 8]],
            "required": ["name"], "additionalProperties": false,
        ]
        try Schema.check(schema)
        try Schema.validate(["name": "Agent"], against: schema)
        XCTAssertThrowsError(try Schema.validate(["name": "Agent", "secret": 1], against: schema))
        XCTAssertThrowsError(try Schema.validate(["name": true], against: schema))
        XCTAssertThrowsError(try Schema.check(["type": "string", "pattern": ".*"]))
        for malformed: [String: Any] in [
            ["type": "object", "additionalProperties": false, "required": ["missing"]],
            ["type": "object", "additionalProperties": false, "properties": "invalid"],
            ["type": "array", "items": true],
            ["type": "string", "maxLength": true],
            ["type": "string", "minLength": 9, "maxLength": 8],
            ["type": "integer", "minimum": "0"],
            ["type": "boolean", "minimum": 0],
            ["type": "integer", "enum": ["wrong"]],
        ] {
            XCTAssertThrowsError(try Schema.check(malformed), "\(malformed)")
        }
    }
}
