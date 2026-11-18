import AppKit
import SkynetHostCore
import WebKit

private final class WeakHandler: NSObject, WKScriptMessageHandler {
    weak var target: AppSurface?
    init(_ target: AppSurface) { self.target = target }
    func userContentController(
        _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
    ) {
        target?.receive(message)
    }
}

/// Each view has its own data store and lease. Detaching a view releases neither
/// business processes nor connections. WebKit may share rendering processes.
final class AppSurface: NSView, WKNavigationDelegate {
    @objc var active: Bool = true {
        didSet {
            if !active, let web, let responder = window?.firstResponder as? NSView,
                responder === web || responder.isDescendant(of: web)
            {
                window?.makeFirstResponder(nil)
            }
        }
    }
    @objc var appId: String = "" { didSet { if oldValue != appId { loadApp() } } }
    @objc var backgroundHex: String = "#fafafa" {
        didSet { cover?.layer?.backgroundColor = NSColor(hex: backgroundHex).cgColor }
    }
    @objc var reducedMotion: Bool = false {
        didSet { if reducedMotion { web?.layer?.removeAnimation(forKey: "surface.ready") } }
    }
    @objc var revealDurationMs: Double = 140
    private var web: WKWebView?
    private var cover: NSView?
    private var readinessTimeout: DispatchWorkItem?
    private var lease: UUID?
    private var session = UUID()
    private var presentationId = UUID().uuidString
    private var lastSnapshot: [String: Any]?
    var onFailure: ((String) -> Void)?
    private var failed = false
    private let core = HostServices.core
    private var loadStarted = ProcessInfo.processInfo.systemUptime

    private func trace(_ phase: String) {
        NSLog(
            "AppSurface startup app=%@ phase=%@ elapsed=%.1fms", appId, phase,
            (ProcessInfo.processInfo.systemUptime - loadStarted) * 1000)
    }

    private func loadApp() {
        loadStarted = ProcessInfo.processInfo.systemUptime
        trace("requested")
        readinessTimeout?.cancel()
        if let lease { core.detach(lease) }
        lease = nil
        web?.configuration.userContentController.removeScriptMessageHandler(forName: "skynet")
        web?.stopLoading()
        web?.removeFromSuperview()
        cover?.removeFromSuperview()
        cover = nil
        failed = false
        web = nil
        lastSnapshot = nil
        session = UUID()
        let current = session
        let id = appId
        core.package(appId: id) { [weak self] entry in
            DispatchQueue.main.async {
                guard let self, self.session == current else { return }
                guard let entry else {
                    self.showFailure("应用资源不可用。")
                    return
                }
                self.lease = self.core.attach(appId: id) { [weak self] value in
                    DispatchQueue.main.async {
                        guard let self, self.session == current else { return }
                        self.lastSnapshot = value
                        guard value["preferences"] != nil else {
                            self.showFailure("无法读取应用状态。")
                            return
                        }
                        if self.web != nil {
                            self.emit(["kind": "snapshot", "value": value])
                        } else {
                            self.trace("snapshotReceived")
                            self.createWeb(entry)
                        }
                    }
                }
            }
        }
    }

    private func createWeb(_ entry: AppCatalog.Entry) {
        trace("createWeb")
        let controller = WKUserContentController()
        controller.add(WeakHandler(self), name: "skynet")
        let config = WKWebViewConfiguration()
        config.userContentController = controller
        config.websiteDataStore = .nonPersistent()
        config.setURLSchemeHandler(AppAssets(entry: entry), forURLScheme: "skynet-app")
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        config.suppressesIncrementalRendering = true
        let web = WKWebView(frame: bounds, configuration: config)
        web.wantsLayer = true
        web.autoresizingMask = [.width, .height]
        web.navigationDelegate = self
        web.setValue(false, forKey: "drawsBackground")
        #if DEBUG
            web.isInspectable = true
        #endif
        addSubview(web)
        self.web = web
        trace("loadDocument")
        web.load(URLRequest(url: URL(string: "skynet-app://\(appId)/ui/index.html")!))
    }

    private func preparePresentation() throws {
        guard let web, let lastSnapshot else { return }
        presentationId = UUID().uuidString
        let controller = web.configuration.userContentController
        controller.removeAllUserScripts()
        controller.addUserScript(
            try AppPresentation.bootstrap(snapshot: lastSnapshot, presentationId: presentationId))
        if cover == nil {
            let cover = NSView(frame: bounds)
            cover.autoresizingMask = [.width, .height]
            cover.wantsLayer = true
            cover.layer?.backgroundColor = NSColor(hex: backgroundHex).cgColor
            addSubview(cover)
            self.cover = cover
        }
        readinessTimeout?.cancel()
        let current = session
        let document = presentationId
        let timeout = DispatchWorkItem { [weak self] in
            guard let self, self.session == current, self.presentationId == document, self.cover != nil
            else { return }
            NSLog("AppSurface ready app=%@ error=First render timed out", self.appId)
            self.showFailure("应用界面载入超时，可以重新载入。")
        }
        readinessTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 10, execute: timeout)
    }

    func receive(_ message: WKScriptMessage) {
        guard message.webView === web, message.frameInfo.isMainFrame,
            message.frameInfo.securityOrigin.protocol == "skynet-app",
            message.frameInfo.securityOrigin.host == appId,
            let body = message.body as? [String: Any],
            let requestId = body["requestId"] as? String, requestId.count <= 128,
            let kind = body["kind"] as? String,
            let lease
        else { return }
        let current = session
        let reply: HostCore.Reply = { [weak self] result in
            DispatchQueue.main.async {
                guard let self, self.session == current else { return }
                switch result {
                case .success(let value): self.emit(["requestId": requestId, "value": value])
                case .failure(let error):
                    self.emit(["requestId": requestId, "error": String(describing: error)])
                }
            }
        }
        if kind == "view.ready" {
            guard body["presentationId"] as? String == presentationId else { return }
            readinessTimeout?.cancel()
            if cover != nil, !failed {
                trace("visible")
                cover?.removeFromSuperview()
                cover = nil
                // Web content becomes accessible asynchronously after the native layout has settled.
                NSAccessibility.post(element: window ?? self, notification: .layoutChanged)
                if !reducedMotion, !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion,
                    revealDurationMs > 0
                {
                    let fade = CABasicAnimation(keyPath: "opacity")
                    fade.fromValue = 0
                    fade.toValue = 1
                    fade.duration = min(revealDurationMs, 1000) / 1000
                    web?.layer?.add(fade, forKey: "surface.ready")
                }
            }
            reply(.success([:]))
            return
        }
        if kind == "apps.install" {
            core.mayManageApps(lease: lease) { allowed in
                DispatchQueue.main.async {
                    guard allowed else {
                        reply(.failure(HostError("permission", "没有应用管理权限")))
                        return
                    }
                    let panel = NSOpenPanel()
                    panel.title = "安装 Skynet 应用"
                    panel.prompt = "选择应用"
                    panel.canChooseDirectories = true
                    panel.canChooseFiles = false
                    panel.treatsFilePackagesAsDirectories = true
                    panel.allowsMultipleSelection = false
                    panel.begin { response in
                        guard response == .OK, let url = panel.url else {
                            reply(.success(["cancelled": true]))
                            return
                        }
                        // Decode for display only; HostCore verifies every file
                        // again after approval and before activation.
                        do {
                            let data = try Data(contentsOf: url.appendingPathComponent("manifest.json"))
                            guard data.count <= 65_536 else { throw HostError("size", "应用清单过大") }
                            let manifest = try JSONDecoder().decode(AppManifest.self, from: data)
                            let alert = NSAlert()
                            alert.messageText = "安装 \(manifest.name.prefix(64))？"
                            alert.informativeText =
                                "仅安装你信任的应用。它将获得以下权限：\n\n"
                                + (manifest.permissions.isEmpty
                                    ? "无额外权限" : manifest.permissions.joined(separator: "\n"))
                            alert.addButton(withTitle: "安装")
                            alert.addButton(withTitle: "取消")
                            guard alert.runModal() == .alertFirstButtonReturn else {
                                reply(.success(["cancelled": true]))
                                return
                            }
                            self.core.install(
                                source: url, approvedPermissions: manifest.permissions, completion: reply)
                        } catch { reply(.failure(error)) }
                    }
                }
            }
            return
        }
        core.request(
            lease: lease, kind: kind, input: body["input"] as? [String: Any] ?? [:], completion: reply)
    }

    private func emit(_ value: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]),
            let json = String(data: data, encoding: .utf8)
        else { return }
        web?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('skynet:message',{detail:\(json)}))") {
            _, error in
            if let error { NSLog("AppSurface emit app=%@ error=%@", self.appId, String(describing: error)) }
        }
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard webView === web else { return }
        trace("navigationFinished")
        if let lastSnapshot { emit(["kind": "snapshot", "value": lastSnapshot]) }
    }
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        if webView === web { trace("navigationStarted") }
    }
    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
        if webView === web { trace("documentCommitted") }
    }
    func webView(
        _ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        let url = navigationAction.request.url
        let allowed =
            webView === web && navigationAction.targetFrame?.isMainFrame == true
            && url?.scheme == "skynet-app"
            && url?.host == appId && url?.path == "/ui/index.html"
        guard allowed else {
            decisionHandler(.cancel)
            return
        }
        do {
            try preparePresentation()
            decisionHandler(.allow)
        } catch {
            NSLog("AppSurface bootstrap app=%@ error=%@", appId, String(describing: error))
            showFailure("无法准备应用界面。")
            decisionHandler(.cancel)
        }
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        guard webView === web else { return }
        showFailure("应用界面已停止，可以重新载入。")
    }
    func webView(
        _ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error
    ) {
        navigationFailed(webView, error: error)
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        navigationFailed(webView, error: error)
    }
    private func navigationFailed(_ webView: WKWebView, error: Error) {
        guard webView === web else { return }
        let failure = error as NSError
        guard failure.domain != NSURLErrorDomain || failure.code != NSURLErrorCancelled else { return }
        NSLog("AppSurface navigation app=%@ error=%@", appId, String(describing: error))
        showFailure("界面载入失败：\(error.localizedDescription)")
    }
    private func showFailure(_ message: String) {
        readinessTimeout?.cancel()
        cover?.removeFromSuperview()
        cover = nil
        web?.isHidden = true
        failed = true
        onFailure?(message)
    }
    func reloadView() { loadApp() }
    deinit {
        readinessTimeout?.cancel()
        if let lease { core.detach(lease) }
        web?.configuration.userContentController.removeScriptMessageHandler(forName: "skynet")
    }
}
