import Foundation

public struct Workspace: Codable {
    public var mode = "desktop"
    public var panes: [String?] = []
    public var ratio = 0.5
    public var recent: [String] = []

    public mutating func apply(_ command: String, _ input: [String: Any], knownApps: Set<String>) throws {
        let id = input["appId"] as? String ?? ""
        let needsApp = ["open", "close", "split", "restore"].contains(command)
        if needsApp, !knownApps.contains(id) { throw failure("app", "Unknown app") }
        switch command {
        case "home": mode = "desktop"
        case "overview": mode = "overview"
        case "open", "restore":
            if command == "open", panes.count == 2, let empty = panes.firstIndex(where: { $0 == nil }),
                !panes.contains(id), mode == "apps"
            {
                panes[empty] = id
            } else if !(command == "restore" && panes.contains(id)) {
                panes = [id]
            }
            recent.removeAll { $0 == id }
            recent.insert(id, at: 0)
            mode = "apps"
        case "close":
            recent.removeAll { $0 == id }
            panes = panes.map { $0 == id ? nil : $0 }
            if panes.allSatisfy({ $0 == nil }) {
                panes = []
                if mode == "apps" { mode = "desktop" }
            }
        case "split":
            guard ["left", "right"].contains(input["edge"] as? String ?? "") else {
                throw failure("input", "Split edge required")
            }
            let destination = input["edge"] as? String == "left" ? 0 : 1
            if panes.count == 2, let origin = panes.firstIndex(where: { $0 == id }) {
                if origin != destination {
                    panes.swapAt(0, 1)
                    ratio = max(1.0 / 3, min(1 - ratio, 2.0 / 3))
                }
            } else {
                panes = destination == 0 ? [id, nil] : [nil, id]
                ratio = 0.5
            }
            mode = "apps"
        case "resize":
            guard let ratio = input["ratio"] as? Double, ratio.isFinite, (1.0 / 3...2.0 / 3).contains(ratio)
            else {
                throw failure("input", "Invalid split ratio")
            }
            self.ratio = ratio
        case "collapse":
            guard mode == "apps", panes.count == 2,
                let edge = input["edge"] as? String, ["left", "right"].contains(edge)
            else {
                throw failure("input", "Collapse requires a split workspace and a valid edge")
            }
            let remaining = panes[edge == "left" ? 1 : 0]
            panes = remaining.map { [$0] } ?? []
            mode = remaining == nil ? "desktop" : "apps"
            ratio = 0.5
        default: throw failure("command", "Unknown workspace command")
        }
    }

    public var snapshot: [String: Any] {
        ["mode": mode, "panes": panes.map { $0 as Any? ?? NSNull() }, "ratio": ratio, "recent": recent]
    }
}

struct HostDocument: Codable {
    var workspace = Workspace()
    var appearance = "system"
    var wallpaper = "coast"
    var reduceMotion = false
    var grants: [String: [String]] = [:]
}

final class DocumentStore {
    private let root: URL
    init(root: URL) throws {
        self.root = root
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    }
    func read(_ key: String) throws -> [String: Any]? {
        let file = root.appendingPathComponent("\(key).json")
        guard FileManager.default.fileExists(atPath: file.path) else { return nil }
        return try jsonObject(Data(contentsOf: file))
    }
    func write(_ key: String, _ value: [String: Any]) throws {
        let data = try jsonData(value)
        guard data.count < 1_048_576 else { throw failure("storage", "App state exceeds 1 MiB") }
        try data.write(to: root.appendingPathComponent("\(key).json"), options: [.atomic])
    }
}
