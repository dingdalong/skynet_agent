import Foundation

enum ServerOrigin {
    static func parse(_ raw: String) throws -> String {
        guard raw.utf8.count <= 4096, let parts = URLComponents(string: raw),
            let scheme = parts.scheme, let host = parts.host, !host.isEmpty,
            parts.user == nil, parts.password == nil, parts.fragment == nil,
            scheme == "wss" || scheme == "ws" && ["127.0.0.1", "localhost", "::1"].contains(host),
            parts.port == nil || (1...65535).contains(parts.port!)
        else { throw failure("network", "请输入完整 wss 地址；仅本机回环允许 ws") }
        var origin = URLComponents()
        origin.scheme = scheme
        origin.host = host.lowercased()
        origin.port = parts.port
        guard let value = origin.string else { throw failure("network", "服务器地址无效") }
        return value
    }
}
