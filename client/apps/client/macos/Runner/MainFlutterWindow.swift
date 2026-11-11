import Cocoa
import FlutterMacOS

class MainFlutterWindow: NSWindow {
    private var effects: ApplePlatformEffects?
    override func awakeFromNib() {
        let flutterViewController = FlutterViewController()
        let windowFrame = self.frame
        self.contentViewController = flutterViewController
        self.setFrame(windowFrame, display: true)
        self.setContentSize(NSSize(width: 1180, height: 820))
        self.contentMinSize = NSSize(width: 390, height: 480)
        self.center()

        RegisterGeneratedPlugins(registry: flutterViewController)
        effects = ApplePlatformEffects(
            window: self, registrar: flutterViewController.registrar(forPlugin: "ApplePlatformEffects"))
        titlebarAppearsTransparent = true

        super.awakeFromNib()
    }
}

/// Platform effects never own app state or intercept Flutter input.
private final class ApplePlatformEffects {
    private weak var window: NSWindow?
    private let channel: FlutterMethodChannel
    private var observer: NSObjectProtocol?

    init(window: NSWindow, registrar: FlutterPluginRegistrar) {
        self.window = window
        channel = FlutterMethodChannel(name: "skynet/apple-effects", binaryMessenger: registrar.messenger)
        registrar.register(AppleGlassFactory(messenger: registrar.messenger), withId: "skynet/apple-glass")
        channel.setMethodCallHandler { [weak self] call, result in
            guard let self = self else {
                result(nil)
                return
            }
            switch call.method {
            case "settings": result(self.settings())
            case "appearance":
                if let args = call.arguments as? [String: Any] {
                    self.window?.appearance =
                        args["system"] as? Bool == true
                        ? nil : NSAppearance(named: args["dark"] as? Bool == true ? .darkAqua : .aqua)
                    if let number = args["background"] as? NSNumber {
                        let color = number.uint32Value
                        self.window?.backgroundColor = NSColor(
                            srgbRed: CGFloat((color >> 16) & 255) / 255,
                            green: CGFloat((color >> 8) & 255) / 255, blue: CGFloat(color & 255) / 255,
                            alpha: 1)
                    }
                }
                result(nil)
            default: result(FlutterMethodNotImplemented)
            }
        }
        observer = NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.accessibilityDisplayOptionsDidChangeNotification, object: nil, queue: .main
        ) { [weak self] _ in
            guard let self = self else { return }
            self.channel.invokeMethod("settingsChanged", arguments: self.settings())
        }
    }

    private func settings() -> [String: Bool] {
        var glass = false
        if #available(macOS 26.0, *) { glass = true }
        return [
            "glass": glass,
            "reduceTransparency": NSWorkspace.shared.accessibilityDisplayShouldReduceTransparency,
            "highContrast": NSWorkspace.shared.accessibilityDisplayShouldIncreaseContrast,
            "reduceMotion": NSWorkspace.shared.accessibilityDisplayShouldReduceMotion,
        ]
    }

    deinit {
        if let observer = observer { NSWorkspace.shared.notificationCenter.removeObserver(observer) }
        channel.setMethodCallHandler(nil)
    }
}

private final class AppleGlassFactory: NSObject, FlutterPlatformViewFactory {
    private let messenger: FlutterBinaryMessenger
    init(messenger: FlutterBinaryMessenger) { self.messenger = messenger }
    func createArgsCodec() -> (FlutterMessageCodec & NSObjectProtocol)? {
        FlutterStandardMessageCodec.sharedInstance()
    }
    func create(withViewIdentifier viewId: Int64, arguments args: Any?) -> NSView {
        AppleGlassBackground(id: viewId, messenger: messenger, arguments: args as? [String: Any] ?? [:])
    }
}

private final class AppleGlassBackground: NSView {
    private let channel: FlutterMethodChannel
    init(id: Int64, messenger: FlutterBinaryMessenger, arguments: [String: Any]) {
        channel = FlutterMethodChannel(name: "skynet/apple-glass/\(id)", binaryMessenger: messenger)
        super.init(frame: .zero)
        setAccessibilityElement(false)
        appearance = NSAppearance(named: arguments["dark"] as? Bool == true ? .darkAqua : .aqua)
        if #available(macOS 26.0, *) {
            let glass = NSGlassEffectView(frame: bounds)
            glass.style = .regular
            glass.cornerRadius = (arguments["radius"] as? NSNumber)?.doubleValue ?? 26
            if #available(macOS 27.0, *) { glass.effectIsInteractive = false }
            glass.autoresizingMask = [.width, .height]
            addSubview(glass)
        }
        channel.setMethodCallHandler { [weak self] call, result in
            if call.method == "appearance", let args = call.arguments as? [String: Any] {
                self?.appearance = NSAppearance(named: args["dark"] as? Bool == true ? .darkAqua : .aqua)
                result(nil)
            } else {
                result(FlutterMethodNotImplemented)
            }
        }
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }
    override func hitTest(_ point: NSPoint) -> NSView? { nil }
    deinit { channel.setMethodCallHandler(nil) }
}
