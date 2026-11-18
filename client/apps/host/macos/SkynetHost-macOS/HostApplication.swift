import SkynetHostCore
import SwiftUI

enum HostServices {
    static weak var delegate: AppDelegate?
    static var core: HostCore { delegate!.core }
}

@main
struct SkynetApplication: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    var body: some Scene {
        Window("Skynet Agent", id: "main") {
            WorkspaceWindow(delegate: appDelegate)
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
                Button("重新载入界面") { appDelegate.workspace?.reload() }
                    .keyboardShortcut("r", modifiers: [.command, .shift])
            }
        }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, ObservableObject {
    let core: HostCore
    weak var workspace: WorkspaceHost?
    @Published private(set) var colorScheme: ColorScheme?
    private var appearanceObservation: UUID?
    override init() {
        let resources = Bundle.main.resourceURL!
        let dataRoot = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Skynet Agent")
        do {
            core = try HostCore(
                dataRoot: dataRoot, builtins: resources.appendingPathComponent("builtins"),
                launcher: resources.deletingLastPathComponent().appendingPathComponent(
                    "Helpers/process_launcher"),
                executable: resources.deletingLastPathComponent().appendingPathComponent(
                    "Helpers/SkynetAppRuntime"))
        } catch { fatalError("HostCore initialization failed: \(error)") }
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

private struct WorkspaceWindow: NSViewRepresentable {
    let delegate: AppDelegate
    func makeNSView(context: Context) -> NSView {
        let workspace = WorkspaceHost(frame: .zero)
        delegate.workspace = workspace
        return workspace
    }
    func updateNSView(_ nsView: NSView, context: Context) {}
}
