import Foundation

/// Owned by one gateway socket on the broker's serial queue.
final class GatewayTransport {
    static let chunk = 65_536
    private let loginLimit: (String) throws -> Int?
    private(set) var maximum = chunk
    private var authenticated = false
    private var partial = Data()
    private var expected = 0

    init(loginLimit: @escaping (String) throws -> Int?) { self.loginLimit = loginLimit }

    func receive(_ data: Data) throws -> Data? {
        guard data.first == 5 else {
            guard expected == 0, data.count <= Self.chunk else {
                throw failure("protocol", "未分片的业务消息过大或打断了上一个消息")
            }
            if !authenticated, let limit = try loginLimit(data.base64EncodedString()) {
                guard limit >= Self.chunk, limit <= Int(UInt32.max) else {
                    throw failure("protocol", "登录响应中的业务消息上限无效")
                }
                maximum = limit
                authenticated = true
            }
            return data
        }
        guard authenticated, data.count > 9 else { throw failure("protocol", "无效的业务消息分片") }
        func number(at index: Int) -> Int {
            data.dropFirst(index).prefix(4).reduce(0) { ($0 << 8) | Int($1) }
        }
        let total = number(at: 1)
        let offset = number(at: 5)
        guard total <= maximum else { throw failure("size", "业务消息超过网关上限 \(maximum) 字节") }
        guard total > Self.chunk, expected == 0 || expected == total,
            offset == partial.count, data.count - 9 <= min(Self.chunk, total - offset)
        else { throw failure("protocol", "业务消息分片长度或偏移无效") }
        expected = total
        partial.append(data.dropFirst(9))
        guard partial.count == total else { return nil }
        let complete = partial
        expected = 0
        partial = Data()
        return complete
    }

    static func part(_ packet: Data, offset: Int) -> Data {
        guard packet.count > chunk else { return packet }
        var data = Data([5])
        for value in [packet.count, offset] {
            var word = UInt32(value).bigEndian
            withUnsafeBytes(of: &word) { data.append(contentsOf: $0) }
        }
        data.append(packet.dropFirst(offset).prefix(chunk))
        return data
    }

    private var writes: [(Data, HostCore.Reply)] = []
    private var queuedBytes = 0

    func send(
        _ packet: Data, task: URLSessionWebSocketTask, queue: DispatchQueue,
        completion: @escaping HostCore.Reply
    ) throws {
        guard packet.count <= maximum else { throw failure("size", "业务消息超过网关上限 \(maximum) 字节") }
        guard queuedBytes + packet.count <= maximum * 2, writes.count < 64 else {
            throw failure("network", "网关发送队列已满")
        }
        writes.append((packet, completion))
        queuedBytes += packet.count
        if writes.count == 1 { write(task, queue, offset: 0) }
    }

    private func write(_ task: URLSessionWebSocketTask, _ queue: DispatchQueue, offset: Int) {
        let packet = writes[0].0
        task.send(.data(Self.part(packet, offset: offset))) { error in
            queue.async {
                if let error {
                    task.cancel(with: .goingAway, reason: nil)
                    let pending = self.writes
                    self.writes.removeAll()
                    self.queuedBytes = 0
                    for (_, reply) in pending { reply(.failure(error)) }
                    return
                }
                let next = offset + Self.chunk
                if next < packet.count {
                    self.write(task, queue, offset: next)
                    return
                }
                let (_, reply) = self.writes.removeFirst()
                self.queuedBytes -= packet.count
                if !self.writes.isEmpty { self.write(task, queue, offset: 0) }
                reply(.success([:]))
            }
        }
    }
}
