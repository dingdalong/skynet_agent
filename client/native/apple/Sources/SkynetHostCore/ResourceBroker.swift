import CoreFoundation
import Foundation

private final class SocketPolicy: NSObject, URLSessionTaskDelegate {
    func urlSession(
        _ session: URLSession, task: URLSessionTask,
        willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest,
        completionHandler: @escaping (URLRequest?) -> Void
    ) {
        // The declared origin is the complete authority; a handshake redirect
        // must never acquire another origin's network authority.
        completionHandler(nil)
    }
}

final class ResourceBroker {
    private struct Connection {
        let token: UUID
        let task: URLSessionWebSocketTask
        let generation: Int
    }
    private let queue: DispatchQueue
    private let event: (String, [String: Any]) -> Void
    private var connections: [String: [String: Connection]] = [:]
    private struct Timer {
        let token: UUID
        let work: DispatchWorkItem
        let completion: HostCore.Reply
    }
    private var timers: [String: [String: Timer]] = [:]
    private let session: URLSession

    init(queue: DispatchQueue, event: @escaping (String, [String: Any]) -> Void) {
        self.queue = queue
        self.event = event
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpCookieStorage = nil
        configuration.urlCredentialStorage = nil
        configuration.timeoutIntervalForRequest = 15
        self.session = URLSession(configuration: configuration, delegate: SocketPolicy(), delegateQueue: nil)
    }

    func request(
        appId: String, generation: Int, kind: String, input: [String: Any],
        origins: [String], completion: @escaping HostCore.Reply
    ) throws {
        guard let key = input["key"] as? String, !key.isEmpty, key.count <= 64 else {
            throw failure("resource", "Resource key required")
        }
        switch kind {
        case "timer.wait":
            guard let value = input["milliseconds"] as? NSNumber,
                CFGetTypeID(value) != CFBooleanGetTypeID(),
                value.doubleValue.isFinite, value.doubleValue.rounded() == value.doubleValue,
                (100...60_000).contains(value.intValue),
                timers[appId]?[key] != nil || (timers[appId]?.count ?? 0) < 8
            else { throw failure("timer", "Invalid delay or timer limit exceeded") }
            if let previous = timers[appId]?.removeValue(forKey: key) {
                previous.work.cancel()
                previous.completion(.failure(failure("timer", "Timer replaced")))
            }
            let token = UUID()
            let work = DispatchWorkItem { [weak self] in
                guard let self, self.timers[appId]?[key]?.token == token else { return }
                self.timers[appId]?[key] = nil
                completion(.success([:]))
            }
            timers[appId, default: [:]][key] = Timer(token: token, work: work, completion: completion)
            queue.asyncAfter(deadline: .now() + value.doubleValue / 1000, execute: work)
        case "socket.open":
            if let existing = connections[appId]?[key] {
                completion(.success(["connectionId": existing.token.uuidString]))
                return
            }
            guard (connections[appId]?.count ?? 0) < 8,
                let raw = input["url"] as? String, let url = URL(string: raw),
                url.user == nil, url.password == nil, url.fragment == nil,
                origins.contains(where: { allowed in
                    guard let origin = URL(string: allowed) else { return false }
                    return origin.scheme == url.scheme && origin.host == url.host && origin.port == url.port
                })
            else { throw failure("network", "Socket origin denied or resource limit exceeded") }
            let task = session.webSocketTask(with: url)
            task.maximumMessageSize = 262_144
            let connection = Connection(token: UUID(), task: task, generation: generation)
            connections[appId, default: [:]][key] = connection
            task.resume()
            receive(appId: appId, key: key, connection: connection)
            completion(.success(["connectionId": connection.token.uuidString]))
        case "socket.send":
            guard let connection = connections[appId]?[key],
                connection.generation == generation,
                input["connectionId"] == nil
                    || input["connectionId"] as? String == connection.token.uuidString
            else {
                throw failure("resource", "Missing or stale socket")
            }
            let message: URLSessionWebSocketTask.Message
            if let text = input["text"] as? String, input["data"] == nil, text.utf8.count <= 262_144 {
                message = .string(text)
            } else if let raw = input["data"] as? String, input["text"] == nil,
                raw.utf8.count <= 349_528, let data = Data(base64Encoded: raw), data.count <= 262_144
            {
                message = .data(data)
            } else {
                throw failure("resource", "Provide one bounded text or base64 binary message")
            }
            connection.task.send(message) { error in
                self.queue.async {
                    guard self.connections[appId]?[key]?.token == connection.token else {
                        completion(.failure(failure("resource", "Socket closed before send completed")))
                        return
                    }
                    if let error {
                        completion(.failure(error))
                    } else {
                        completion(.success(["connectionId": connection.token.uuidString]))
                    }
                }
            }
        case "socket.close":
            connections[appId]?.removeValue(forKey: key)?.task.cancel(with: .normalClosure, reason: nil)
            completion(.success([:]))
        default: throw failure("resource", "Unsupported resource operation")
        }
    }

    private func receive(appId: String, key: String, connection: Connection) {
        connection.task.receive { result in
            self.queue.async {
                guard self.connections[appId]?[key]?.token == connection.token else { return }
                switch result {
                case .success(let message):
                    var event: [String: Any] = ["key": key, "connectionId": connection.token.uuidString]
                    switch message {
                    case .string(let value): event["text"] = value
                    case .data(let data): event["data"] = data.base64EncodedString()
                    @unknown default: return
                    }
                    self.event(appId, event)
                    self.receive(appId: appId, key: key, connection: connection)
                case .failure(let error):
                    self.connections[appId]?[key] = nil
                    self.event(
                        appId,
                        [
                            "key": key, "connectionId": connection.token.uuidString,
                            "error": String(describing: error),
                        ])
                }
            }
        }
    }
    func close(appId: String) {
        for timer in (timers.removeValue(forKey: appId) ?? [:]).values { timer.work.cancel() }
        let sockets = connections.removeValue(forKey: appId) ?? [:]
        for connection in sockets.values { connection.task.cancel(with: .goingAway, reason: nil) }
    }
}
