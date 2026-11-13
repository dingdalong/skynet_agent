// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SkynetHostCore",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "SkynetHostCore", type: .static, targets: ["SkynetHostCore"]),
        .executable(name: "SkynetAppRuntime", targets: ["SkynetAppRuntime"]),
    ],
    targets: [
        .systemLibrary(name: "AgentRuntime", path: "Sources/AgentRuntime"),
        .target(name: "SkynetHostCore", dependencies: ["AgentRuntime"]),
        .executableTarget(name: "SkynetAppRuntime", linkerSettings: [.linkedFramework("JavaScriptCore")]),
        .testTarget(name: "SkynetHostCoreTests", dependencies: ["SkynetHostCore"]),
    ],
    swiftLanguageVersions: [.v5]
)
