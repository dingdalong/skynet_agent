import Foundation
import XCTest

@testable import SkynetHostCore

final class GatewayTransportTests: XCTestCase {
    func testNativeSocketOrdersOverlappingLargeAndSmallWrites() async throws {
        let endpoint = try XCTUnwrap(ProcessInfo.processInfo.environment["SKYNET_TEST_SOCKET"])
        let task = URLSession.shared.webSocketTask(
            with: try XCTUnwrap(URL(string: endpoint + "/gateway-wire")))
        task.maximumMessageSize = GatewayTransport.chunk + 9
        task.resume()
        defer { task.cancel(with: .normalClosure, reason: nil) }
        let queue = DispatchQueue(label: "test.gateway.writes")
        let transport = GatewayTransport { _ in 3 * 1024 * 1024 }
        try await task.send(.data(Data([2])))
        guard case .data(let login) = try await task.receive() else { return XCTFail("需要二进制响应") }
        _ = try transport.receive(login)
        let packets = [
            Data(repeating: 1, count: 1_048_500), Data([1, 2]), Data(repeating: 3, count: 300 * 1024),
        ]
        let sent = expectation(description: "每条业务消息完成一次")
        sent.expectedFulfillmentCount = packets.count
        try queue.sync {
            for packet in packets {
                try transport.send(packet, task: task, queue: queue) { result in
                    if case .failure(let error) = result { XCTFail(String(describing: error)) }
                    sent.fulfill()
                }
            }
        }
        for packet in packets {
            var complete: Data?
            while complete == nil {
                guard case .data(let part) = try await task.receive() else { return XCTFail("需要二进制分片") }
                complete = try transport.receive(part)
            }
            XCTAssertEqual(complete, packet)
        }
        await fulfillment(of: [sent], timeout: 3)
    }

    func testBoundariesAndReconnect() throws {
        let chunk = GatewayTransport.chunk
        let maximum = 4 * 1024 * 1024
        func login() throws -> GatewayTransport {
            let connection = GatewayTransport { _ in maximum }
            _ = try connection.receive(Data([2]))
            return connection
        }
        let connection = try login()
        for size in [chunk, chunk + 1, 300 * 1024, maximum, 12] {
            let packet = Data((0..<size).map { UInt8(truncatingIfNeeded: $0) })
            for offset in stride(from: 0, to: size, by: chunk) {
                let part = GatewayTransport.part(packet, offset: offset)
                XCTAssertLessThanOrEqual(part.count, chunk + 9)
                let complete = try connection.receive(part)
                if offset + chunk >= size { XCTAssertEqual(complete, packet) } else { XCTAssertNil(complete) }
            }
        }
        let shortFirst = Data([5, 0, 1, 0, 1, 0, 0, 0, 0, 1])
        XCTAssertNil(try connection.receive(shortFirst))
        var rest = Data([5, 0, 1, 0, 1, 0, 0, 0, 1])
        rest.append(Data(repeating: 1, count: chunk))
        XCTAssertEqual(try connection.receive(rest), Data(repeating: 1, count: chunk + 1))
        let oversized = GatewayTransport.part(Data(repeating: 1, count: maximum + 1), offset: 0)
        XCTAssertThrowsError(try connection.receive(oversized))
        let packet = Data(repeating: 1, count: chunk + 1)
        let first = GatewayTransport.part(packet, offset: 0)
        XCTAssertThrowsError(try GatewayTransport { _ in nil }.receive(first))
        XCTAssertNil(try connection.receive(first))
        XCTAssertThrowsError(try connection.receive(first))
        let fresh = try login()
        XCTAssertThrowsError(try fresh.receive(GatewayTransport.part(packet, offset: chunk)))
        XCTAssertEqual(try fresh.receive(Data([2])), Data([2]))
    }
}
