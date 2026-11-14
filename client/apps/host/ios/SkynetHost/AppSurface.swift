import React
import SkynetHostCore
import UIKit
import WebKit

@objc(SkynetSurfaceManager)
final class SurfaceManager: RCTViewManager {
    override static func requiresMainQueueSetup() -> Bool { true }
    override func view() -> UIView! { AppSurface() }
}
private final class WeakHandler: NSObject, WKScriptMessageHandler {
    weak var target: AppSurface?
    init(_ target: AppSurface) { self.target = target }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.receive(message)
    }
}

/// A presentation lease owns no business state, socket or task.
final class AppSurface: UIView, WKNavigationDelegate {
    @objc var active = true {
        didSet { if !active { web?.endEditing(true) } }
    }
    @objc var appId = "" { didSet { if oldValue != appId { loadApp() } } }
    @objc var backgroundHex = "#fafafa" {
        didSet {
            backgroundColor = UIColor(hex: backgroundHex)
            cover?.backgroundColor = backgroundColor
        }
    }
    @objc var reducedMotion = false
    @objc var revealDurationMs: Double = 140
    private var web: WKWebView?
    private var cover: UIView?
    private var failureView: UIView?
    private var lease: UUID?
    private var session = UUID()
    private var presentationId = UUID().uuidString
    private var lastSnapshot: [String: Any]?
    private var timeout: DispatchWorkItem?
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
        timeout?.cancel()
        if let lease { core.detach(lease) }
        lease = nil
        web?.configuration.userContentController.removeScriptMessageHandler(forName: "skynet")
        web?.stopLoading()
        web?.removeFromSuperview()
        web = nil
        cover?.removeFromSuperview()
        cover = nil
        failureView?.removeFromSuperview()
        failureView = nil
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
                self.lease = self.core.attach(appId: id) { [weak self] snapshot in
                    DispatchQueue.main.async {
                        guard let self, self.session == current else { return }
                        self.lastSnapshot = snapshot
                        guard snapshot["preferences"] != nil else {
                            self.showFailure("无法读取应用状态。")
                            return
                        }
                        if self.web != nil {
                            self.emit(["kind": "snapshot", "value": snapshot])
                        } else {
                            // Load WebKit alongside the business VM. The SDK
                            // reveals only after an initialized snapshot commits.
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
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        configuration.websiteDataStore = .nonPersistent()
        configuration.setURLSchemeHandler(AppAssets(entry: entry), forURLScheme: "skynet-app")
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
        configuration.suppressesIncrementalRendering = true
        let web = WKWebView(frame: bounds, configuration: configuration)
        web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        web.navigationDelegate = self
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.backgroundColor = .clear
        web.scrollView.contentInsetAdjustmentBehavior = .never
        // The native root already provides the keyboard's remaining viewport.
        // Only the app's inner scroll regions should move, not the document.
        web.scrollView.isScrollEnabled = false
        web.scrollView.keyboardDismissMode = .interactive
        web.scrollView.bounces = false
        web.allowsLinkPreview = false
        #if DEBUG
            if #available(iOS 16.4, *) { web.isInspectable = true }
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
        cover?.removeFromSuperview()
        let cover = UIView(frame: bounds)
        cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        cover.backgroundColor = UIColor(hex: backgroundHex)
        addSubview(cover)
        self.cover = cover
        timeout?.cancel()
        let current = session
        let identity = presentationId
        let timeout = DispatchWorkItem { [weak self] in
            guard let self, self.session == current, self.presentationId == identity, self.cover != nil else {
                return
            }
            self.showFailure("应用界面载入超时，可以重新载入。")
        }
        self.timeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 10, execute: timeout)
    }
    func receive(_ message: WKScriptMessage) {
        guard message.webView === web, message.frameInfo.isMainFrame,
            message.frameInfo.securityOrigin.protocol == "skynet-app",
            message.frameInfo.securityOrigin.host == appId,
            let body = message.body as? [String: Any], let id = body["requestId"] as? String, id.count <= 128,
            let kind = body["kind"] as? String, let lease
        else { return }
        let current = session
        let reply: HostCore.Reply = { [weak self] result in
            DispatchQueue.main.async {
                guard let self, self.session == current else { return }
                switch result {
                case .success(let value): self.emit(["requestId": id, "value": value])
                case .failure(let error): self.emit(["requestId": id, "error": String(describing: error)])
                }
            }
        }
        if kind == "view.ready" {
            guard body["presentationId"] as? String == presentationId else { return }
            timeout?.cancel()
            if failureView == nil, cover != nil {
                trace("visible")
                cover?.removeFromSuperview()
                cover = nil
                UIAccessibility.post(notification: .layoutChanged, argument: web)
                if !reducedMotion, !UIAccessibility.isReduceMotionEnabled {
                    let fade = CABasicAnimation(keyPath: "opacity")
                    fade.fromValue = 0
                    fade.toValue = 1
                    fade.duration = min(revealDurationMs, 1000) / 1000
                    web?.layer.add(fade, forKey: "surface.ready")
                }
            }
            reply(.success([:]))
        } else {
            core.request(
                lease: lease, kind: kind, input: body["input"] as? [String: Any] ?? [:], completion: reply)
        }
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
        _ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        let url = action.request.url
        guard webView === web, action.targetFrame?.isMainFrame == true,
            url?.scheme == "skynet-app", url?.host == appId, url?.path == "/ui/index.html"
        else {
            decisionHandler(.cancel)
            return
        }
        do {
            try preparePresentation()
            decisionHandler(.allow)
        } catch {
            showFailure("无法准备应用界面。")
            decisionHandler(.cancel)
        }
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        if webView === web { showFailure("应用界面已停止，可以重新载入。") }
    }
    func webView(
        _ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error
    ) {
        navigationFailed(webView, error)
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        navigationFailed(webView, error)
    }
    private func navigationFailed(_ webView: WKWebView, _ error: Error) {
        guard webView === web, (error as NSError).code != NSURLErrorCancelled else { return }
        NSLog("AppSurface navigation app=%@ error=%@", appId, String(describing: error))
        showFailure("界面载入失败，可以重新载入。")
    }
    private func showFailure(_ message: String) {
        timeout?.cancel()
        cover?.removeFromSuperview()
        cover = nil
        web?.isHidden = true
        failureView?.removeFromSuperview()
        let label = UILabel()
        label.text = message
        label.numberOfLines = 0
        label.font = .preferredFont(forTextStyle: .body)
        label.adjustsFontForContentSizeCategory = true
        let reload = UIButton(type: .system)
        reload.setTitle("重新载入界面", for: .normal)
        reload.addTarget(self, action: #selector(reloadView), for: .touchUpInside)
        let stack = UIStackView(arrangedSubviews: [label, reload])
        stack.axis = .vertical
        stack.spacing = 16
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -24),
        ])
        failureView = stack
    }
    @objc private func reloadView() { loadApp() }
    deinit {
        timeout?.cancel()
        if let lease { core.detach(lease) }
        web?.configuration.userContentController.removeScriptMessageHandler(forName: "skynet")
    }
}
