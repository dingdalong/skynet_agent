import AppKit
import CryptoKit
import WebKit
import XCTest

@testable import SkynetHostCore

/// Runs the packaged Astryx UI in the real WebKit engine. Pointer/keyboard
/// acceptance is separate; this catches scheme, CSP and bridge failures.
@MainActor
final class WebViewTests: XCTestCase {
    private func login(_ core: HostCore, url: String, username: String) async throws -> [String: Any] {
        try await withCheckedThrowingContinuation { continuation in
            core.workspace("login", input: ["url": "\(url)/agent", "username": username]) {
                continuation.resume(with: $0)
            }
        }
    }
    func testWorkspaceAppIconGeometry() async throws {
        _ = NSApplication.shared
        let tests = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        let workspace = tests.appendingPathComponent("../../../../dist/workspace").standardizedFileURL
        for width in [390, 1024] {
            let config = WKWebViewConfiguration()
            config.websiteDataStore = .nonPersistent()
            config.setURLSchemeHandler(AppAssets(bundledWorkspace: workspace), forURLScheme: "skynet-host")
            config.userContentController.addUserScript(
                WKUserScript(
                    source: """
                        const apps = [{id:'agent', name:'Agent', builtin:true}, {id:'settings', name:'设置', builtin:true}];
                        const placement = innerWidth < 600 ? apps : [...apps].reverse();
                        const extras = \(width) > 600 ? [{id:'notes', name:'笔记', builtin:false}] : [];
                        const snapshot = {
                            revision:1, user:{userId:'test', username:'测试', url:'ws://localhost'}, apps:[...apps, ...extras], capabilities:{splitView:true},
                            preferences:{appearance:'light', wallpaper:'coast', reduceMotion:true},
                            workspace:{mode:'desktop', panes:[], recent:apps.map(app=>app.id), ratio:0.5,
                                desktop:[placement[0].id], dock:[placement[1].id, ...extras.map(app=>app.id)]}
                        };
                        window.webkit = {messageHandlers:{workspace:{postMessage:async ({kind}) =>
                            kind === 'initial' ? snapshot : null}}};
                        """, injectionTime: .atDocumentStart, forMainFrameOnly: true))
            let web = WKWebView(frame: CGRect(x: 0, y: 0, width: width, height: 780), configuration: config)
            defer { web.stopLoading() }
            web.load(URLRequest(url: URL(string: "skynet-host://workspace/index.html")!))
            for (area, size) in [("desktop", 60.0), ("dock", 60.0), ("overview", 24.0)] {
                let selector: String
                if area == "overview" {
                    _ = try await web.evaluateJavaScript(
                        """
                        window.dispatchEvent(new CustomEvent('workspace:snapshot', {detail:{
                            ...snapshot, revision:2, workspace:{...snapshot.workspace, mode:'overview'}
                        }}))
                        """)
                    selector = ".astryx-card button:first-child svg"
                } else {
                    selector = "[data-drop-area='\(area)'] [data-launcher-button] svg"
                }
                let condition = "document.querySelector(\"\(selector)\") !== null"
                for _ in 0..<60 {
                    if (try? await web.evaluateJavaScript(condition)) as? Bool == true { break }
                    try await Task.sleep(for: .milliseconds(100))
                }
                let result = try await web.callAsyncJavaScript(
                    """
                    return Array.from(document.querySelectorAll(selector), glyph => {
                        const tile = glyph.parentElement.getBoundingClientRect();
                        const icon = glyph.getBoundingClientRect();
                        const button = glyph.closest('button').getBoundingClientRect();
                        return [tile.width, tile.height, icon.width, icon.height,
                            icon.x - tile.x + (icon.width - tile.width) / 2,
                            icon.y - tile.y + (icon.height - tile.height) / 2,
                            tile.x - button.x, tile.y - button.y, button.width, button.height];
                    });
                    """, arguments: ["selector": selector], in: nil, contentWorld: .page)
                let measurements = try XCTUnwrap(result as? [[Double]])
                let expectedCount = area == "overview" || (area == "dock" && width > 600) ? 2 : 1
                XCTAssertEqual(measurements.count, expectedCount, "\(area) at \(width)")
                for actual in measurements {
                    var expected = [size, size, size * 0.56, size * 0.56, 0, 0]
                    if area != "overview" { expected += [0, 0, size, size] }
                    for (value, target) in zip(actual, expected) {
                        XCTAssertEqual(value, target, accuracy: 0.1, "\(area) at \(width): \(actual)")
                    }
                }
                if area == "dock" {
                    let iconInsets =
                        try await web.evaluateJavaScript(
                            """
                            (() => {
                                const dock = document.querySelector('[data-drop-area=dock]');
                                const bounds = dock.getBoundingClientRect();
                                const buttons = dock.querySelectorAll('[data-launcher-button]');
                                const first = buttons[0].getBoundingClientRect();
                                const last = buttons[buttons.length - 1].getBoundingClientRect();
                                return [first.top - bounds.top, bounds.bottom - last.bottom,
                                    first.left - bounds.left, bounds.right - last.right];
                            })()
                            """) as? [Double]
                    let insets = try XCTUnwrap(iconInsets)
                    for inset in insets.dropFirst() {
                        XCTAssertEqual(
                            inset, insets[0], accuracy: 0.1, "Dock icon insets at \(width): \(insets)")
                    }
                    let surface = "getComputedStyle(document.querySelector('[data-drop-area=dock]'))"
                    let light = try await web.evaluateJavaScript("\(surface).backgroundColor") as? String
                    _ = try await web.evaluateJavaScript(
                        """
                        snapshot.preferences = {...snapshot.preferences, appearance:'dark'};
                        window.dispatchEvent(new CustomEvent('workspace:snapshot', {detail:{...snapshot}}))
                        """)
                    let lightColor = try XCTUnwrap(light)
                    let isDark = "document.documentElement.dataset.theme === 'dark'"
                    let changed = "\(isDark) && \(surface).backgroundColor !== '\(lightColor)'"
                    for _ in 0..<60 {
                        if (try? await web.evaluateJavaScript(changed)) as? Bool == true { break }
                        try await Task.sleep(for: .milliseconds(100))
                    }
                    let adapted = try await web.evaluateJavaScript(changed) as? Bool
                    XCTAssertEqual(adapted, true, "Dock surface follows the workspace appearance")
                    let aligned =
                        try await web.evaluateJavaScript(
                            """
                            Array.from(document.querySelectorAll('[data-launcher-button]')).every(button => {
                                const tile = getComputedStyle(button.querySelector('[data-app-artwork]'));
                                return tile.borderRadius === getComputedStyle(button).borderRadius &&
                                    tile.backgroundImage.includes('gradient');
                            })
                            """) as? Bool
                    XCTAssertEqual(
                        aligned, true, "The illuminated tile and its hover surface share one contour")
                }
            }
        }
    }

    func testWorkspaceShellFlowsAndOverlayBridge() async throws {
        _ = NSApplication.shared
        let tests = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        let workspace = tests.appendingPathComponent("../../../../dist/workspace").standardizedFileURL
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.setURLSchemeHandler(AppAssets(bundledWorkspace: workspace), forURLScheme: "skynet-host")
        config.userContentController.addUserScript(
            WKUserScript(
                source: """
                    const apps = [
                        {id:'agent', name:'Agent', version:'1.1.0', builtin:true, permissions:[], status:'running', pid:1, actions:{}},
                        {id:'settings', name:'设置', version:'1.0.0', builtin:true, permissions:[], status:'running', pid:2, actions:{}},
                        {id:'app-center', name:'应用中心', version:'1.0.0', builtin:true, permissions:[], status:'stopped', pid:0, actions:{}}
                    ];
                    window.__commands = [];
                    window.__layouts = [];
                    window.__snapshot = {
                        revision: 1,
                        user: null,
                        apps,
                        capabilities: {platform:'macos', splitView:true, installApplications:true, localDevelopment:true, runtimeIsolation:'process'},
                        preferences: {appearance:'light', wallpaper:'coast', reduceMotion:true},
                        workspace: {mode:'desktop', panes:[], recent:['agent', 'settings'], ratio:0.5, desktop:['settings', 'app-center'], dock:['agent']}
                    };
                    const emit = () => {
                        window.__snapshot = {...window.__snapshot, revision: window.__snapshot.revision + 1};
                        window.dispatchEvent(new CustomEvent('workspace:snapshot', {detail: window.__snapshot}));
                        return window.__snapshot;
                    };
                    window.webkit = {messageHandlers:{workspace:{postMessage:async (message) => {
                        if (message.kind === 'initial') return window.__snapshot;
                        if (message.kind === 'layout') {
                            window.__layouts.push(message);
                            return null;
                        }
                        if (message.kind === 'command') {
                            window.__commands.push({name: message.name, input: message.input || {}});
                            const ws = {...window.__snapshot.workspace};
                            if (message.name === 'login') {
                                window.__snapshot = {
                                    ...window.__snapshot,
                                    user: {userId:'u1', username: message.input.username, url: message.input.url},
                                };
                            } else if (message.name === 'logout') {
                                window.__snapshot = {...window.__snapshot, user: null};
                            } else if (message.name === 'home') {
                                ws.mode = 'desktop';
                                window.__snapshot = {...window.__snapshot, workspace: ws};
                            } else if (message.name === 'overview') {
                                ws.mode = 'overview';
                                window.__snapshot = {...window.__snapshot, workspace: ws};
                            } else if (message.name === 'open') {
                                const id = message.input.appId;
                                const empty = ws.panes.indexOf(null);
                                if (ws.mode === 'apps' && ws.panes.length === 2 && empty >= 0 && !ws.panes.includes(id)) {
                                    ws.panes = ws.panes.map((p, i) => i === empty ? id : p);
                                } else {
                                    ws.panes = [id];
                                }
                                ws.recent = [id, ...ws.recent.filter(item => item !== id)];
                                ws.mode = 'apps';
                                window.__snapshot = {...window.__snapshot, workspace: ws};
                            } else if (message.name === 'restore') {
                                const id = message.input.appId;
                                if (!ws.panes.includes(id)) ws.panes = [id];
                                ws.recent = [id, ...ws.recent.filter(item => item !== id)];
                                ws.mode = 'apps';
                                window.__snapshot = {...window.__snapshot, workspace: ws};
                            } else if (message.name === 'split') {
                                const id = message.input.appId;
                                const dest = message.input.edge === 'left' ? 0 : 1;
                                ws.panes = dest === 0 ? [id, null] : [null, id];
                                ws.ratio = 0.5;
                                ws.mode = 'apps';
                                window.__snapshot = {...window.__snapshot, workspace: ws};
                            } else if (message.name === 'collapse') {
                                const keep = ws.panes[message.input.edge === 'left' ? 1 : 0];
                                ws.panes = keep ? [keep] : [];
                                ws.mode = keep ? 'apps' : 'desktop';
                                ws.ratio = 0.5;
                                window.__snapshot = {...window.__snapshot, workspace: ws};
                            } else if (message.name === 'close') {
                                const id = message.input.appId;
                                ws.recent = ws.recent.filter(item => item !== id);
                                ws.panes = ws.panes.map(p => p === id ? null : p);
                                if (ws.panes.every(p => !p)) ws.panes = [];
                                window.__snapshot = {...window.__snapshot, workspace: ws};
                            }
                            return emit();
                        }
                        return null;
                    }}}};
                    """, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 1024, height: 760), configuration: config)
        defer { web.stopLoading() }
        web.load(URLRequest(url: URL(string: "skynet-host://workspace/index.html")!))

        func until(_ expr: String, message: String = "") async throws {
            for _ in 0..<60 {
                if (try? await web.evaluateJavaScript(expr)) as? Bool == true { return }
                try await Task.sleep(for: .milliseconds(80))
            }
            let diag = try? await web.evaluateJavaScript(
                "JSON.stringify({text:document.body?.innerText?.slice(0,500),toasts:Array.from(document.querySelectorAll('[data-toast-id]')).map(n=>n.textContent),cmds:window.__commands,lastLayout:window.__layouts.at(-1)})"
            )
            XCTFail("Timed out: \(message.isEmpty ? expr : message)\n\(diag ?? "")")
            throw failure("webkit", "Timed out waiting for \(expr)")
        }

        // 1. Login centered card & pre-submit validation
        try await until(
            "document.querySelector('#gateway-url') !== null && document.querySelector('#gateway-username') !== null",
            message: "Login form mounted")
        let cardCentered =
            try await web.evaluateJavaScript(
                """
                (() => {
                    const card = document.querySelector('.astryx-card').getBoundingClientRect();
                    const center = card.left + card.width / 2;
                    return card.width <= 401 && Math.abs(center - innerWidth / 2) < 2;
                })()
                """) as? Bool
        XCTAssertEqual(cardCentered, true, "Login card should be centered and max 400px wide")
        _ = try await web.evaluateJavaScript("document.querySelector('button[type=submit]').click()")
        try await until(
            "document.body.innerText.includes('请输入用户名') && window.__commands.length === 0",
            message: "Empty username rejected client-side")
        _ = try await web.evaluateJavaScript(
            """
            (() => {
                const set = (el, val) => {
                    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, val);
                    el.dispatchEvent(new Event('input', {bubbles: true}));
                };
                set(document.querySelector('#gateway-url'), 'http://bad-protocol');
                set(document.querySelector('#gateway-username'), 'tester');
                document.querySelector('button[type=submit]').click();
            })()
            """)
        try await until(
            "document.body.innerText.includes('ws://') && window.__commands.length === 0",
            message: "Non-ws URL rejected client-side")
        _ = try await web.evaluateJavaScript(
            """
            (() => {
                const set = (el, val) => {
                    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, val);
                    el.dispatchEvent(new Event('input', {bubbles: true}));
                };
                set(document.querySelector('#gateway-url'), 'ws://127.0.0.1:18787/agent');
                document.querySelector('button[type=submit]').click();
            })()
            """)
        try await until(
            "document.querySelector('[data-drop-area=desktop]') !== null",
            message: "Desktop rendered after login")

        // 2. Account menu & logout confirmation dialog (cancel preserves session)
        _ = try await web.evaluateJavaScript(
            "Array.from(document.querySelectorAll('[role=toolbar] button')).find(b => b.textContent.includes('tester')).click()"
        )
        try await until(
            "document.querySelector('[role=menu]') !== null && document.body.innerText.includes('127.0.0.1:18787')",
            message: "Account menu opened with server host")
        _ = try await web.evaluateJavaScript(
            "Array.from(document.querySelectorAll('[role=menuitem]')).find(i => i.textContent.includes('退出登录')).click()"
        )
        try await until(
            "document.querySelector('dialog[open]') !== null && document.body.innerText.includes('确认退出登录')",
            message: "Logout confirmation AlertDialog opened")
        try await until(
            "window.__layouts.at(-1)?.modal === true && (window.__layouts.at(-1)?.overlays?.length ?? 0) >= 1 && window.__layouts.at(-1).overlays[0].radius > 0 && window.__layouts.at(-1).overlays[0].capture === true",
            message: "Modal dialog reports overlays + modal=true")
        _ = try await web.evaluateJavaScript(
            "Array.from(document.querySelectorAll('dialog[open] button')).find(b => b.textContent.trim() === '取消').click()"
        )
        try await until(
            "document.querySelector('dialog[open]') === null && window.__layouts.at(-1)?.modal === false && !window.__commands.some(c => c.name === 'logout')",
            message: "Canceling logout closes dialog without logging out")

        // 3. CommandPalette open via native event, search, execute, and overlays/modal bridge
        _ = try await web.evaluateJavaScript(
            "window.dispatchEvent(new CustomEvent('workspace:commandPalette'))")
        try await until(
            "document.querySelector('dialog[open] input') !== null && window.__layouts.at(-1)?.modal === true",
            message: "CommandPalette opened with modal=true")
        _ = try await web.evaluateJavaScript(
            """
            (() => {
                const input = document.querySelector('dialog[open] input');
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '后台');
                input.dispatchEvent(new Event('input', {bubbles: true}));
            })()
            """)
        try await until(
            "Array.from(document.querySelectorAll('[role=option]')).some(o => o.textContent.includes('后台应用'))",
            message: "CommandPalette filtered options")
        _ = try await web.evaluateJavaScript(
            "Array.from(document.querySelectorAll('[role=option]')).find(o => o.textContent.includes('后台应用')).click()"
        )
        try await until(
            "document.querySelector('dialog[open]') === null && document.querySelector('[role=toolbar][aria-label=\"后台应用\"]') !== null",
            message: "CommandPalette navigated to overview")

        // 4. Overview one-click split, active pane switching, empty split cancel
        _ = try await web.evaluateJavaScript(
            "document.querySelector('button[aria-label=\"分屏打开设置\"]').click()"
        )
        try await until(
            "document.querySelector('[data-pane-id=agent]') !== null && document.querySelector('[data-pane-id=settings]') !== null && document.querySelector('[data-pane-id=settings]').dataset.paneActive === 'true'",
            message: "Overview one-click split opened both apps with settings active")
        _ = try await web.evaluateJavaScript(
            "document.querySelector('[data-pane-id=agent]').dispatchEvent(new PointerEvent('pointerdown', {bubbles:true}))"
        )
        try await until(
            "document.querySelector('[data-pane-id=agent]').dataset.paneActive === 'true' && document.querySelector('[data-pane-id=settings]').dataset.paneActive === 'false'",
            message: "Clicking inactive split pane switched active indicator via restore")

        // Empty split pane cancel
        _ = try await web.evaluateJavaScript(
            """
            window.__snapshot = {
                ...window.__snapshot,
                revision: window.__snapshot.revision + 1,
                workspace: {...window.__snapshot.workspace, mode:'apps', panes:['agent', null]}
            };
            window.dispatchEvent(new CustomEvent('workspace:snapshot', {detail: window.__snapshot}));
            """)
        try await until(
            "Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === '取消分屏')",
            message: "Empty split toolbar rendered cancel button")
        _ = try await web.evaluateJavaScript(
            "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '取消分屏').click()"
        )
        try await until(
            "window.__commands.some(c => c.name === 'collapse' && c.input.edge === 'right') && document.querySelector('[data-pane-id=empty]') === null",
            message: "Cancel split collapsed empty slot")

        // 5. Overview close-all + empty state + Toast
        _ = try await web.evaluateJavaScript(
            """
            window.__snapshot = {
                ...window.__snapshot,
                revision: window.__snapshot.revision + 1,
                workspace: {...window.__snapshot.workspace, mode:'overview', recent:['agent', 'settings']}
            };
            window.dispatchEvent(new CustomEvent('workspace:snapshot', {detail: window.__snapshot}));
            """)
        try await until(
            "Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === '全部关闭')",
            message: "Overview close-all button visible")
        _ = try await web.evaluateJavaScript(
            "Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '全部关闭').click()"
        )
        try await until(
            "document.body.innerText.includes('暂无后台应用') && Array.from(document.querySelectorAll('[data-toast-id]')).some(n => n.textContent.includes('已关闭全部后台应用') && n.closest('[popover]')?.matches(':popover-open') === true)",
            message: "Close-all showed empty state and toast")

        // 6. Narrow viewport (390px) has no horizontal overflow across desktop, overview, and login
        web.frame = CGRect(x: 0, y: 0, width: 390, height: 760)
        for mode in ["desktop", "overview"] {
            _ = try await web.evaluateJavaScript(
                """
                window.__snapshot = {
                    ...window.__snapshot,
                    revision: window.__snapshot.revision + 1,
                    workspace: {...window.__snapshot.workspace, mode:'\(mode)', recent:['agent']}
                };
                window.dispatchEvent(new CustomEvent('workspace:snapshot', {detail: window.__snapshot}));
                """)
            try await until(
                "innerWidth === 390 && document.documentElement.scrollWidth <= 390",
                message: "No horizontal overflow at 390px in \(mode)")
        }
        // Confirm logout flow returns to login with no overflow at 390px
        _ = try await web.evaluateJavaScript(
            """
            window.__snapshot = {
                ...window.__snapshot,
                revision: window.__snapshot.revision + 1,
                workspace: {...window.__snapshot.workspace, mode:'desktop'}
            };
            window.dispatchEvent(new CustomEvent('workspace:snapshot', {detail: window.__snapshot}));
            """)
        try await until(
            "document.querySelector('[data-drop-area=desktop]') !== null", message: "Desktop ready at 390px")
        _ = try await web.evaluateJavaScript(
            "Array.from(document.querySelectorAll('[role=toolbar] button')).find(b => b.textContent.includes('tester')).click()"
        )
        try await until("document.querySelector('[role=menu]') !== null", message: "Account menu at 390px")
        _ = try await web.evaluateJavaScript(
            "Array.from(document.querySelectorAll('[role=menuitem]')).find(i => i.textContent.includes('退出登录')).click()"
        )
        try await until("document.querySelector('dialog[open]') !== null", message: "Logout dialog at 390px")
        _ = try await web.evaluateJavaScript(
            "Array.from(document.querySelectorAll('dialog[open] button')).find(b => b.textContent.trim() === '退出登录').click()"
        )
        try await until(
            "document.querySelector('#gateway-url') !== null && document.documentElement.scrollWidth <= 390",
            message: "Confirmed logout returned to login without overflow at 390px")
    }

    func testPackagedAgentChatDraftReloadAndNarrowLayout() async throws {
        _ = NSApplication.shared
        let native = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
            .deletingLastPathComponent().deletingLastPathComponent()
        let client = native.deletingLastPathComponent()
        let data = FileManager.default.temporaryDirectory.appendingPathComponent(
            "skynet-agent-web-\(UUID().uuidString)")
        let builtins = data.appendingPathComponent("builtins")
        try FileManager.default.createDirectory(at: data, withIntermediateDirectories: true)
        try FileManager.default.copyItem(at: client.appendingPathComponent("dist/builtins"), to: builtins)
        let environment = ProcessInfo.processInfo.environment
        let url = try XCTUnwrap(environment["SKYNET_TEST_SOCKET"])
        let runtime = try Data(
            contentsOf: URL(fileURLWithPath: XCTUnwrap(environment["SKYNET_TEST_AGENT_RUNTIME"])))
        let agent = builtins.appendingPathComponent("agent.skapp")
        try runtime.write(to: agent.appendingPathComponent("runtime.js"))
        let manifestURL = agent.appendingPathComponent("manifest.json")
        var manifest = try dictionary(JSONSerialization.jsonObject(with: Data(contentsOf: manifestURL)))
        manifest["networkOrigins"] = [url]
        var files = dictionary(manifest["files"])
        files["runtime.js"] = SHA256.hash(data: runtime).map { String(format: "%02x", $0) }.joined()
        manifest["files"] = files
        try jsonData(manifest).write(to: manifestURL)
        let core = try HostCore(
            dataRoot: data.appendingPathComponent("data"), builtins: builtins,
            launcher: native.appendingPathComponent(".build/c-core/process_launcher"),
            executable: native.appendingPathComponent(".build/out/Products/Debug/SkynetAppRuntime"))
        _ = try await login(core, url: url, username: "webkit-agent")
        let harness = WebHarness(core: core, entry: try XCTUnwrap(core.appCatalog.entries["agent"]))
        defer {
            harness.close()
            core.shutdown()
            try? FileManager.default.removeItem(at: data)
        }
        try await harness.untilToolbar("connection", labelContaining: "连接与设备 · 已连接")
        try await harness.untilToolbar("sidebar", labelContaining: "会话列表")
        try await harness.untilToolbar("new", labelContaining: "新建会话")
        try await harness.until("document.body.innerText.includes('与 Agent 开始一个新任务')")
        try await harness.click("梳理项目结构与入口")
        try await harness.until(
            "document.querySelector('#agent-message [contenteditable]')?.textContent?.includes('梳理当前工作目录') === true"
        )
        _ = try await harness.web.evaluateJavaScript(
            """
            (()=>{ const e=document.querySelector('#agent-message [contenteditable]');
            e.textContent='WebKit chat';
            e.dispatchEvent(new Event('input',{bubbles:true})); })()
            """)
        try await harness.until("!document.querySelector('button[aria-label=\"发送\"]').disabled")
        try await harness.click("发送")
        let thoughtButton =
            "label => Array.from(document.querySelectorAll('button[aria-expanded]')).find(button => button.textContent.trim() === label)"
        try await harness.until(
            "(\(thoughtButton))('正在思考')?.getAttribute('aria-expanded') === 'true' && document.body.innerText.includes('先检查会话目录。')"
        )
        try await harness.until(
            "(\(thoughtButton))('exec_command · 正在思考')?.getAttribute('aria-expanded') === 'true' && document.body.innerText.includes('确认当前工作目录。')"
        )
        try await harness.click("exec_command · 正在思考")
        try await harness.click("exec_command · 正在思考")
        try await harness.until("document.body.textContent.includes('binary✓')")
        try await harness.until("!document.body.textContent.includes('正在生成')")
        try await harness.until("(\(thoughtButton))('思考记录')?.getAttribute('aria-expanded') === 'false'")
        try await harness.click("思考记录")
        try await harness.until("document.body.innerText.includes('先检查会话目录。')")
        try await harness.until(
            "document.querySelector('nav[aria-label=\"会话列表\"]')?.textContent?.includes('Native Agent') === true"
        )
        let callRow =
            "Array.from(document.querySelectorAll('[role=button]')).find(row=>row.textContent.includes('exec_command') && row.textContent.includes('pwd'))"
        try await harness.until("\(callRow)?.getAttribute('aria-expanded') === 'false'")
        try await harness.until(
            "(\(thoughtButton))('exec_command · 思考记录')?.getAttribute('aria-expanded') === 'true'")
        try await harness.until("document.body.innerText.includes('确认当前工作目录。')")
        _ = try await harness.web.evaluateJavaScript("\(callRow).click()")
        try await harness.until(
            "document.body.innerText.includes('background✓') && document.body.innerText.includes('/workspace')"
        )
        _ = try await harness.web.evaluateJavaScript("\(callRow).click()")
        try await harness.until("document.querySelector('button[aria-label=\"复制消息\"]') !== null")
        try await harness.activateToolbar("sidebar")
        try await harness.until(
            "(document.querySelector('nav[aria-label=\"会话列表\"]')?.getBoundingClientRect().width ?? 999) < 100"
        )
        try await harness.activateToolbar("sidebar")
        try await harness.until(
            "(document.querySelector('nav[aria-label=\"会话列表\"]')?.getBoundingClientRect().width ?? 0) >= 200"
        )
        try await harness.activateToolbar("connection")
        try await harness.until(
            "document.body.innerText.includes('服务器连接') && document.body.innerText.includes('webkit-agent')"
        )
        try await harness.click("完成")
        try await harness.until("!document.body.innerText.includes('服务器连接')")
        _ = try await harness.web.evaluateJavaScript(
            """
            (()=>{const e=document.querySelector('.agent-chat');
            e.dispatchEvent(new WheelEvent('wheel',{deltaY:-300,bubbles:true}));
            e.scrollTop=230;e.dispatchEvent(new Event('scroll'));})()
            """)
        // Let content-visibility and the scroller's observers settle before recording.
        try await Task.sleep(for: .milliseconds(250))
        let before =
            try await harness.web.evaluateJavaScript(
                "document.querySelector('.agent-chat').scrollTop") as! Double
        XCTAssertGreaterThan(before, 0)
        _ = try await harness.web.evaluateJavaScript("document.getElementById('agent-model').click()")
        try await harness.until(
            "Array.from(document.querySelectorAll('[role=option]')).some(e=>e.textContent.includes('Fixture 2'))"
        )
        _ = try await harness.web.evaluateJavaScript(
            "Array.from(document.querySelectorAll('[role=option]')).find(e=>e.textContent.includes('Fixture 2')).click()"
        )
        try await harness.until(
            "document.getElementById('agent-model').textContent.includes('Fixture 2')")
        try await Task.sleep(for: .milliseconds(250))
        let after =
            try await harness.web.evaluateJavaScript(
                "document.querySelector('.agent-chat').scrollTop") as! Double
        XCTAssertEqual(
            after, before, accuracy: 2, "model-only updates must preserve the transcript reading position")
        try await harness.until("!document.body.textContent.includes('模型切换正在进行')")
        try await harness.capture(client.appendingPathComponent("test-artifacts/agent-webkit.png"))
        _ = try await harness.web.evaluateJavaScript(
            """
            (()=>{const e=document.querySelector('#agent-message [contenteditable]');
            e.textContent='保留这份草稿';
            e.dispatchEvent(new Event('input',{bubbles:true})); })()
            """)
        try await harness.until(
            "document.querySelector('#agent-message [contenteditable]').textContent==='保留这份草稿'")
        let persisted = expectation(description: "Agent draft durably committed")
        var once = false
        let observer = core.attach(appId: "agent") { snapshot in
            if dictionary(dictionary(snapshot["state"])["drafts"])["session"] as? String == "保留这份草稿", !once {
                once = true
                persisted.fulfill()
            }
        }
        await fulfillment(of: [persisted], timeout: 4)
        core.detach(observer)
        harness.web.reload()
        try await harness.until(
            "document.querySelector('#agent-message [contenteditable]')?.textContent==='保留这份草稿'")
        try await harness.until("document.body.textContent.includes('binary✓')")
        harness.web.setFrameSize(NSSize(width: 420, height: 700))
        try await harness.activateToolbar("new")
        try await harness.until("document.body.innerText.includes('与 Agent 开始一个新任务')")
        try await harness.activateToolbar("sidebar")
        try await harness.until(
            "Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'Native Agent')"
        )
        try await harness.click("Native Agent")
        try await harness.until("!document.querySelector('dialog[open]')")
        try await harness.until("document.body.textContent.includes('binary✓')")
        try await harness.until("document.documentElement.scrollWidth<=420")
        try await harness.capture(client.appendingPathComponent("test-artifacts/agent-narrow-webkit.png"))
        harness.web.setFrameSize(NSSize(width: 420, height: 300))
        try await harness.until(
            "getComputedStyle(document.querySelector('.agent-conversation-header')).display === 'none'")
        _ = try await harness.web.evaluateJavaScript(
            "(()=>{ document.querySelector('#agent-message [contenteditable]')?.focus(); return true; })()")
        try await harness.until(
            """
            (()=>{ const input = document.querySelector('#agent-message [contenteditable]');
            const rect = input?.getBoundingClientRect();
            return Boolean(input && rect && document.activeElement === input && rect.top >= 0 && rect.bottom <= 300); })()
            """
        )
    }

    func testLargeHistoryCanOpenAndContinueInTheMacRuntime() async throws {
        _ = NSApplication.shared
        let native = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
            .deletingLastPathComponent().deletingLastPathComponent()
        let data = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let core = try HostCore(
            dataRoot: data,
            builtins: native.deletingLastPathComponent().appendingPathComponent("dist/builtins"),
            launcher: native.appendingPathComponent(".build/c-core/process_launcher"),
            executable: native.appendingPathComponent(".build/out/Products/Debug/SkynetAppRuntime"))
        defer {
            core.shutdown()
            try? FileManager.default.removeItem(at: data)
        }
        _ = try await login(
            core, url: XCTUnwrap(ProcessInfo.processInfo.environment["SKYNET_TEST_SOCKET"]),
            username: "fragment-history")
        let harness = WebHarness(core: core, entry: try XCTUnwrap(core.appCatalog.entries["agent"]))
        defer { harness.close() }
        try await harness.untilToolbar("connection", labelContaining: "连接与设备 · 已连接")
        try await harness.until(
            "Array.from(document.querySelectorAll('nav[aria-label=\"会话列表\"] button')).some(button => button.textContent.trim() === '大消息验收')"
        )
        try await harness.click("大消息验收")
        try await harness.until("document.body.innerText.includes('已记住代号青舟17。')")
        try await harness.until("document.querySelectorAll('[data-history-message]').length === 20")
        _ = try await harness.web.evaluateJavaScript(
            """
            (()=>{ const chat=document.querySelector('.agent-chat');
            chat.dispatchEvent(new WheelEvent('wheel',{deltaY:-300,bubbles:true}));
            chat.scrollTop=0; chat.dispatchEvent(new Event('scroll')); })()
            """)
        try await harness.until("document.querySelectorAll('[data-history-message]').length === 30")
        try await harness.until("document.querySelector('.agent-chat').scrollTop > 100")

        _ = try await harness.web.evaluateJavaScript(
            """
            (()=>{ const e=document.querySelector('#agent-message [contenteditable]');
            e.textContent='请回复约定的代号'; e.dispatchEvent(new Event('input',{bubbles:true})); })()
            """)
        try await harness.until("!document.querySelector('button[aria-label=发送]').disabled")
        try await harness.click("发送")
        try await harness.until("document.body.innerText.split('青舟17').length >= 3")
    }

    func testAppCenterCoversAndResponsiveAppCatalog() async throws {
        _ = NSApplication.shared
        let native = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
            .deletingLastPathComponent().deletingLastPathComponent()
        let data = FileManager.default.temporaryDirectory.appendingPathComponent(
            "app-center-\(UUID().uuidString)")
        let core = try HostCore(
            dataRoot: data,
            builtins: native.deletingLastPathComponent().appendingPathComponent("dist/builtins"),
            launcher: native.appendingPathComponent(".build/c-core/process_launcher"),
            executable: native.appendingPathComponent(".build/out/Products/Debug/SkynetAppRuntime"))
        defer {
            core.shutdown()
            try? FileManager.default.removeItem(at: data)
        }
        _ = try await login(
            core, url: XCTUnwrap(ProcessInfo.processInfo.environment["SKYNET_TEST_SOCKET"]),
            username: "app-center-test")
        let harness = WebHarness(core: core, entry: try XCTUnwrap(core.appCatalog.entries["app-center"]))
        defer { harness.close() }
        try await harness.until("document.querySelectorAll('article').length === 3")
        try await harness.untilToolbar("refresh", labelContaining: "刷新")
        try await harness.untilToolbar("admin", labelContaining: "管理员解锁")
        try await harness.until(
            """
            Array.from(document.images).filter(image => image.naturalWidth > 0).length === 2
                && document.querySelectorAll('article')[2].innerText.includes('日历')
            """)
        let positions =
            "Array.from(document.querySelectorAll('article'), item => item.getBoundingClientRect())"
        try await harness.until("\(positions)[0].top === \(positions)[1].top")
        harness.web.setFrameSize(NSSize(width: 320, height: 640))
        try await harness.until(
            """
            \(positions)[1].top >= \(positions)[0].bottom
                && document.documentElement.scrollWidth <= innerWidth
            """)
        // Discover detail drawer opens on card click and closes cleanly.
        _ = try await harness.web.evaluateJavaScript(
            "document.querySelector('[data-discover-app] button, article button')?.click()")
        try await harness.until(
            "document.querySelector('dialog[open]')?.innerText.includes('目录信息') === true")
        try await harness.click("关闭")
        try await harness.until("document.querySelector('dialog[open]') === null")

        // Discover search filters results and clear restores catalog.
        _ = try await harness.web.evaluateJavaScript(
            """
            (() => {
                const search = document.querySelector('input[placeholder*="搜索"]');
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, '日历');
                search.dispatchEvent(new Event('input', {bubbles:true}));
            })()
            """)
        try await harness.until("document.querySelectorAll('article').length === 1")
        _ = try await harness.web.evaluateJavaScript(
            """
            (() => {
                const search = document.querySelector('input[placeholder*="搜索"]');
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, '');
                search.dispatchEvent(new Event('input', {bubbles:true}));
            })()
            """)
        try await harness.until("document.querySelectorAll('article').length === 3")

        try await harness.click("服务管理")
        try await harness.until("document.querySelector('dialog[open] input[type=password]') !== null")
        // Empty admin token shows inline Chinese validation without dismissing dialog.
        try await harness.click("解锁")
        try await harness.until(
            "document.querySelector('dialog[open]')?.innerText.includes('请输入管理令牌') === true")
        _ = try await harness.web.evaluateJavaScript(
            """
            (() => {
                const token = document.querySelector('dialog[open] input[type=password]');
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(token, 'app-center-test');
                token.dispatchEvent(new Event('input', {bubbles:true}));
            })()
            """)
        try await harness.click("解锁")
        try await harness.until("document.querySelectorAll('article').length === 6")
        try await harness.untilToolbar("admin", labelContaining: "待审 · 2")
        try await harness.until(
            "document.body.innerText.includes('有 2 项上架或更新申请待审批')")

        // Status filter narrows to pending items and resets back to all.
        try await harness.click("仅看待审批")
        try await harness.until("document.querySelectorAll('article').length === 2")
        try await harness.click("全部 (6)")
        try await harness.until("document.querySelectorAll('article').length === 6")

        let buttons =
            "Array.from(document.querySelectorAll('article'), row => Array.from(row.querySelectorAll('button'), b => b.textContent.trim()).filter(Boolean).join(','))"
        try await harness.until(
            "JSON.stringify(\(buttons)) === JSON.stringify(['','停用,下架','批准,拒绝','','','批准,拒绝,启用,下架'])")

        // Service detail drawer shows metadata for selected service.
        try await harness.click("查看 Agent 详情")
        try await harness.until(
            "document.querySelector('dialog[open]')?.innerText.includes('运行状态') === true")
        try await harness.click("关闭")
        try await harness.until("document.querySelector('dialog[open]') === null")

        try await harness.click("停用")
        try await harness.until("document.querySelector('[role=alertdialog]') !== null")
        _ = try await harness.web.evaluateJavaScript(
            "Array.from(document.querySelectorAll('[role=alertdialog] button')).find(b => b.textContent.trim() === '停用').click()"
        )
        try await harness.until("\(buttons)[1] === '启用,下架'")
        _ = try await harness.web.evaluateJavaScript(
            "Array.from(document.querySelectorAll('article')[1].querySelectorAll('button')).find(b => b.textContent.trim() === '启用')?.click()"
        )
        try await harness.until("\(buttons)[1] === '停用,下架'")
        try await harness.until("document.documentElement.scrollWidth <= innerWidth")
    }

    func testPackagedSettingsBridgeThemeAndResponsiveLayout() async throws {
        _ = NSApplication.shared
        let native = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        let client = native.deletingLastPathComponent()
        let data = FileManager.default.temporaryDirectory.appendingPathComponent(
            "skynet-webkit-\(UUID().uuidString)")
        let core = try HostCore(
            dataRoot: data, builtins: client.appendingPathComponent("dist/builtins"),
            launcher: native.appendingPathComponent(".build/c-core/process_launcher"),
            executable: native.appendingPathComponent(".build/out/Products/Debug/SkynetAppRuntime"))
        _ = try await login(
            core, url: XCTUnwrap(ProcessInfo.processInfo.environment["SKYNET_TEST_SOCKET"]),
            username: "settings")
        let entry = try XCTUnwrap(core.appCatalog.entries["settings"])
        let harness = WebHarness(core: core, entry: entry)
        defer {
            harness.close()
            core.shutdown()
            try? FileManager.default.removeItem(at: data)
        }
        try await harness.until("document.body.innerText.includes('外观模式')")
        try await harness.until("typeof window.__skynetTransport?.postMessage === 'function'")
        try await harness.waitForPresentation(1)
        XCTAssertEqual(harness.presentations[0]["section"] as? String, "外观")
        try await harness.untilToolbar("sidebar", labelContaining: "设置导航")
        try await harness.until(
            "document.documentElement.dataset.astryxTheme==='neutral'"
        )
        try await harness.until(
            "parseFloat(getComputedStyle(document.querySelector('.astryx-card')).borderRadius)>0")
        try await harness.click("深色")
        try await harness.until("document.documentElement.dataset.theme==='dark'")
        try await harness.click("壁纸")
        try await harness.until(
            "document.querySelector('h1')?.textContent==='壁纸' && document.body.innerText.includes('选择壁纸')"
        )
        try await harness.click("暮色")
        try await harness.until(
            "Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim()==='暮色' && b.getAttribute('aria-pressed')==='true')"
        )
        try await harness.capture(client.appendingPathComponent("test-artifacts/settings-webkit.png"))
        harness.web.setFrameSize(NSSize(width: 420, height: 700))
        try await harness.until("document.querySelector('[aria-label=\"设置分类\"]') !== null")
        try await harness.until(
            "document.querySelector('[data-settings-content]').clientWidth <= innerWidth"
        )
        let overflowing =
            try await harness.web.evaluateJavaScript("document.documentElement.scrollWidth > 420") as? Bool
        XCTAssertEqual(overflowing, false)
        try await harness.capture(client.appendingPathComponent("test-artifacts/settings-narrow-webkit.png"))
        harness.web.reload()
        try await harness.until(
            "document.body.innerText.includes('选择壁纸') && document.documentElement.dataset.theme==='dark'")
        try await harness.waitForPresentation(2)
        XCTAssertEqual(harness.presentations[1]["section"] as? String, "壁纸")
        XCTAssertEqual(harness.presentations[1]["dark"] as? Bool, true)
        try await harness.until(
            "window.__skynetInitialSnapshot.state.section==='wallpaper' && document.querySelector('[data-wallpaper-preview]').style.background.includes('--wallpaper-')"
        )
        harness.web.setFrameSize(NSSize(width: 240, height: 700))
        try await harness.until(
            "getComputedStyle(document.querySelector('[data-wallpaper-choices]')).gridTemplateColumns.split(' ').length===1"
        )
        try await harness.until(
            "document.querySelector('[data-settings-content]').scrollWidth <= document.querySelector('[data-settings-content]').clientWidth"
        )
        try await harness.click("动态效果")
        try await harness.until(
            "document.querySelector('h1')?.textContent==='动态效果' && document.body.innerText.includes('减少动态效果')"
        )
        try await harness.until(
            "document.querySelector('input[role=switch]').parentElement.getBoundingClientRect().width>=28")
        harness.web.setFrameSize(NSSize(width: 1200, height: 780))
        try await harness.until("document.querySelector('[aria-label=\"设置导航\"]') !== null")
        try await harness.click("应用管理")
        try await harness.until(
            "document.querySelector('h1')?.textContent==='应用管理' && document.querySelectorAll('article').length >= 2"
        )
        try await harness.until(
            "document.querySelectorAll('[aria-label=\"按状态筛选应用\"] button[aria-pressed]').length >= 4"
        )
        try await harness.until(
            "Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === '安装应用')"
        )
        try await harness.click("查看 设置 详情")
        try await harness.until(
            "document.querySelector('dialog[open]') !== null && document.querySelector('dialog[open]').innerText.includes('声明权限')"
        )
        try await harness.click("关闭")
        try await harness.until("document.querySelector('dialog[open]') === null")
        try await harness.activateToolbar("sidebar")
        try await harness.until(
            "(document.querySelector('nav[aria-label=\"设置导航\"]')?.getBoundingClientRect().width ?? 999) < 100"
        )
        try await harness.activateToolbar("sidebar")
        try await harness.until(
            "(document.querySelector('nav[aria-label=\"设置导航\"]')?.getBoundingClientRect().width ?? 0) >= 200"
        )
        try await harness.click("关于")
        try await harness.until(
            "document.querySelector('h1')?.textContent==='关于' && document.body.innerText.includes('复制诊断信息')"
        )
        try await harness.until(
            "Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === '刷新版本')"
        )
        let agent = WebHarness(core: core, entry: try XCTUnwrap(core.appCatalog.entries["agent"]))
        defer { agent.close() }
        try await agent.untilToolbar("new", labelContaining: "新建会话")
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
    private var toolbarItems: [[String: Any]] = []
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
                if !self.started {
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
        if kind == "view.toolbar", body["presentationId"] as? String == presentationId {
            toolbarItems = dictionary(body["input"])["items"] as? [[String: Any]] ?? []
            emit(["requestId": id, "value": [:]])
            return
        }
        if kind == "view.ready" {
            guard body["presentationId"] as? String == presentationId else { return }
            web.evaluateJavaScript(
                """
                ({dark: document.documentElement.dataset.theme==='dark',
                  section: document.querySelector('h1')?.textContent})
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
            toolbarItems = []
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
    func untilToolbar(_ action: String, labelContaining: String) async throws {
        for _ in 0..<60 {
            if toolbarItems.contains(where: {
                $0["id"] as? String == action && ($0["label"] as? String)?.contains(labelContaining) == true
            }) {
                return
            }
            try await Task.sleep(for: .milliseconds(100))
        }
        throw failure("toolbar", "Missing toolbar action: \(action)")
    }
    func activateToolbar(_ action: String) async throws {
        for _ in 0..<60 {
            let choices = toolbarItems.flatMap { ($0["choices"] as? [[String: Any]]) ?? [$0] }
            if choices.contains(where: { $0["id"] as? String == action }) {
                break
            }
            try await Task.sleep(for: .milliseconds(100))
        }
        let available = toolbarItems.flatMap { ($0["choices"] as? [[String: Any]]) ?? [$0] }
        guard available.contains(where: { $0["id"] as? String == action }) else {
            XCTFail("Missing declared action \(action), available: \(available.compactMap { $0["id"] })")
            throw failure("toolbar", "Missing action \(action)")
        }
        _ = try await web.callAsyncJavaScript(
            "window.dispatchEvent(new CustomEvent('skynet:toolbar', {detail: {id, presentationId}}));",
            arguments: ["id": action, "presentationId": presentationId], in: nil, contentWorld: .page)
    }
    func click(_ label: String) async throws {
        let json = String(data: try jsonData(label), encoding: .utf8)!
        let found =
            try await web.evaluateJavaScript(
                """
                (()=>{
                    const dialogs=Array.from(document.querySelectorAll('dialog[open]'));
                    const root=dialogs[dialogs.length-1]??document;
                    const match=b=>!b.closest('dialog:not([open])')&&b.getClientRects().length>0&&(b.getAttribute('aria-label')===\(json)||b.textContent.trim()===\(json));
                    const b=Array.from(root.querySelectorAll('button')).find(match)??Array.from(document.querySelectorAll('button')).find(match);
                    if(!b)return false;
                    b.click();
                    return true;
                })()
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
