import AppKit
import React
import SkynetHostCore

@objc(SkynetHost)
final class HostBridge: RCTEventEmitter {
    private var observation: UUID?
    override static func requiresMainQueueSetup() -> Bool { true }
    override func supportedEvents() -> [String]! { ["workspace"] }
    override func startObserving() {
        guard observation == nil else { return }
        observation = HostServices.core.observe { [weak self] value in
            DispatchQueue.main.async { self?.sendEvent(withName: "workspace", body: value) }
        }
    }
    override func stopObserving() {
        if let observation { HostServices.core.unobserve(observation) }
        observation = nil
    }
    @objc(command:input:resolve:reject:)
    func command(
        _ name: String, input: NSDictionary, resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        HostServices.core.workspace(name, input: input as? [String: Any] ?? [:]) { result in
            switch result {
            case .success(let value): resolve(value)
            case .failure(let error): reject("host", String(describing: error), error)
            }
        }
    }
    deinit { if let observation { HostServices.core.unobserve(observation) } }
}

@objc(SkynetIconManager)
final class IconManager: RCTViewManager {
    override static func requiresMainQueueSetup() -> Bool { true }
    override func view() -> NSView! { SymbolView() }
}
final class SymbolView: NSImageView {
    @objc var symbol: String = "" { didSet { update() } }
    @objc var tint: String = "#18181b" { didSet { update() } }
    private func update() {
        image = NSImage(systemSymbolName: symbol, accessibilityDescription: nil)?
            .withSymbolConfiguration(.init(pointSize: 26, weight: .regular))
        contentTintColor = NSColor(hex: tint)
        imageScaling = .scaleProportionallyUpOrDown
    }
}

@objc(SkynetWallpaperManager)
final class WallpaperManager: RCTViewManager {
    override static func requiresMainQueueSetup() -> Bool { true }
    override func view() -> NSView! { WallpaperView() }
}
final class WallpaperView: NSView {
    @objc var colors: [String] = [] { didSet { needsDisplay = true } }
    override func hitTest(_ point: NSPoint) -> NSView? { nil }
    override func draw(_ dirtyRect: NSRect) {
        guard colors.count >= 2 else { return }
        NSGradient(colors: colors.map(NSColor.init(hex:)))?.draw(in: bounds, angle: -55)
        let path = NSBezierPath()
        path.move(to: .init(x: 0, y: 0))
        path.line(to: .init(x: bounds.width, y: 0))
        path.line(to: .init(x: bounds.width, y: bounds.height * 0.45))
        path.curve(
            to: .init(x: 0, y: bounds.height * 0.68),
            controlPoint1: .init(x: bounds.width * 0.62, y: bounds.height * 0.9),
            controlPoint2: .init(x: bounds.width * 0.25, y: bounds.height * 0.12))
        path.close()
        NSColor.white.withAlphaComponent(0.10).setFill()
        path.fill()
    }
}

extension NSColor {
    convenience init(hex: String) {
        let value = UInt64(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0
        self.init(
            srgbRed: Double((value >> 16) & 255) / 255, green: Double((value >> 8) & 255) / 255,
            blue: Double(value & 255) / 255, alpha: 1)
    }
}
