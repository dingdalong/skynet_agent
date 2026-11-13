import AppKit
import QuartzCore
import React

@objc(SkynetSceneManager)
final class SceneManager: RCTViewManager {
    override static func requiresMainQueueSetup() -> Bool { true }
    override func view() -> NSView! { WorkspaceScene(frame: .zero) }
}

/// Native composition handles entrance and placement without per-frame Fabric updates.
/// The model layer always holds the final layout, opacity and transform.
private final class WorkspaceScene: RCTView {
    @objc var transitionKey: String = "" {
        didSet {
            guard oldValue != transitionKey else { return }
            layer?.removeAnimation(forKey: "workspace.entrance")
            if !transitionPending {
                transitionFrom = previousFrame
                transitionTransform = layer?.presentation()?.transform ?? CATransform3DIdentity
            }
            transitionPending = true
            // Fabric applies legacy props and layout in one mounting transaction.
            // Measure the final frame after that transaction, retaining the old frame.
            DispatchQueue.main.async { [weak self] in self?.applyPlacement() }
        }
    }
    @objc var animateLayout: Bool = true {
        didSet {
            if !animateLayout { layer?.removeAnimation(forKey: "workspace.placement") }
        }
    }
    @objc var reducedMotion: Bool = false {
        didSet {
            if reducedMotion {
                layer?.removeAnimation(forKey: "workspace.placement")
                layer?.removeAnimation(forKey: "workspace.entrance")
            }
        }
    }
    @objc var durationMs: Double = 240
    @objc var entrance: NSDictionary? {
        didSet {
            if !hasEntered {
                entrancePending = entrance != nil
                scheduleEntrance()
            }
        }
    }
    private var hasEntered = false
    private var entrancePending = false
    private var entranceScheduled = false
    private var transitionPending = false
    private var previousFrame: NSRect?
    private var transitionFrom: NSRect?
    private var transitionTransform = CATransform3DIdentity

    override init(frame: NSRect) {
        super.init(frame: frame)
        wantsLayer = true
    }
    required init?(coder: NSCoder) { nil }

    override func layout() {
        super.layout()
        if !transitionPending, let content = window?.contentView, !bounds.isEmpty {
            previousFrame = convert(bounds, to: content)
        }
        scheduleEntrance()
    }

    override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        if window == nil {
            layer?.removeAnimation(forKey: "workspace.entrance")
            layer?.removeAnimation(forKey: "workspace.placement")
        } else {
            scheduleEntrance()
        }
    }

    private func scheduleEntrance() {
        guard entrancePending, !entranceScheduled else { return }
        entranceScheduled = true
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.entranceScheduled = false
            self.applyEntrance()
        }
    }

    private func applyEntrance() {
        guard entrancePending, let entrance, !bounds.isEmpty, window != nil, let layer else { return }
        entrancePending = false
        hasEntered = true
        guard !reducedMotion, !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion, durationMs > 0
        else { return }
        let scale = max(0.8, min(entrance["scale"] as? Double ?? 1, 1))
        let opacity = max(0, min(entrance["opacity"] as? Double ?? 1, 1))
        let offsetY = max(-24, min(entrance["offsetY"] as? Double ?? 0, 24))
        var from = CATransform3DMakeScale(scale, scale, 1)
        from.m41 = bounds.width * (0.5 - layer.anchorPoint.x) * (1 - scale)
        from.m42 = bounds.height * (0.5 - layer.anchorPoint.y) * (1 - scale) + offsetY
        let transform = CABasicAnimation(keyPath: "transform")
        transform.fromValue = NSValue(caTransform3D: from)
        transform.toValue = NSValue(caTransform3D: CATransform3DIdentity)
        let fade = CABasicAnimation(keyPath: "opacity")
        fade.fromValue = opacity
        fade.toValue = 1
        let group = CAAnimationGroup()
        group.animations = [transform, fade]
        group.duration = min(durationMs, 1000) / 1000
        group.timingFunction = CAMediaTimingFunction(controlPoints: 0.2, 0.8, 0.2, 1)
        layer.add(group, forKey: "workspace.entrance")
    }

    private func applyPlacement() {
        guard transitionPending else { return }
        layoutSubtreeIfNeeded()
        transitionPending = false
        guard !bounds.isEmpty, let content = window?.contentView, let layer else { return }
        let current = convert(bounds, to: content)
        let previous = transitionFrom
        previousFrame = current
        let displayed = transitionTransform
        layer.removeAnimation(forKey: "workspace.placement")
        guard let previous, animateLayout, !reducedMotion,
            !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion, durationMs > 0,
            abs(current.minX - previous.minX) > 0.5 || abs(current.width - previous.width) > 0.5
        else { return }
        let anchor = layer.anchorPoint.x
        let visibleWidth = previous.width * displayed.m11
        let visibleX = previous.minX + displayed.m41 + previous.width * anchor * (1 - displayed.m11)
        let scale = visibleWidth / current.width
        var from = CATransform3DIdentity
        from.m11 = scale
        from.m41 = visibleX - current.minX + current.width * anchor * (scale - 1)
        let animation = CABasicAnimation(keyPath: "transform")
        animation.fromValue = NSValue(caTransform3D: from)
        animation.toValue = NSValue(caTransform3D: CATransform3DIdentity)
        animation.duration = min(durationMs, 1000) / 1000
        animation.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        layer.add(animation, forKey: "workspace.placement")
    }
}
