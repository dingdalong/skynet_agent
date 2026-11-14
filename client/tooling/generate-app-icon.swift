import AppKit

// One vector construction supplies both platform asset catalogs.
let client = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
let host = client.appendingPathComponent("apps/host")

func render(size: Int, desktop: Bool) throws -> Data {
    let alpha: CGImageAlphaInfo = desktop ? .premultipliedLast : .noneSkipLast
    guard
        let context = CGContext(
            data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: size * 4,
            space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: alpha.rawValue
        )
    else { throw CocoaError(.coderInvalidValue) }
    context.scaleBy(x: CGFloat(size) / 1024, y: CGFloat(size) / 1024)
    let inset: CGFloat = desktop ? 64 : 0
    let tile = CGRect(x: inset, y: inset, width: 1024 - inset * 2, height: 1024 - inset * 2)
    context.addPath(
        CGPath(
            roundedRect: tile, cornerWidth: desktop ? 200 : 0, cornerHeight: desktop ? 200 : 0, transform: nil
        ))
    context.setFillColor(NSColor(calibratedWhite: 0.085, alpha: 1).cgColor)
    context.fillPath()
    // An S-shaped route links three nodes: the host, its apps and the agent.
    let route = CGMutablePath()
    route.move(to: CGPoint(x: 680, y: 710))
    route.addLine(to: CGPoint(x: 415, y: 710))
    route.addCurve(
        to: CGPoint(x: 415, y: 512), control1: CGPoint(x: 280, y: 710), control2: CGPoint(x: 280, y: 512))
    route.addLine(to: CGPoint(x: 609, y: 512))
    route.addCurve(
        to: CGPoint(x: 609, y: 314), control1: CGPoint(x: 744, y: 512), control2: CGPoint(x: 744, y: 314))
    route.addLine(to: CGPoint(x: 344, y: 314))
    context.addPath(route)
    context.setStrokeColor(NSColor.white.cgColor)
    context.setLineWidth(74)
    context.setLineCap(.round)
    context.strokePath()
    for center in [CGPoint(x: 680, y: 710), CGPoint(x: 512, y: 512), CGPoint(x: 344, y: 314)] {
        context.setFillColor(NSColor.white.cgColor)
        context.fillEllipse(in: CGRect(x: center.x - 58, y: center.y - 58, width: 116, height: 116))
        context.setFillColor(NSColor(calibratedWhite: 0.085, alpha: 1).cgColor)
        context.fillEllipse(in: CGRect(x: center.x - 19, y: center.y - 19, width: 38, height: 38))
    }
    guard let image = context.makeImage(),
        let png = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])
    else { throw CocoaError(.coderInvalidValue) }
    return png
}

let mobile = host.appendingPathComponent("ios/SkynetHost/Assets.xcassets/AppIcon.appiconset")
try FileManager.default.createDirectory(at: mobile, withIntermediateDirectories: true)
try render(size: 1024, desktop: false).write(to: mobile.appendingPathComponent("app-icon.png"))
let desktop = host.appendingPathComponent("macos/SkynetHost-macOS/Assets.xcassets/AppIcon.appiconset")
for size in [16, 32, 64, 128, 256, 512, 1024] {
    try render(size: size, desktop: true).write(to: desktop.appendingPathComponent("app_icon_\(size).png"))
}
