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
        .systemLibrary(name: "AgentRuntime", path: "apple/Sources/AgentRuntime"),
        .target(
            name: "HostCoreNative", path: "core",
            exclude: ["tests", "CMakeLists.txt"],
            sources: ["src/workspace.cpp", "src/workspace_c.cpp"],
            publicHeadersPath: "include", cxxSettings: [.headerSearchPath("private")]),
        .target(
            name: "SkynetHostCore", dependencies: ["AgentRuntime", "HostCoreNative"],
            path: "apple/Sources/SkynetHostCore"),
        .executableTarget(
            name: "SkynetAppRuntime", path: "apple/Sources/SkynetAppRuntime",
            linkerSettings: [.linkedFramework("JavaScriptCore")]),
        .testTarget(
            name: "SkynetHostCoreTests", dependencies: ["SkynetHostCore"],
            path: "apple/Tests/SkynetHostCoreTests"),
    ],
    swiftLanguageVersions: [.v5],
    cxxLanguageStandard: .cxx17
)
