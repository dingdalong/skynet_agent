import XCTest

final class WorkspaceUITests: XCTestCase {
    private var app: XCUIApplication!
    private var dataRoot: URL!
    override func setUpWithError() throws {
        continueAfterFailure = false
        dataRoot = FileManager.default.temporaryDirectory.appendingPathComponent(
            "skynet-ui-\(UUID().uuidString)")
        if name.contains("Connection") {
            let host = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
                .deletingLastPathComponent()
            let client = host.deletingLastPathComponent().deletingLastPathComponent()
            let apps = dataRoot.appendingPathComponent("apps")
            try FileManager.default.createDirectory(at: apps, withIntermediateDirectories: true)
            try FileManager.default.copyItem(
                at: client.appendingPathComponent("test-artifacts/connection.skapp"),
                to: apps.appendingPathComponent("test.connection.skapp"))
            let document: [String: Any] = [
                "workspace": ["mode": "desktop", "panes": [], "ratio": 0.5, "recent": []],
                "appearance": "system", "wallpaper": "coast", "reduceMotion": false,
                "grants": ["test.connection": ["network"]],
            ]
            try JSONSerialization.data(withJSONObject: document).write(
                to: dataRoot.appendingPathComponent("host.json"))
        }
        app = XCUIApplication(bundleIdentifier: "app.skynet.agent")
        app.launchEnvironment["SKYNET_DATA_ROOT"] = dataRoot.path
        dismissPreviousCrashAlert()
        app.launch()
        app.activate()
        XCTAssertTrue(element("打开设置").waitForExistence(timeout: 15))
    }
    override func tearDownWithError() throws {
        if testRun?.failureCount ?? 0 > 0 { snapshot("failure") }
        app.terminate()
        if FileManager.default.fileExists(atPath: dataRoot.path) {
            try FileManager.default.removeItem(at: dataRoot)
        }
    }
    private func element(_ label: String) -> XCUIElement {
        app.descendants(matching: .any).matching(
            NSPredicate(format: "label == %@ OR title == %@ OR value == %@", label, label, label)
        ).firstMatch
    }
    private func dismissPreviousCrashAlert() {
        let notification = XCUIApplication(bundleIdentifier: "com.apple.UserNotificationCenter")
        for _ in 0..<8 {
            let alert = notification.dialogs.firstMatch
            guard alert.exists else { return }
            let message = alert.staticTexts.allElementsBoundByIndex.map {
                ($0.value as? String ?? "") + $0.label
            }.joined()
            guard message.contains("Skynet Agent"),
                message.contains("出现问题") || message.contains("意外退出")
            else { return }
            let dismiss = alert.buttons.matching(
                NSPredicate(
                    format: "label == %@ OR title == %@", "忽略", "忽略"
                )
            ).firstMatch
            if dismiss.exists {
                dismiss.click()
            } else {
                print("Unhandled Skynet crash alert: \(alert.debugDescription)")
                return
            }
        }
    }
    private func click(_ label: String) {
        let item = element(label)
        XCTAssertTrue(item.waitForExistence(timeout: 8), "Missing \(label)\n\(app.debugDescription)")
        item.click()
    }
    private func snapshot(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.windows.firstMatch.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
    private func assertSelected(_ label: String) {
        let item = element(label)
        XCTAssertTrue(item.waitForExistence(timeout: 5))
        XCTAssertTrue(
            item.isSelected || String(describing: item.value ?? "") == "1", "\(label) is not selected")
    }
    func testDesktopSettingsSplitOverviewAndPersistence() throws {
        snapshot("desktop")
        click("打开设置")
        XCTAssertTrue(element("外观模式").waitForExistence(timeout: 10))
        let window = app.windows.firstMatch
        let content = app.webViews.firstMatch
        XCTAssertEqual(content.frame.width, window.frame.width, accuracy: 2)
        XCTAssertEqual(content.frame.maxY, window.frame.maxY, accuracy: 2)
        click("深色")
        click("壁纸")
        click("暮色")
        click("动态效果")
        click("减少动态效果")
        snapshot("settings-dark")
        let grip = element("拖动设置进行分屏")
        grip.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
            .click(
                forDuration: 0.2,
                thenDragTo: window.coordinate(withNormalizedOffset: CGVector(dx: 0.06, dy: 0.18)))
        XCTAssertTrue(element("打开Agent").waitForExistence(timeout: 5), app.debugDescription)
        click("打开Agent")
        XCTAssertTrue(element("关闭Agent").waitForExistence(timeout: 5))
        XCTAssertTrue(element("关闭设置").exists)
        snapshot("split")
        let divider = element("调整分屏比例")
        divider.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
            .click(
                forDuration: 0.2,
                thenDragTo: window.coordinate(withNormalizedOffset: CGVector(dx: 0.34, dy: 0.55)))
        XCTAssertEqual(
            (divider.frame.midX - window.frame.minX) / window.frame.width, 1.0 / 3, accuracy: 0.015)
        element("拖动设置进行分屏").coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
            .click(
                forDuration: 0.2,
                thenDragTo: window.coordinate(withNormalizedOffset: CGVector(dx: 0.94, dy: 0.18)))
        XCTAssertTrue(element("关闭Agent").exists)
        XCTAssertTrue(element("关闭设置").exists)
        XCTAssertGreaterThan(element("拖动设置进行分屏").frame.midX, window.frame.midX)
        XCTAssertEqual(
            (divider.frame.midX - window.frame.minX) / window.frame.width, 2.0 / 3, accuracy: 0.015)
        divider.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
            .click(
                forDuration: 0.2,
                thenDragTo: window.coordinate(withNormalizedOffset: CGVector(dx: 0.34, dy: 0.55)))
        XCTAssertTrue(element("关闭Agent").exists)
        XCTAssertTrue(element("关闭设置").exists)
        XCTAssertEqual(
            (divider.frame.midX - window.frame.minX) / window.frame.width, 1.0 / 3, accuracy: 0.015)
        let originalSize = window.frame.size
        window.coordinate(withNormalizedOffset: CGVector(dx: 1, dy: 1)).withOffset(CGVector(dx: -2, dy: -2))
            .click(
                forDuration: 0.2,
                thenDragTo: window.coordinate(withNormalizedOffset: CGVector(dx: 0.52, dy: 1)))
        XCTAssertTrue(element("关闭Agent").waitForExistence(timeout: 5))
        XCTAssertLessThan(window.frame.width, 730)
        snapshot("narrow")
        window.coordinate(withNormalizedOffset: CGVector(dx: 1, dy: 1)).withOffset(CGVector(dx: -2, dy: -2))
            .click(
                forDuration: 0.2,
                thenDragTo: window.coordinate(withNormalizedOffset: .zero).withOffset(
                    CGVector(dx: originalSize.width - 2, dy: originalSize.height - 2)))
        XCTAssertTrue(element("关闭设置").waitForExistence(timeout: 5))
        XCTAssertTrue(element("调整分屏比例").exists)
        click("后台应用")
        XCTAssertTrue(element("继续Agent").waitForExistence(timeout: 5))
        click("继续Agent")
        XCTAssertTrue(element("关闭设置").waitForExistence(timeout: 5))
        app.typeKey("h", modifierFlags: [.command, .shift])
        XCTAssertTrue(element("打开设置").waitForExistence(timeout: 5))
        app.typeKey("e", modifierFlags: [.command])
        click("后台关闭Agent")
        click("后台关闭设置")
        click("后台空白区域返回桌面")
        XCTAssertTrue(element("打开设置").waitForExistence(timeout: 5))
        app.terminate()
        app.launch()
        click("打开设置")
        click("壁纸")
        assertSelected("暮色")
        click("外观")
        assertSelected("深色")
        click("动态效果")
        XCTAssertTrue(app.switches.firstMatch.waitForExistence(timeout: 5))
        XCTAssertEqual((app.switches.firstMatch.value as? NSNumber)?.boolValue, true)
        snapshot("relaunched")
    }

    func testDividerCollapseRetainsBackgroundApps() throws {
        click("打开设置")
        let window = app.windows.firstMatch
        element("拖动设置进行分屏").coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
            .click(
                forDuration: 0.2,
                thenDragTo: window.coordinate(withNormalizedOffset: CGVector(dx: 0.06, dy: 0.18)))
        click("打开Agent")
        let divider = element("调整分屏比例")
        divider.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
            .click(
                forDuration: 0.2,
                thenDragTo: window.coordinate(withNormalizedOffset: CGVector(dx: 0.34, dy: 0.55)))
        XCTAssertEqual(
            (divider.frame.midX - window.frame.minX) / window.frame.width, 1.0 / 3, accuracy: 0.015)
        divider.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
            .click(
                forDuration: 0.2,
                thenDragTo: window.coordinate(withNormalizedOffset: CGVector(dx: 0.2, dy: 0.55)))
        XCTAssertTrue(element("关闭Agent").waitForExistence(timeout: 5))
        XCTAssertEqual(app.webViews.firstMatch.frame.width, window.frame.width, accuracy: 2)
        click("后台应用")
        XCTAssertTrue(element("继续设置").waitForExistence(timeout: 5))
        click("继续设置")
        element("拖动设置进行分屏").coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
            .click(
                forDuration: 0.2,
                thenDragTo: window.coordinate(withNormalizedOffset: CGVector(dx: 0.94, dy: 0.18)))
        element("调整分屏比例").coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
            .click(
                forDuration: 0.2,
                thenDragTo: window.coordinate(withNormalizedOffset: CGVector(dx: 0.8, dy: 0.55)))
        XCTAssertTrue(element("打开设置").waitForExistence(timeout: 5))
        click("后台应用")
        XCTAssertTrue(element("继续设置").waitForExistence(timeout: 5))
        XCTAssertTrue(element("继续Agent").exists)
        snapshot("collapsed-apps-in-background")
    }

    func testInstallGeneratedApplicationAndPreserveState() throws {
        click("打开设置")
        click("应用管理")
        click("安装应用")
        let host = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
            .deletingLastPathComponent()
        let client = host.deletingLastPathComponent().deletingLastPathComponent()
        let panel = app.windows["open-panel"]
        panel.typeKey("g", modifierFlags: [.command, .shift])
        let path = app.textFields["PathTextField"]
        XCTAssertTrue(path.waitForExistence(timeout: 5))
        path.click()
        path.typeKey("a", modifierFlags: [.command])
        let packagePath = client.appendingPathComponent("test-artifacts/generated.skapp").path
        path.typeText(packagePath)
        // Commit the text, then wait for the resolved destination before confirming.
        path.typeKey(.return, modifierFlags: [])
        let destination = app.otherElements[packagePath]
        XCTAssertTrue(destination.waitForExistence(timeout: 5))
        path.typeKey(.return, modifierFlags: [])
        XCTAssertTrue(app.sheets["GoToWindow"].waitForNonExistence(timeout: 5))
        snapshot("install-picker")
        click("选择应用")
        click("安装")
        XCTAssertTrue(element("移除test.generated").waitForExistence(timeout: 8))
        click("返回桌面")
        click("打开test.generated")
        click("Count 0")
        XCTAssertTrue(element("Count 1").waitForExistence(timeout: 5))
        app.typeKey("r", modifierFlags: [.command, .shift])
        click("Count 1")
        XCTAssertTrue(element("Count 2").waitForExistence(timeout: 5))
        snapshot("installed-generated-app")
        app.terminate()
        app.launch()
        click("Count 2")
        XCTAssertTrue(element("Count 3").waitForExistence(timeout: 5))
    }

    func testConnectionSurvivesEntirePresentationReload() throws {
        click("打开连接测试")
        click("连接测试服务")
        let native = app.staticTexts.matching(
            NSPredicate(format: "value BEGINSWITH %@ AND NOT value CONTAINS %@", "原生连接：", "等待")
        ).firstMatch
        XCTAssertTrue(native.waitForExistence(timeout: 8))
        click("发送测试消息")
        let physical = app.staticTexts.matching(
            NSPredicate(format: "value BEGINSWITH %@ AND NOT value CONTAINS %@", "物理连接：", "等待")
        ).firstMatch
        XCTAssertTrue(physical.waitForExistence(timeout: 8))
        let nativeId = native.value as? String
        let physicalId = physical.value as? String
        let view = app.staticTexts.matching(NSPredicate(format: "value BEGINSWITH %@", "界面实例：")).firstMatch
        let oldView = view.value as? String
        app.typeKey("r", modifierFlags: [.command, .shift])
        let refreshed = NSPredicate { _, _ in
            view.exists && view.value as? String != oldView
        }
        expectation(for: refreshed, evaluatedWith: nil)
        waitForExpectations(timeout: 10)
        XCTAssertEqual(native.value as? String, nativeId)
        click("发送测试消息")
        XCTAssertTrue(element("接收消息：2").waitForExistence(timeout: 8))
        XCTAssertEqual(physical.value as? String, physicalId)
        snapshot("connection-after-reload")
    }
}
