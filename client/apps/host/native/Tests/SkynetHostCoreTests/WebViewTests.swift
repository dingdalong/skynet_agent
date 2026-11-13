import AppKit
import WebKit
import XCTest

@testable import SkynetHostCore

/// Runs the packaged shadcn UI in the real WebKit engine. Pointer/keyboard
/// acceptance remains in XCUITest; this catches scheme, CSP and bridge failures.
@MainActor
final class WebViewTests: XCTestCase {
    func testPackagedSettingsBridgeThemeAndResponsiveLayout() async throws {
        _ = NSApplication.shared
        let native = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
            .deletingLastPathComponent()
        let client = native.deletingLastPathComponent().deletingLastPathComponent()
            .deletingLastPathComponent()
        let data = FileManager.default.temporaryDirectory.appendingPathComponent(
            "skynet-webkit-\(UUID().uuidString)")
        let core = try HostCore(
            dataRoot: data, builtins: client.appendingPathComponent("dist/builtins"),
            launcher: native.appendingPathComponent(".build/c-core/process_launcher"),
            executable: native.appendingPathComponent(".build/out/Products/Debug/SkynetAppRuntime"))
        let entry = try XCTUnwrap(core.catalog.entries["settings"])
        let harness = WebHarness(core: core, entry: entry)
        defer {
            harness.close()
            core.shutdown()
            try? FileManager.default.removeItem(at: data)
        }
        try await harness.until("document.body.innerText.includes('外观模式')")
        try await harness.waitForPresentation(1)
        XCTAssertEqual(harness.presentations[0]["section"] as? String, "外观")
        try await harness.until(
            "getComputedStyle(document.querySelector('[data-slot=button]')).display==='flex' && getComputedStyle(document.querySelector('[data-slot=button]')).alignItems==='center'"
        )
        try await harness.until(
            "parseFloat(getComputedStyle(document.querySelector('[data-slot=card]')).borderRadius)>0")
        try await harness.click("深色")
        try await harness.until("document.documentElement.classList.contains('dark')")
        try await harness.click("壁纸")
        try await harness.until("document.body.innerText.includes('选择壁纸')")
        try await harness.click("暮色")
        try await harness.until(
            "Array.from(document.querySelectorAll('button')).some(b => b.getAttribute('aria-label')==='暮色' && b.getAttribute('aria-pressed')==='true')"
        )
        try await harness.capture(client.appendingPathComponent("test-artifacts/settings-webkit.png"))
        harness.web.setFrameSize(NSSize(width: 420, height: 700))
        try await harness.until(
            "getComputedStyle(document.querySelector('.settings-layout')).gridTemplateColumns.split(' ').length===1"
        )
        let overflowing =
            try await harness.web.evaluateJavaScript("document.documentElement.scrollWidth > 420") as? Bool
        XCTAssertEqual(overflowing, false)
        try await harness.capture(client.appendingPathComponent("test-artifacts/settings-narrow-webkit.png"))
        harness.web.reload()
        try await harness.until(
            "document.body.innerText.includes('选择壁纸') && document.documentElement.classList.contains('dark')")
        try await harness.waitForPresentation(2)
        XCTAssertEqual(harness.presentations[1]["section"] as? String, "壁纸")
        XCTAssertEqual(harness.presentations[1]["dark"] as? Bool, true)
        try await harness.until(
            "window.__skynetInitialSnapshot.state.section==='wallpaper' && document.querySelector('.wallpaper-preview').style.background.includes('--wallpaper-')"
        )
        harness.web.setFrameSize(NSSize(width: 240, height: 700))
        try await harness.until(
            "getComputedStyle(document.querySelector('.wallpaper-choices')).gridTemplateColumns.split(' ').length===1"
        )
        try await harness.until(
            "document.querySelector('.settings-main').scrollWidth <= document.querySelector('.settings-main').clientWidth"
        )
        try await harness.click("动态效果")
        try await harness.until("document.body.innerText.includes('减少动态效果')")
        try await harness.until("document.querySelector('[role=switch]').getBoundingClientRect().width>=28")
        let agent = WebHarness(core: core, entry: try XCTUnwrap(core.catalog.entries["agent"]))
        defer { agent.close() }
        try await agent.until("document.querySelector('main[aria-label=Agent]')!==null")
        try await agent.waitForPresentation(1)
        XCTAssertEqual(agent.presentations[0]["dark"] as? Bool, true)
    }
}

@MainActor
private final class WebHarness: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
    let web: WKWebView
    private let core: HostCore
    private var lease: UUID?
    private var snapshot: [String: Any]?
    private var loaded = false
    private var started = false
    private var presentationId = UUID().uuidString
    private(set) var presentations: [[String: Any]] = []

    init(core: HostCore, entry: AppCatalog.Entry) {
        self.core = core
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.setURLSchemeHandler(AppAssets(entry: entry), forURLScheme: "skynet-app")
        web = WKWebView(frame: NSRect(x: 0, y: 0, width: 1200, height: 780), configuration: config)
        super.init()
        config.userContentController.add(self, name: "skynet")
        web.navigationDelegate = self
        lease = core.attach(appId: entry.manifest.id) { [weak self] snapshot in
            DispatchQueue.main.async {
                self?.snapshot = snapshot
                guard let self else { return }
                if self.loaded { self.emit(["kind": "snapshot", "value": snapshot]) }
                let apps = snapshot["apps"] as? [[String: Any]] ?? []
                if !self.started,
                    apps.first(where: { $0["id"] as? String == entry.manifest.id })?["status"] as? String
                        != "starting"
                {
                    self.started = true
                    self.web.load(
                        URLRequest(url: URL(string: "skynet-app://\(entry.manifest.id)/ui/index.html")!))
                }
            }
        }
    }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let id = body["requestId"] as? String,
            let kind = body["kind"] as? String, let lease
        else { return }
        if kind == "view.ready" {
            guard body["presentationId"] as? String == presentationId else { return }
            web.evaluateJavaScript(
                """
                ({dark: document.documentElement.classList.contains('dark'),
                  section: document.querySelector('[aria-current=page]')?.textContent.trim()})
                """
            ) { [weak self] value, error in
                XCTAssertNil(error)
                if let value = value as? [String: Any] { self?.presentations.append(value) }
                self?.emit(["requestId": id, "value": [:]])
            }
            return
        }
        core.request(lease: lease, kind: kind, input: dictionary(body["input"])) { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let value): self?.emit(["requestId": id, "value": value])
                case .failure(let error): self?.emit(["requestId": id, "error": String(describing: error)])
                }
            }
        }
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        loaded = true
        if let snapshot { emit(["kind": "snapshot", "value": snapshot]) }
    }
    func webView(
        _ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        do {
            loaded = false
            presentationId = UUID().uuidString
            let controller = web.configuration.userContentController
            controller.removeAllUserScripts()
            controller.addUserScript(
                try AppPresentation.bootstrap(snapshot: snapshot ?? [:], presentationId: presentationId))
            decisionHandler(.allow)
        } catch {
            XCTFail("Cannot prepare presentation: \(error)")
            decisionHandler(.cancel)
        }
    }
    private func emit(_ message: [String: Any]) {
        guard let data = try? jsonData(message), let json = String(data: data, encoding: .utf8) else {
            return
        }
        web.evaluateJavaScript("window.dispatchEvent(new CustomEvent('skynet:message',{detail:\(json)}))")
    }
    func click(_ label: String) async throws {
        let json = String(data: try jsonData(label), encoding: .utf8)!
        let found =
            try await web.evaluateJavaScript(
                """
                (()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')===\(json)||b.textContent.trim()===\(json)); if(!b)return false;b.click();return true})()
                """) as? Bool
        XCTAssertEqual(found, true, "Missing WebKit control: \(label)")
    }
    func until(_ condition: String) async throws {
        for _ in 0..<60 {
            if (try? await web.evaluateJavaScript(condition)) as? Bool == true { return }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        let diagnostic = try? await web.evaluateJavaScript(
            "JSON.stringify({text:document.body.innerText,secure:isSecureContext,uuid:typeof crypto.randomUUID})"
        )
        XCTFail("WebKit condition timed out: \(condition)\n\(diagnostic ?? "")")
        throw failure("webkit", "Rendered UI did not reach expected state")
    }
    func waitForPresentation(_ count: Int) async throws {
        for _ in 0..<60 {
            if presentations.count >= count { return }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        let diagnostic = try? await web.evaluateJavaScript(
            "JSON.stringify({visibility:document.visibilityState,identity:window.__skynetPresentationId,readyState:document.readyState})"
        )
        XCTFail("Presentation \(count) did not become ready: \(diagnostic ?? "")")
        throw failure("webkit", "Presentation did not become ready")
    }
    func close() {
        if let lease { core.detach(lease) }
        web.configuration.userContentController.removeScriptMessageHandler(forName: "skynet")
        web.stopLoading()
    }
    func capture(_ url: URL) async throws {
        let image = try await web.takeSnapshot(configuration: nil)
        let tiff = try XCTUnwrap(image.tiffRepresentation)
        let png = try XCTUnwrap(NSBitmapImageRep(data: tiff)?.representation(using: .png, properties: [:]))
        try FileManager.default.createDirectory(
            at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try png.write(to: url)
    }
}
