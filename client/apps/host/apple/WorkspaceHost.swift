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

final class SurfaceToolbar {
    private(set) var publication: [String: Any]?
    private var actions = Set<String>()
    var onChange: (() -> Void)?

    func clear() {
        guard publication != nil else { return }
        publication = nil
        actions.removeAll()
        onChange?()
    }

    func publish(_ body: [String: Any], appId: String, document: String) throws {
        guard ["settings", "agent"].contains(appId), body["presentationId"] as? String == document,
            let input = body["input"] as? [String: Any], let items = input["items"] as? [[String: Any]],
            items.count <= 16
        else { throw HostError("toolbar", "工具栏声明无效") }
        var ids = Set<String>()
        func validate(_ item: [String: Any]) throws -> String {
            guard let id = item["id"] as? String, !id.isEmpty, let label = item["label"] as? String,
                !label.isEmpty, item["selected"] == nil || item["selected"] is Bool,
                Set(item.keys).isSubset(of: ["id", "label", "choices", "selected"])
            else { throw HostError("toolbar", "工具栏选项无效") }
            return id
        }
        for item in items {
            let id = try validate(item)
            if let choices = item["choices"] {
                guard let choices = choices as? [[String: Any]] else {
                    throw HostError("toolbar", "工具栏选项无效")
                }
                for choice in choices { ids.insert(try validate(choice)) }
            } else {
                ids.insert(id)
            }
        }
        actions = ids
        publication = ["presentationId": document, "items": items]
        onChange?()
    }

    func permits(_ action: String, document: String) -> Bool {
        publication?["presentationId"] as? String == document && actions.contains(action)
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
    private var menus: [CGRect] = []
    #if os(macOS)
        private var titlebars: [CGRect] = []
        private var buttons: [CGRect] = []
        private var controlsFrame: CGRect?
        override var isFlipped: Bool { true }
        override func layout() {
            super.layout()
            updateWindowControls()
        }
        private func updateWindowControls(force: Bool = false) {
            guard let window else { return }
            let frame = [.closeButton, .miniaturizeButton, .zoomButton].compactMap {
                (type: NSWindow.ButtonType) -> CGRect? in
                guard !window.styleMask.contains(.fullScreen), let button = window.standardWindowButton(type),
                    !button.isHiddenOrHasHiddenAncestor
                else { return nil }
                return convert(button.bounds, from: button)
            }.reduce(CGRect.null) { $0.union($1) }
            guard force || frame != controlsFrame else { return }
            controlsFrame = frame
            send(
                "workspace:windowControls",
                ["end": frame.isNull ? 0 : frame.maxX, "height": frame.isNull ? 0 : frame.maxY])
        }
        override func hitTest(_ point: NSPoint) -> NSView? {
            let local = convert(point, from: superview)
            guard bounds.contains(local) else { return nil }
            if !menus.isEmpty { return web.hitTest(convert(local, to: web.superview)) }
            if titlebars.contains(where: { $0.contains(local) })
                && !buttons.contains(where: { $0.contains(local) })
            {
                return self
            }
            return super.hitTest(point)
        }
        override func mouseDown(with event: NSEvent) {
            if event.clickCount == 2 {
                switch UserDefaults.standard.string(forKey: "AppleActionOnDoubleClick") {
                case "Minimize": window?.miniaturize(nil)
                case "None": break
                default: window?.performZoom(nil)
                }
            } else {
                window?.performDrag(with: event)
            }
        }
    #else
        override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
            if !menus.isEmpty { return web.hitTest(convert(point, to: web), with: event) }
            return super.hitTest(point, with: event)
        }
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
            sendToolbars()
            #if os(macOS)
                updateWindowControls(force: true)
            #endif
        case "toolbarAction":
            guard let id = body["appId"] as? String, let surface = surfaces[id], !surface.isHidden,
                let action = body["action"] as? String, let document = body["presentationId"] as? String,
                surface.toolbar.permits(action, document: document)
            else {
                reply(nil, "面板操作已失效")
                return
            }
            surface.activateToolbar(action, document: document, reply: reply)
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
        func rectangles(_ key: String) -> [CGRect] {
            (body[key] as? [[String: Double]] ?? []).compactMap {
                guard let x = $0["x"], let y = $0["y"], let width = $0["width"], let height = $0["height"]
                else { return nil }
                return CGRect(x: x, y: y, width: width, height: height)
            }
        }
        menus = rectangles("menus")
        #if os(macOS)
            titlebars = rectangles("titlebars")
            buttons = rectangles("buttons")
        #endif
        let panes = (workspace["panes"] as? [Any])?.compactMap { $0 as? String } ?? []
        for id in surfaces.keys.filter({ !recent.contains($0) }) {
            surfaces.removeValue(forKey: id)?.removeFromSuperview()
            sendToolbars()
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
            maskMenus(on: surface)
            surface.backgroundHex = body["background"] as? String ?? "#fafafa"
            surface.reducedMotion = preferences?["reduceMotion"] as? Bool == true
            if surfaces[id] == nil {
                surfaces[id] = surface
                surface.toolbar.onChange = { [weak self] in self?.sendToolbars() }
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
    private func maskMenus(on surface: AppSurface) {
        #if os(macOS)
            surface.wantsLayer = true
            guard let layer = surface.layer else { return }
        #else
            let layer = surface.layer
        #endif
        let holes = menus.map { surface.convert($0, from: self).intersection(surface.bounds) }.filter {
            !$0.isNull
        }
        guard !holes.isEmpty else {
            layer.mask = nil
            return
        }
        let path = CGMutablePath()
        path.addRect(surface.bounds)
        for hole in holes { path.addRect(hole) }
        let mask = CAShapeLayer()
        mask.frame = surface.bounds
        mask.fillRule = .evenOdd
        mask.path = path
        layer.mask = mask
    }
    private func sendToolbars() {
        send("workspace:toolbars", surfaces.compactMapValues { $0.toolbar.publication })
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

extension AppSurface {
    func activateToolbar(_ action: String, document: String, reply: @escaping (Any?, String?) -> Void) {
        guard let web, presentationId == document else {
            reply(nil, "面板已重新载入")
            return
        }
        web.callAsyncJavaScript(
            """
            if (window.__skynetPresentationId !== documentId) throw Error('面板已重新载入');
            window.dispatchEvent(new CustomEvent('skynet:toolbar', {detail: {id, presentationId: documentId}}));
            """, arguments: ["id": action, "documentId": document], in: nil, in: .page
        ) { result in
            switch result {
            case .success: reply(nil, nil)
            case .failure(let error): reply(nil, error.localizedDescription)
            }
        }
    }
}
