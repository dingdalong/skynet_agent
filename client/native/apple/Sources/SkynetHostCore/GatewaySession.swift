import Foundation
import JavaScriptCore

final class GatewaySession {
    private let codecURL: URL
    private let queue: DispatchQueue
    private let event: (String) -> Void
    private var codec: JSContext?
    private var generation = 0
    private var nextId = 1
    private var connected = false
    private var pending: [Int: (String, HostCore.Reply)] = [:]
    private lazy var broker = ResourceBroker(queue: queue) { [weak self] _, message in
        self?.receive(message)
    }
    private(set) var maximum = GatewayTransport.chunk
    private(set) var user: [String: Any]?

    init(builtins: URL, queue: DispatchQueue, event: @escaping (String) -> Void) {
        self.codecURL = builtins.appendingPathComponent("gateway.js")
        self.queue = queue
        self.event = event
    }

    func login(url: String, username: String, completion: @escaping HostCore.Reply) throws {
        guard !connected else { throw failure("login", "登录连接已存在") }
        let origin = try ServerOrigin.parse(url)
        if codec == nil {
            let source = try String(contentsOf: codecURL, encoding: .utf8)
            guard let context = JSContext() else { throw failure("protocol", "网关协议初始化失败") }
            context.evaluateScript(source)
            guard context.exception == nil else { throw failure("protocol", "无法加载网关协议") }
            codec = context
        }
        nextId = 1
        try broker.request(
            appId: "host", generation: generation, kind: "socket.open",
            input: ["key": "gateway", "url": url], origins: [origin], loginLimit: loginLimit
        ) { result in
            guard case .success = result else {
                completion(result)
                return
            }
            self.connected = true
            self.request("LoginReq", input: ["username": username]) { response in
                do {
                    let body = try response.get()
                    guard let identity = body["identity"] as? [String: Any],
                        identity["username"] as? String == username, let id = identity["user_id"] as? String,
                        !id.isEmpty
                    else { throw failure("login", "服务器返回了无效的用户身份") }
                    self.maximum = body["max_message_bytes"] as? Int ?? GatewayTransport.chunk
                    self.user = ["username": username, "userId": id, "url": url]
                    completion(.success(self.user!))
                } catch {
                    self.close()
                    completion(.failure(error))
                }
            }
        }
    }

    func request(_ name: String, input: [String: Any], completion: @escaping HostCore.Reply) {
        do {
            guard connected, nextId <= Int(UInt32.max), pending.count < 64, let codec else {
                throw failure("gateway", "网关连接不可用")
            }
            let id = nextId
            nextId += 1
            codec.exception = nil
            guard
                let packet = codec.objectForKeyedSubscript("GatewayProtocol")?
                    .invokeMethod("encodePacket", withArguments: [name, id, input]),
                codec.exception == nil, packet.isString, let data = packet.toString()
            else { throw failure("protocol", "无法编码网关请求") }
            pending[id] = (String(name.dropLast(3)) + "Res", completion)
            let current = generation
            do {
                try broker.request(
                    appId: "host", generation: current, kind: "socket.send",
                    input: ["key": "gateway", "data": data], origins: []
                ) { result in
                    if case .failure = result, current == self.generation {
                        self.pending.removeValue(forKey: id)?.1(result)
                    }
                }
            } catch {
                pending.removeValue(forKey: id)
                throw error
            }
            guard !["AppCenterSetReq", "AppCenterRemoveReq"].contains(name) else { return }
            queue.asyncAfter(deadline: .now() + 15) {
                guard self.generation == current else { return }
                self.pending.removeValue(forKey: id)?.1(.failure(failure("timeout", "网关请求超时")))
            }
        } catch { completion(.failure(error)) }
    }

    func loginLimit(_ data: String) throws -> Int? {
        guard let codec else { throw failure("protocol", "尚未加载登录协议") }
        codec.exception = nil
        guard
            let packet = codec.objectForKeyedSubscript("GatewayProtocol")?
                .invokeMethod("decodePacket", withArguments: [data])?.toDictionary(),
            codec.exception == nil
        else { throw failure("protocol", "登录前收到无效的网关消息") }
        guard packet["name"] as? String == "LoginRes", let body = packet["body"] as? [String: Any],
            body["ret"] as? Int == 1
        else { return nil }
        return body["max_message_bytes"] as? Int ?? 0
    }

    private func receive(_ message: [String: Any]) {
        guard let data = message["data"] as? String, let codec else {
            close()
            return
        }
        codec.exception = nil
        guard
            let packet = codec.objectForKeyedSubscript("GatewayProtocol")?
                .invokeMethod("decodePacket", withArguments: [data])?.toDictionary(),
            codec.exception == nil, let name = packet["name"] as? String, let id = packet["id"] as? Int,
            let body = packet["body"] as? [String: Any]
        else {
            close()
            return
        }
        if id == 0 {
            event(name)
            return
        }
        guard let (expected, reply) = pending[id], let appId = packet["app"] as? String,
            codec.objectForKeyedSubscript("GatewayProtocol")?
                .invokeMethod("ownerOf", withArguments: [expected])?.toString() == appId
        else { return }
        pending.removeValue(forKey: id)
        guard expected == name, body["ret"] as? Int == 1 else {
            reply(.failure(failure("gateway", dictionary(body["error"])["message"] as? String ?? "服务器拒绝请求")))
            return
        }
        reply(.success(body))
    }

    func close() {
        let hadUser = user != nil
        generation += 1
        connected = false
        maximum = GatewayTransport.chunk
        user = nil
        broker.close(appId: "host")
        let waiting = pending
        pending.removeAll()
        for (_, request) in waiting { request.1(.failure(failure("gateway", "网关连接已关闭"))) }
        if hadUser { event("logout") }
    }
}
