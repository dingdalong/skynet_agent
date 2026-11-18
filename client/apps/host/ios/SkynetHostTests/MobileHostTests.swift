import SkynetHostCore
import UIKit
import WebKit
import XCTest

@testable import SkynetHost

/// Hosted simulator integration tests. These use no UI automation or synthetic
/// mouse/keyboard events; actual Simulator acceptance is a separate step.
@MainActor
final class MobileHostTests: XCTestCase {
    func testRetainedApplicationStaysHiddenAfterReturningHome() async throws {
        let core = HostServices.core
        for delay: UInt64 in [350_000_000, 10_000_000, 0] {
            _ = try await workspace(core, "open", ["appId": "agent"])
            let scene = try await view("app-scene-agent")
            try await eventually("Agent scene did not become visible") {
                self.opacity(scene) > 0.01 && self.findView("workspace-desktop") == nil
            }
            try await Task.sleep(nanoseconds: delay)
            _ = try await workspace(core, "home")
            _ = try await view("workspace-desktop")
            for _ in 0..<35 {
                await displayFrame()
                XCTAssertEqual(
                    opacity(scene), 0, accuracy: 0.001,
                    "Desktop and retained Agent must never compose together after home")
            }
        }
    }

    func testNativeAnimationOutputCannotRevealRetainedApplication() async throws {
        let core = HostServices.core
        _ = try await workspace(core, "open", ["appId": "agent"])
        let scene = try await view("app-scene-agent")
        let transition = try await view("app-transition-agent")
        try await eventually("Agent scene did not become visible") {
            self.opacity(scene) > 0.01 && self.findView("workspace-desktop") == nil
        }
        var retainedWeb: WKWebView?
        try await eventually("Agent WebView did not mount") {
            retainedWeb = self.descendant(scene) { $0 as? WKWebView }
            return retainedWeb != nil
        }
        for mode in ["home", "overview"] {
            _ = try await workspace(core, mode)
            try await eventually("Retained scene did not hide") { self.opacity(scene) == 0 }
            // Replay an animation's late native output, independent of the
            // scheduler or OS version that originally produced the race.
            transition.layer.opacity = 1
            let fade = CABasicAnimation(keyPath: "opacity")
            fade.fromValue = 1
            fade.toValue = 1
            fade.duration = 0.12
            transition.layer.add(fade, forKey: "test.late-frame")
            for _ in 0..<20 {
                await displayFrame()
                XCTAssertEqual(opacity(transition), 0, accuracy: 0.001)
                XCTAssertTrue(
                    hasHiddenAncestor(transition, through: scene),
                    "Retained content needs a native hidden ancestor, independent of animation opacity")
                XCTAssertNil(scene.hitTest(CGPoint(x: 20, y: 100), with: nil))
                XCTAssertTrue(scene.accessibilityElementsHidden)
                XCTAssertTrue(retainedWeb === descendant(scene) { $0 as? WKWebView })
            }
            _ = try await workspace(core, "open", ["appId": "agent"])
            try await eventually("Agent did not resume") { self.opacity(transition) > 0.01 }
            XCTAssertFalse(hasHiddenAncestor(transition, through: scene))
            XCTAssertTrue(retainedWeb === descendant(scene) { $0 as? WKWebView })
        }
        _ = try await workspace(core, "home")
    }

    private func descendant<T>(_ view: UIView, _ match: (UIView) -> T?) -> T? {
        if let result = match(view) { return result }
        for child in view.subviews {
            if let result = descendant(child, match) { return result }
        }
        return nil
    }

    private func workspace(_ core: HostCore, _ name: String, _ input: [String: Any] = [:])
        async throws -> [String: Any]
    {
        try await withCheckedThrowingContinuation { continuation in
            core.workspace(name, input: input) { continuation.resume(with: $0) }
        }
    }

    private func view(_ identifier: String) async throws -> UIView {
        var found: UIView?
        try await eventually("Missing native view: \(identifier)") {
            found = self.findView(identifier)
            return found != nil
        }
        return try XCTUnwrap(found)
    }

    private func findView(_ identifier: String) -> UIView? {
        for window in UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene })
            .flatMap(\.windows)
        {
            if let match = descendant(window, { $0.accessibilityIdentifier == identifier ? $0 : nil }) {
                return match
            }
        }
        return nil
    }

    private func displayFrame() async {
        await withCheckedContinuation { continuation in
            let frame = DisplayFrame { continuation.resume() }
            frame.start()
        }
    }

    private func opacity(_ view: UIView) -> Float {
        var value: Float = 1
        var ancestor: UIView? = view
        while let current = ancestor {
            if current.isHidden { return 0 }
            value *= current.layer.presentation()?.opacity ?? current.layer.opacity
            ancestor = current.superview
        }
        return value
    }

    private func hasHiddenAncestor(_ view: UIView, through boundary: UIView) -> Bool {
        var ancestor: UIView? = view
        while let current = ancestor {
            if current.isHidden { return true }
            if current === boundary { return false }
            ancestor = current.superview
        }
        return false
    }

    private func eventually(_ message: String, _ condition: () -> Bool) async throws {
        for _ in 0..<150 {
            if condition() { return }
            try await Task.sleep(nanoseconds: 20_000_000)
        }
        XCTFail(message)
        throw NSError(domain: "WorkspacePresentation", code: 1)
    }

    func testPreferencesAndBuiltinStateSurviveDetachAndSystemSuspension() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let builtins = Bundle.main.resourceURL!.appendingPathComponent("builtins")
        let core = try HostCore(dataRoot: root, builtins: builtins)
        defer {
            core.shutdown()
            try? FileManager.default.removeItem(at: root)
        }
        let lease = core.attach(appId: "settings") { _ in }
        try await ready(core, lease)
        _ = try await request(
            core, lease, "command", ["name": "navigate", "payload": ["section": "wallpaper"]])
        _ = try await request(core, lease, "preferences.set", ["appearance": "dark"])
        let saved = try await request(core, lease, "snapshot")
        XCTAssertEqual(object(saved["state"])["section"] as? String, "wallpaper")
        let generation = saved["generation"] as! Int
        core.detach(lease)
        let reattached = core.attach(appId: "settings") { _ in }
        try await ready(core, reattached)
        let reloaded = try await request(core, reattached, "snapshot")
        XCTAssertEqual(reloaded["generation"] as? Int, generation)
        XCTAssertEqual(object(reloaded["preferences"])["appearance"] as? String, "dark")
        await withCheckedContinuation { continuation in core.setBackgrounded(true) { continuation.resume() } }
        await withCheckedContinuation { continuation in core.setBackgrounded(false) { continuation.resume() }
        }
        try await ready(core, reattached)
        let resumed = try await request(core, reattached, "snapshot")
        XCTAssertGreaterThan(resumed["generation"] as! Int, generation)
        XCTAssertEqual(object(resumed["state"])["section"] as? String, "wallpaper")
        XCTAssertEqual(object(resumed["preferences"])["appearance"] as? String, "dark")
        core.detach(reattached)
    }

    func testMobileAuthorityAndAgentBootstrap() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let builtins = Bundle.main.resourceURL!.appendingPathComponent("builtins")
        let core = try HostCore(dataRoot: root, builtins: builtins)
        defer {
            core.shutdown()
            try? FileManager.default.removeItem(at: root)
        }
        let lease = core.attach(appId: "agent") { _ in }
        try await ready(core, lease)
        for _ in 0..<60 {
            let snapshot = try await request(core, lease, "snapshot")
            let state = object(snapshot["state"])
            if let local = state["local"] as? [String: Any] {
                XCTAssertEqual(state["supportsLocal"] as? Bool, false)
                XCTAssertEqual(local["canExecute"] as? Bool, false)
                XCTAssertEqual((local["workspaces"] as? [Any])?.count, 0)
                XCTAssertEqual(object(snapshot["capabilities"])["runtimeIsolation"] as? String, "in-process")
                do {
                    _ = try await request(core, lease, "agent.directory.choose")
                    XCTFail("Mobile must reject local directory authority")
                } catch {}
                core.detach(lease)
                return
            }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("Mobile context did not load")
    }

    func testRealWebKitLoadsPackagedSettingsAndUsesMobileControls() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let core = try HostCore(
            dataRoot: root, builtins: Bundle.main.resourceURL!.appendingPathComponent("builtins"))
        let lease = core.attach(appId: "settings") { _ in }
        defer {
            core.detach(lease)
            core.shutdown()
            try? FileManager.default.removeItem(at: root)
        }
        try await ready(core, lease)
        let snapshot = try await request(core, lease, "snapshot")
        let entry = await withCheckedContinuation { continuation in
            core.package(appId: "settings") { continuation.resume(returning: $0) }
        }
        let configuration = WKWebViewConfiguration()
        let handler = ReadyHandler()
        configuration.userContentController.add(handler, name: "skynet")
        configuration.websiteDataStore = .nonPersistent()
        configuration.setURLSchemeHandler(AppAssets(entry: try XCTUnwrap(entry)), forURLScheme: "skynet-app")
        configuration.userContentController.addUserScript(
            try AppPresentation.bootstrap(snapshot: snapshot, presentationId: UUID().uuidString))
        let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 393, height: 700), configuration: configuration)
        handler.web = web
        web.load(URLRequest(url: URL(string: "skynet-app://settings/ui/index.html")!))
        for _ in 0..<100 {
            if (try? await web.evaluateJavaScript("document.body?.innerText.includes('外观模式')")) as? Bool
                == true
            {
                let overflow =
                    try await web.evaluateJavaScript("document.documentElement.scrollWidth>393") as? Bool
                XCTAssertEqual(overflow, false)
                let height =
                    try await web.evaluateJavaScript(
                        "document.querySelector('nav button').getBoundingClientRect().height")
                    as? Double
                XCTAssertGreaterThanOrEqual(try XCTUnwrap(height), 44)
                web.stopLoading()
                configuration.userContentController.removeScriptMessageHandler(forName: "skynet")
                return
            }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        XCTFail("Packaged Settings did not render in iOS WebKit")
    }

    func testAgentResponsiveViewportKeepsContentSeparateAndInputReachable() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let core = try HostCore(
            dataRoot: root, builtins: Bundle.main.resourceURL!.appendingPathComponent("builtins"))
        let lease = core.attach(appId: "agent") { _ in }
        defer {
            core.detach(lease)
            core.shutdown()
            try? FileManager.default.removeItem(at: root)
        }
        try await ready(core, lease)
        let snapshot = try await request(core, lease, "snapshot")
        let entry = await withCheckedContinuation { continuation in
            core.package(appId: "agent") { continuation.resume(returning: $0) }
        }
        let configuration = WKWebViewConfiguration()
        let handler = ReadyHandler()
        configuration.userContentController.add(handler, name: "skynet")
        configuration.websiteDataStore = .nonPersistent()
        configuration.setURLSchemeHandler(AppAssets(entry: try XCTUnwrap(entry)), forURLScheme: "skynet-app")
        configuration.userContentController.addUserScript(
            try AppPresentation.bootstrap(snapshot: snapshot, presentationId: UUID().uuidString))
        let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 393, height: 350), configuration: configuration)
        handler.web = web
        defer {
            web.stopLoading()
            configuration.userContentController.removeScriptMessageHandler(forName: "skynet")
        }
        web.load(URLRequest(url: URL(string: "skynet-app://agent/ui/index.html")!))
        for _ in 0..<100 {
            if (try? await web.evaluateJavaScript("!!document.querySelector('#agent-message')")) as? Bool
                == true
            {
                for size in [
                    CGSize(width: 320, height: 568),
                    CGSize(width: 393, height: 350),
                    CGSize(width: 700, height: 180),
                    CGSize(width: 759, height: 420),
                    CGSize(width: 760, height: 420),
                    CGSize(width: 1024, height: 768),
                ] {
                    web.frame.size = size
                    for _ in 0..<40 {
                        let width = try await web.evaluateJavaScript("innerWidth") as? Double
                        if width == size.width { break }
                        try await Task.sleep(nanoseconds: 50_000_000)
                    }
                    let result =
                        try await web.evaluateJavaScript(
                            """
                            (() => {
                                const input = document.querySelector('#agent-message [contenteditable]');
                                const form = input.closest('form');
                                const pane = document.querySelector('.agent-chat');
                                const empty = Array.from(pane.querySelectorAll('h1,h2,h3,h4')).find(heading => heading.textContent.includes('Agent'));
                                const event = new KeyboardEvent('keydown', {key:'Enter', bubbles:true, cancelable:true});
                                input.dispatchEvent(event);
                                pane.scrollTop = pane.scrollHeight;
                                const formRect = form.getBoundingClientRect();
                                return {
                                    coarse: matchMedia('(pointer:coarse)').matches,
                                    enterPrevented: event.defaultPrevented,
                                    separate: empty.getBoundingClientRect().bottom <= formRect.top + 1,
                                    scrollable: getComputedStyle(pane).overflowY === 'auto',
                                    overflow: document.documentElement.scrollWidth > innerWidth,
                                    inputReachable: formRect.bottom <= innerHeight + 1
                                };
                            })()
                            """) as? [String: Any]
                    let context = "viewport \(size.width)×\(size.height)"
                    XCTAssertEqual(result?["coarse"] as? Bool, true, context)
                    XCTAssertEqual(result?["enterPrevented"] as? Bool, false, context)
                    XCTAssertEqual(result?["separate"] as? Bool, true, context)
                    XCTAssertEqual(result?["scrollable"] as? Bool, true, context)
                    XCTAssertEqual(result?["overflow"] as? Bool, false, context)
                    XCTAssertEqual(result?["inputReachable"] as? Bool, true, context)
                }
                return
            }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        XCTFail("Packaged Agent did not render")
    }

    func testParallelDocumentLoadWaitsForInitializedStateBeforeRevealing() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let core = try HostCore(
            dataRoot: root, builtins: Bundle.main.resourceURL!.appendingPathComponent("builtins"))
        let lease = core.attach(appId: "settings") { _ in }
        defer {
            core.detach(lease)
            core.shutdown()
            try? FileManager.default.removeItem(at: root)
        }
        try await ready(core, lease)
        _ = try await request(
            core, lease, "command", ["name": "navigate", "payload": ["section": "wallpaper"]])
        _ = try await request(core, lease, "preferences.set", ["appearance": "dark"])
        let initialized = try await request(core, lease, "snapshot")
        var starting = initialized
        starting["state"] = NSNull()
        starting["apps"] = (initialized["apps"] as? [[String: Any]] ?? []).map { app in
            var value = app
            if value["id"] as? String == "settings" { value["status"] = "starting" }
            return value
        }
        let entry = await withCheckedContinuation { continuation in
            core.package(appId: "settings") { continuation.resume(returning: $0) }
        }
        let configuration = WKWebViewConfiguration()
        let handler = ReadyHandler()
        handler.snapshot = starting
        configuration.websiteDataStore = .nonPersistent()
        configuration.userContentController.add(handler, name: "skynet")
        configuration.setURLSchemeHandler(AppAssets(entry: try XCTUnwrap(entry)), forURLScheme: "skynet-app")
        configuration.userContentController.addUserScript(
            try AppPresentation.bootstrap(snapshot: starting, presentationId: UUID().uuidString))
        let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 800, height: 700), configuration: configuration)
        handler.web = web
        defer {
            web.stopLoading()
            configuration.userContentController.removeScriptMessageHandler(forName: "skynet")
        }
        web.load(URLRequest(url: URL(string: "skynet-app://settings/ui/index.html")!))
        for _ in 0..<100 {
            if (try? await web.evaluateJavaScript("document.body?.innerText.includes('外观模式')")) as? Bool
                == true
            {
                XCTAssertEqual(handler.readyCount, 0, "Default UI must stay covered while the VM initializes")
                handler.snapshot = initialized
                let data = try JSONSerialization.data(
                    withJSONObject: ["kind": "snapshot", "value": initialized])
                let json = try XCTUnwrap(String(data: data, encoding: .utf8))
                _ = try await web.evaluateJavaScript(
                    "window.dispatchEvent(new CustomEvent('skynet:message',{detail:\(json)}))")
                for _ in 0..<60 {
                    if handler.readyCount > 0 {
                        let section =
                            try await web.evaluateJavaScript(
                                "document.querySelector('[aria-current=page]').textContent.trim()") as? String
                        let dark =
                            try await web.evaluateJavaScript(
                                "document.documentElement.dataset.theme==='dark'") as? Bool
                        XCTAssertEqual(section, "壁纸")
                        XCTAssertEqual(dark, true)
                        XCTAssertEqual(handler.readyCount, 1)
                        return
                    }
                    try await Task.sleep(nanoseconds: 50_000_000)
                }
                XCTFail("Initialized state did not reveal the document")
                return
            }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        XCTFail("Parallel document did not load")
    }

    private func object(_ value: Any?) -> [String: Any] { value as? [String: Any] ?? [:] }
    private func request(_ core: HostCore, _ lease: UUID, _ kind: String, _ input: [String: Any] = [:])
        async throws -> [String: Any]
    {
        try await withCheckedThrowingContinuation { continuation in
            core.request(lease: lease, kind: kind, input: input) { continuation.resume(with: $0) }
        }
    }
    private func ready(_ core: HostCore, _ lease: UUID) async throws {
        for _ in 0..<100 {
            let value = try await request(core, lease, "snapshot")
            if (value["revision"] as? Int ?? 0) >= 2 { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("Built-in runtime did not become ready")
    }
}

@MainActor
private final class DisplayFrame: NSObject {
    private var link: CADisplayLink?
    private var completion: (() -> Void)?
    init(_ completion: @escaping () -> Void) { self.completion = completion }
    func start() {
        link = CADisplayLink(target: self, selector: #selector(tick))
        link?.add(to: .main, forMode: .common)
    }
    @objc private func tick() {
        link?.invalidate()
        link = nil
        completion?()
        completion = nil
    }
}

@MainActor
private final class ReadyHandler: NSObject, WKScriptMessageHandler {
    weak var web: WKWebView?
    var snapshot: [String: Any]?
    private(set) var readyCount = 0
    func userContentController(
        _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: Any], let kind = body["kind"] as? String,
            let requestId = body["requestId"] as? String,
            kind == "view.ready" || (kind == "snapshot" && snapshot != nil),
            let data = try? JSONSerialization.data(
                withJSONObject: ["requestId": requestId, "value": kind == "snapshot" ? snapshot! : [:]]),
            let json = String(data: data, encoding: .utf8)
        else { return }
        if kind == "view.ready" { readyCount += 1 }
        web?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('skynet:message',{detail:\(json)}))")
    }
}
