import React
import SkynetHostCore
import UIKit

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
    @objc(setChrome:lightContent:)
    func setChrome(_ colors: [String], lightContent: Bool) {
        DispatchQueue.main.async { HostServices.delegate?.updateChrome(colors, lightContent: lightContent) }
    }
}

@objc(SkynetWallpaperManager)
final class WallpaperManager: RCTViewManager {
    override static func requiresMainQueueSetup() -> Bool { true }
    override func view() -> UIView! { WallpaperView() }
}

@objc(SkynetSceneFrameManager)
final class SceneFrameManager: RCTViewManager {
    override static func requiresMainQueueSetup() -> Bool { true }
    override func view() -> UIView! { SceneFrame() }
}

/// No animations or lifecycle state: the shared workspace owns this value.
private final class SceneFrame: RCTView {
    @objc var visible = true {
        didSet { isHidden = !visible }
    }
}

private final class WallpaperView: UIView {
    @objc var colors: [String] = [] { didSet { setNeedsDisplay() } }
    override func draw(_ rect: CGRect) {
        guard colors.count >= 2, let context = UIGraphicsGetCurrentContext(),
            let gradient = CGGradient(
                colorsSpace: CGColorSpaceCreateDeviceRGB(),
                colors: colors.map { UIColor(hex: $0).cgColor } as CFArray, locations: nil)
        else { return }
        context.drawLinearGradient(
            gradient, start: .zero, end: CGPoint(x: bounds.width, y: bounds.height),
            options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
        let path = UIBezierPath()
        path.move(to: CGPoint(x: 0, y: bounds.height))
        path.addLine(to: CGPoint(x: bounds.width, y: bounds.height))
        path.addLine(to: CGPoint(x: bounds.width, y: bounds.height * 0.55))
        path.addCurve(
            to: CGPoint(x: 0, y: bounds.height * 0.32),
            controlPoint1: CGPoint(x: bounds.width * 0.62, y: bounds.height * 0.1),
            controlPoint2: CGPoint(x: bounds.width * 0.25, y: bounds.height * 0.88))
        path.close()
        UIColor.white.withAlphaComponent(0.1).setFill()
        path.fill()
    }
}

extension UIColor {
    convenience init(hex: String) {
        let value = UInt64(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0
        self.init(
            red: Double((value >> 16) & 255) / 255, green: Double((value >> 8) & 255) / 255,
            blue: Double(value & 255) / 255, alpha: 1)
    }
}
