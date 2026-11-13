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
                let text = input["text"] as? String, text.utf8.count <= 262_144
            else {
                throw failure("resource", "Missing socket or oversized message")
            }
            connection.task.send(.string(text)) { error in
                self.queue.async {
                    guard self.connections[appId]?[key]?.token == connection.token else { return }
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
                    let text: String
                    switch message {
                    case .string(let value): text = value
                    case .data(let data): text = data.base64EncodedString()
                    @unknown default: return
                    }
                    self.event(
                        appId, ["key": key, "connectionId": connection.token.uuidString, "text": text])
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
        let sockets = connections.removeValue(forKey: appId) ?? [:]
        for connection in sockets.values { connection.task.cancel(with: .goingAway, reason: nil) }
    }
}
