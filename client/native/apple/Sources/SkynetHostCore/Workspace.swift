import Foundation
import HostCoreNative

public struct Workspace: Codable {
    public var mode = "desktop"
    public var panes: [String?] = []
    public var ratio = 0.5
    public var recent: [String] = []

    public mutating func apply(_ command: String, _ input: [String: Any], knownApps: Set<String>) throws {
        guard let native = mode.withCString({ sk_workspace_create($0, ratio) }) else {
            throw failure("workspace", "Cannot allocate workspace transition")
        }
        defer { sk_workspace_destroy(native) }
        func check(_ code: Int32) throws {
            guard code == 0 else {
                let kind = String(cString: sk_workspace_error_kind(code))
                throw failure(kind, String(cString: sk_workspace_error(code)))
            }
        }
        for pane in panes {
            try check(
                pane.map { id in id.withCString { sk_workspace_add_pane(native, $0) } }
                    ?? sk_workspace_add_pane(native, nil))
        }
        for id in recent { try check(id.withCString { sk_workspace_add_recent(native, $0) }) }
        for id in knownApps { try check(id.withCString { sk_workspace_allow_app(native, $0) }) }
        let id = input["appId"] as? String ?? ""
        let edge = input["edge"] as? String ?? ""
        let requestedRatio = input["ratio"] as? Double
        let code = command.withCString { command in
            id.withCString { id in
                edge.withCString { edge in
                    sk_workspace_apply(
                        native, command, id, edge,
                        requestedRatio == nil ? 0 : 1, requestedRatio ?? 0)
                }
            }
        }
        try check(code)
        // Only the trusted native owner commits this candidate. The C++ reducer
        // owns no UI, connection, task, storage, or callback lifetime.
        mode = String(cString: sk_workspace_mode(native))
        ratio = sk_workspace_ratio(native)
        panes = (0..<sk_workspace_pane_count(native)).map { index in
            sk_workspace_pane(native, index).map { String(cString: $0) }
        }
        recent = (0..<sk_workspace_recent_count(native)).map { index in
            String(cString: sk_workspace_recent(native, index))
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
