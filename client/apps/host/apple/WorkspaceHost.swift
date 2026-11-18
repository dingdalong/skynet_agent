import SkynetHostCore
import WebKit

#if os(macOS)
    import AppKit
    typealias PlatformView = NSView
    typealias PlatformColor = NSColor
#else
    import UIKit
    typealias PlatformView = UIView
    typealias PlatformColor = UIColor
#endif

extension PlatformColor {
    convenience init(hex: String) {
        let value = UInt64(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0
        self.init(
            red: Double((value >> 16) & 255) / 255, green: Double((value >> 8) & 255) / 255,
            blue: Double(value & 255) / 255, alpha: 1)
    }
}

private final class WorkspaceMessages: NSObject, WKScriptMessageHandlerWithReply {
    weak var host: WorkspaceHost?
    func userContentController(
        _ controller: WKUserContentController, didReceive message: WKScriptMessage,
        replyHandler: @escaping (Any?, String?) -> Void
    ) {
        guard let host else {
            replyHandler(nil, "工作区已关闭")
            return
        }
        host.receive(message, reply: replyHandler)
    }
}

final class WorkspaceHost: PlatformView, WKNavigationDelegate {
    private let page = URL(string: "skynet-host://workspace/index.html")!
    private let web: WKWebView
    private let core = HostServices.core
    private var observation: UUID?
    private var snapshot: [String: Any]?
    private var surfaces: [String: AppSurface] = [:]
    private var errors: [String: String] = [:]
    #if os(macOS)
        override var isFlipped: Bool { true }
    #endif

    override init(frame: CGRect) {
        let messages = WorkspaceMessages()
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.setURLSchemeHandler(
            AppAssets(bundledWorkspace: Bundle.main.resourceURL!.appendingPathComponent("workspace")),
            forURLScheme: "skynet-host")
        config.userContentController.addScriptMessageHandler(messages, contentWorld: .page, name: "workspace")
        web = WKWebView(frame: .zero, configuration: config)
        super.init(frame: frame)
        messages.host = self
        web.navigationDelegate = self
        web.frame = bounds
        #if os(macOS)
            web.autoresizingMask = [.width, .height]
        #else
            web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            web.scrollView.contentInsetAdjustmentBehavior = .never
            web.scrollView.isScrollEnabled = false
            web.allowsLinkPreview = false
            web.accessibilityIdentifier = "workspace-shell"
        #endif
        addSubview(web)
        observation = core.observe { [weak self] value in
            DispatchQueue.main.async {
                self?.snapshot = value
                self?.send("workspace:snapshot", value)
            }
        }
        reload()
    }
    required init?(coder: NSCoder) { nil }
    func reload() {
        for surface in surfaces.values { visibility(surface, false) }
        web.load(URLRequest(url: page))
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { reload() }
    func webView(
        _ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        decisionHandler(
            action.targetFrame?.isMainFrame == true && action.request.url == page ? .allow : .cancel)
    }
    fileprivate func receive(_ message: WKScriptMessage, reply: @escaping (Any?, String?) -> Void) {
        guard message.webView === web, message.frameInfo.isMainFrame,
            message.frameInfo.securityOrigin.protocol == "skynet-host",
            message.frameInfo.securityOrigin.host == "workspace", web.url == page,
            let body = message.body as? [String: Any]
        else {
            reply(nil, "无效工作区请求")
            return
        }
        switch body["kind"] as? String {
        case "initial":
            reply(snapshot, nil)
            send("workspace:errors", errors)
        case "command":
            guard let name = body["name"] as? String else {
                reply(nil, "缺少命令")
                return
            }
            core.workspace(name, input: body["input"] as? [String: Any] ?? [:]) { result in
                DispatchQueue.main.async {
                    switch result {
                    case .success(let next): reply(next, nil)
                    case .failure(let error): reply(nil, String(describing: error))
                    }
                }
            }
        case "layout":
            if let frames = body["frames"] as? [String: [String: Double]],
                let revision = body["revision"] as? Int, revision == snapshot?["revision"] as? Int
            {
                layoutSurfaces(frames, body: body)
            }
            reply(nil, nil)
        case "retry":
            if let id = body["id"] as? String, let surface = surfaces[id],
                errors.removeValue(forKey: id) != nil
            {
                surface.reloadView()
                send("workspace:errors", errors)
            }
            reply(nil, nil)
        default: reply(nil, "未知工作区请求")
        }
    }
    private func layoutSurfaces(_ frames: [String: [String: Double]], body: [String: Any]) {
        guard let workspace = snapshot?["workspace"] as? [String: Any],
            let recent = workspace["recent"] as? [String]
        else { return }
        let preferences = snapshot?["preferences"] as? [String: Any]
        let panes = (workspace["panes"] as? [Any])?.compactMap { $0 as? String } ?? []
        for id in surfaces.keys.filter({ !recent.contains($0) }) {
            surfaces.removeValue(forKey: id)?.removeFromSuperview()
            if errors.removeValue(forKey: id) != nil { send("workspace:errors", errors) }
        }
        for id in recent {
            let frame = frames[id]
            let allowed = workspace["mode"] as? String == "apps" && panes.contains(id)
            guard allowed, let frame, let left = frame["x"], let top = frame["y"],
                let width = frame["width"], let height = frame["height"], width > 0, height > 0
            else {
                if let surface = surfaces[id] { visibility(surface, false) }
                continue
            }
            let surface = surfaces[id] ?? AppSurface(frame: .zero)
            surface.frame = CGRect(x: left, y: top, width: width, height: height).intersection(bounds)
            surface.backgroundHex = body["background"] as? String ?? "#fafafa"
            surface.reducedMotion = preferences?["reduceMotion"] as? Bool == true
            if surfaces[id] == nil {
                surfaces[id] = surface
                #if os(iOS)
                    surface.accessibilityIdentifier = "app-scene-\(id)"
                #endif
                surface.onFailure = { [weak self] message in
                    guard let self, let live = self.surfaces[id] else { return }
                    self.errors[id] = message
                    self.visibility(live, false)
                    self.send("workspace:errors", self.errors)
                }
                addSubview(surface)
                surface.appId = id
            }
            visibility(surface, errors[id] == nil)
        }
        #if os(iOS)
            if let colors = body["chrome"] as? [String], let light = body["lightStatus"] as? Bool {
                HostServices.delegate?.updateChrome(colors, lightContent: light)
            }
        #endif
    }
    private func visibility(_ surface: AppSurface, _ visible: Bool) {
        if surface.active != visible { surface.active = visible }
        surface.isHidden = !visible
        #if os(iOS)
            surface.accessibilityElementsHidden = !visible
        #endif
    }
    private func send(_ name: String, _ value: [String: Any]) {
        web.callAsyncJavaScript(
            "window.dispatchEvent(new CustomEvent(name, {detail: value}));",
            arguments: ["name": name, "value": value], in: nil, in: .page, completionHandler: nil)
    }
    deinit { if let observation { core.unobserve(observation) } }
}
