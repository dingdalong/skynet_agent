import React
import ReactAppDependencyProvider
import React_RCTAppDelegate
import SkynetHostCore
import SwiftUI

/// The application delegate owns core lifetime. React modules only borrow it.
enum HostServices {
    static weak var delegate: AppDelegate?
    static var core: HostCore { delegate!.core }
}

@main
struct SkynetApplication: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    var body: some Scene {
        Window("Skynet Agent", id: "main") {
            ReactNativeView(factory: appDelegate.factory)
                .frame(minWidth: 360, minHeight: 480)
                .preferredColorScheme(appDelegate.colorScheme)
        }
        .defaultSize(width: 1280, height: 820)
        .windowStyle(.hiddenTitleBar)
        .commands {
            CommandGroup(after: .appInfo) {
                Button("返回桌面") { appDelegate.core.workspace("home") }.keyboardShortcut(
                    "h", modifiers: [.command, .shift])
                Button("后台应用") { appDelegate.core.workspace("overview") }.keyboardShortcut(
                    "e", modifiers: [.command])
            }
            CommandGroup(replacing: .newItem) {}
            CommandMenu("工作空间") {
                Button("重新载入界面") { RCTTriggerReloadCommandListeners("workspace menu") }
                    .keyboardShortcut("r", modifiers: [.command, .shift])
            }
        }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, ObservableObject {
    let core: HostCore
    let factory: RCTReactNativeFactory
    @Published private(set) var colorScheme: ColorScheme?
    private let reactDelegate: ReactNativeDelegate
    private var appearanceObservation: UUID?
    override init() {
        let resources = Bundle.main.resourceURL!
        let dataRoot: URL
        if let path = ProcessInfo.processInfo.environment["SKYNET_DATA_ROOT"] {
            dataRoot = URL(fileURLWithPath: path)
        } else {
            dataRoot = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
                .appendingPathComponent("Skynet Agent")
        }
        do {
            core = try HostCore(
                dataRoot: dataRoot, builtins: resources.appendingPathComponent("builtins"),
                launcher: resources.deletingLastPathComponent().appendingPathComponent(
                    "Helpers/process_launcher"),
                executable: resources.deletingLastPathComponent().appendingPathComponent(
                    "Helpers/SkynetAppRuntime"))
        } catch { fatalError("HostCore initialization failed: \(error)") }
        reactDelegate = ReactNativeDelegate()
        reactDelegate.dependencyProvider = RCTAppDependencyProvider()
        factory = RCTReactNativeFactory(delegate: reactDelegate)
        super.init()
        HostServices.delegate = self
        appearanceObservation = core.observe { [weak self] snapshot in
            let appearance = (snapshot["preferences"] as? [String: Any])?["appearance"] as? String
            DispatchQueue.main.async {
                // SwiftUI owns the window appearance separately from the application default.
                self?.colorScheme = appearance == "dark" ? .dark : appearance == "light" ? .light : nil
                NSApplication.shared.appearance =
                    appearance == "dark"
                    ? NSAppearance(named: .darkAqua)
                    : appearance == "light" ? NSAppearance(named: .aqua) : nil
            }
        }
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationWillTerminate(_ notification: Notification) {
        if let appearanceObservation { core.unobserve(appearanceObservation) }
        core.shutdown()
    }
}

final class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
    override func sourceURL(for bridge: RCTBridge) -> URL? { bundleURL() }
    override func bundleURL() -> URL? {
        if ProcessInfo.processInfo.environment["SKYNET_METRO"] == "1" {
            return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
        }
        return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    }
}

struct ReactNativeView: NSViewRepresentable {
    let factory: RCTReactNativeFactory
    func makeNSView(context: Context) -> NSView {
        factory.rootViewFactory.view(withModuleName: "SkynetHost")
    }
    func updateNSView(_ nsView: NSView, context: Context) {}
}
