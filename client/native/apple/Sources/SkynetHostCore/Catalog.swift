import CoreFoundation
import CryptoKit
import Darwin
import Foundation

public struct AppManifest: Codable {
    public struct Action: Codable {
        public let title: String
        public let input: JSONSchema
        public let output: JSONSchema
    }
    public let schemaVersion: Int
    public let id: String
    public let name: String
    public let version: String
    public let stateVersion: Int
    public let minimumHostVersion: Int
    public let permissions: [String]
    public let networkOrigins: [String]
    public let actions: [String: Action]
    public let files: [String: String]

    public var summary: [String: Any] {
        [
            "id": id, "name": name, "version": version, "permissions": permissions,
            "actions": actions.mapValues {
                ["title": $0.title, "input": $0.input.value, "output": $0.output.value]
            },
        ]
    }
}

/// Preserve a schema as JSON while retaining Codable manifests.
public struct JSONSchema: Codable {
    public let value: [String: Any]
    public init(from decoder: Decoder) throws {
        let value = try JSONValue(from: decoder)
        guard let object = value.object as? [String: Any] else { throw failure("schema", "Invalid schema") }
        self.value = object
    }
    public func encode(to encoder: Encoder) throws { try JSONValue(value).encode(to: encoder) }
}

enum JSONValue: Codable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSONValue])
    case object([String: JSONValue])
    init(_ value: Any) throws {
        if value is NSNull {
            self = .null
        } else if let number = value as? NSNumber {
            self =
                CFGetTypeID(number) == CFBooleanGetTypeID()
                ? .bool(number.boolValue) : .number(number.doubleValue)
        } else if let string = value as? String {
            self = .string(string)
        } else if let array = value as? [Any] {
            self = .array(try array.map(JSONValue.init))
        } else if let object = value as? [String: Any] {
            self = .object(try object.mapValues(JSONValue.init))
        } else {
            throw failure("json", "Unsupported value")
        }
    }
    var object: Any {
        switch self {
        case .null: return NSNull()
        case .bool(let value): return value
        case .number(let value): return value
        case .string(let value): return value
        case .array(let value): return value.map(\.object)
        case .object(let value): return value.mapValues(\.object)
        }
    }
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let bool = try? container.decode(Bool.self) {
            self = .bool(bool)
        } else if let number = try? container.decode(Double.self) {
            self = .number(number)
        } else if let string = try? container.decode(String.self) {
            self = .string(string)
        } else if let array = try? container.decode([JSONValue].self) {
            self = .array(array)
        } else {
            self = .object(try container.decode([String: JSONValue].self))
        }
    }
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .null: try container.encodeNil()
        case .bool(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .string(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .object(let value): try container.encode(value)
        }
    }
}

public final class AppCatalog {
    public struct Entry {
        public let manifest: AppManifest
        public let root: URL
        public let builtin: Bool
    }
    public private(set) var entries: [String: Entry] = [:]
    private let root: URL
    private let fm = FileManager.default
    public init(root: URL, builtins: URL) throws {
        self.root = root
        try fm.createDirectory(at: root, withIntermediateDirectories: true)
        for folder in try fm.contentsOfDirectory(at: builtins, includingPropertiesForKeys: nil)
        where folder.pathExtension == "skapp" {
            let manifest = try verify(folder, builtin: true)
            entries[manifest.id] = Entry(manifest: manifest, root: folder, builtin: true)
        }
        for folder in try fm.contentsOfDirectory(at: root, includingPropertiesForKeys: nil) {
            if folder.lastPathComponent.hasPrefix(".stage-")
                || folder.lastPathComponent.hasPrefix(".removed-")
            {
                try fm.removeItem(at: folder)
                continue
            }
            guard folder.pathExtension == "skapp", let manifest = try? verify(folder, builtin: false),
                entries[manifest.id] == nil
            else { continue }
            entries[manifest.id] = Entry(manifest: manifest, root: folder, builtin: false)
        }
    }

    public func verify(_ folder: URL, builtin: Bool = false) throws -> AppManifest {
        let manifestFile = folder.appendingPathComponent("manifest.json")
        let rootAttributes = try folder.resourceValues(forKeys: [.isSymbolicLinkKey, .isDirectoryKey])
        let manifestAttributes = try manifestFile.resourceValues(forKeys: [
            .isSymbolicLinkKey, .isRegularFileKey, .fileSizeKey,
        ])
        guard rootAttributes.isSymbolicLink != true, rootAttributes.isDirectory == true,
            manifestAttributes.isSymbolicLink != true, manifestAttributes.isRegularFile == true,
            (manifestAttributes.fileSize ?? Int.max) <= 65_536
        else {
            throw failure("package", "Expected a regular, bounded app manifest")
        }
        let manifestData = try Data(contentsOf: manifestFile)
        guard manifestData.count <= 65_536 else { throw failure("size", "Manifest too large") }
        let manifest = try JSONDecoder().decode(AppManifest.self, from: manifestData)
        guard manifest.schemaVersion == 1, manifest.minimumHostVersion == 1,
            manifest.stateVersion == 1,
            manifest.id.range(of: "^[a-z][a-z0-9.-]{2,63}$", options: .regularExpression) != nil,
            manifest.version.range(of: "^[0-9]+\\.[0-9]+\\.[0-9]+$", options: .regularExpression) != nil,
            !manifest.name.isEmpty, manifest.name.count <= 64,
            manifest.files["ui/index.html"] != nil, manifest.files["runtime.js"] != nil,
            manifest.files.count <= 256, manifest.actions.count <= 64
        else {
            throw failure("manifest", "Unsupported or incomplete app manifest")
        }
        let reserved: Set<String> = ["host.preferences", "host.apps"]
        for permission in manifest.permissions {
            guard permission.count <= 160,
                !permission.hasPrefix("host.") || (builtin && reserved.contains(permission)),
                permission == "storage" || reserved.contains(permission)
                    || permission == "network" || permission.hasPrefix("apps.call:")
            else {
                throw failure("permission", "Unsupported app permission: \(permission)")
            }
        }
        guard manifest.networkOrigins.count <= 16 else { throw failure("network", "Too many origins") }
        for origin in manifest.networkOrigins {
            guard let url = URL(string: origin), let host = url.host,
                url.user == nil, url.password == nil, url.query == nil, url.fragment == nil,
                url.path.isEmpty || url.path == "/",
                url.scheme == "wss"
                    || (url.scheme == "ws" && ["127.0.0.1", "localhost", "::1"].contains(host))
            else {
                throw failure("network", "Only exact wss origins or explicit loopback ws are supported")
            }
        }
        for (name, action) in manifest.actions {
            guard name.range(of: "^[a-z][a-zA-Z0-9.]{0,63}$", options: .regularExpression) != nil,
                !action.title.isEmpty, action.title.count <= 128
            else {
                throw failure("action", "Invalid action name or title")
            }
            try Schema.check(action.input.value)
            try Schema.check(action.output.value)
        }
        var actual = Set<String>()
        var total = 0
        guard let enumerator = fm.enumerator(atPath: folder.path) else {
            throw failure("package", "Cannot enumerate app")
        }
        var entryCount = 0
        for case let path as String in enumerator {
            entryCount += 1
            guard entryCount <= 512 else { throw failure("size", "Too many package entries") }
            let file = folder.appendingPathComponent(path)
            let attributes = try file.resourceValues(forKeys: [
                .isSymbolicLinkKey, .isRegularFileKey, .isDirectoryKey, .fileSizeKey,
            ])
            guard attributes.isSymbolicLink != true else {
                throw failure("path", "App packages cannot contain symlinks")
            }
            if attributes.isDirectory == true { continue }
            guard attributes.isRegularFile == true else { throw failure("path", "Unsupported app file type") }
            if path == "manifest.json" { continue }
            guard !path.contains(".."), !path.hasPrefix("/"),
                let digest = manifest.files[path],
                (attributes.fileSize ?? Int.max) <= 16_777_216
            else { throw failure("path", "Unexpected app file: \(path)") }
            let data = try Data(contentsOf: file)
            total += data.count
            guard total <= 67_108_864,
                SHA256.hash(data: data).map({ String(format: "%02x", $0) }).joined() == digest
            else {
                throw failure("integrity", "App digest or size mismatch: \(path)")
            }
            actual.insert(path)
        }
        guard actual == Set(manifest.files.keys) else { throw failure("integrity", "Missing app files") }
        return manifest
    }

    /// Prepare and probe before replacing the active package. Caller persists
    /// grants and stops the old runtime only after this transaction succeeds.
    func stage(_ source: URL) throws -> (AppManifest, URL) {
        let manifest = try verify(source)
        guard entries[manifest.id]?.builtin != true else {
            throw failure("builtin", "Cannot replace a built-in app")
        }
        let staging = root.appendingPathComponent(".stage-\(UUID().uuidString)")
        do {
            try fm.copyItem(at: source, to: staging)
            _ = try verify(staging)
            return (manifest, staging)
        } catch {
            try? fm.removeItem(at: staging)
            throw error
        }
    }

    func activate(_ manifest: AppManifest, staging: URL) throws -> Entry {
        let destination = root.appendingPathComponent("\(manifest.id).skapp")
        let exists = fm.fileExists(atPath: destination.path)
        if exists {
            // Atomic directory exchange also preserves the active package if
            // the host exits between activation and staging cleanup.
            guard renameatx_np(AT_FDCWD, staging.path, AT_FDCWD, destination.path, UInt32(RENAME_SWAP)) == 0
            else {
                throw failure("activate", "Cannot atomically activate app: \(errno)")
            }
        } else {
            try fm.moveItem(at: staging, to: destination)
        }
        let entry = Entry(manifest: manifest, root: destination, builtin: false)
        entries[manifest.id] = entry
        return entry
    }

    func remove(_ id: String, commit: () throws -> Void) throws {
        guard let entry = entries[id], !entry.builtin else {
            throw failure("builtin", "Cannot remove a built-in app")
        }
        let removed = root.appendingPathComponent(".removed-\(UUID().uuidString)")
        try fm.moveItem(at: entry.root, to: removed)
        do { try commit() } catch {
            try fm.moveItem(at: removed, to: entry.root)
            throw error
        }
        entries[id] = nil
        // Hidden tombstones are not executable packages. Cleanup failure must
        // not turn a committed removal into an apparent failed transaction.
        try? fm.removeItem(at: removed)
    }
}
