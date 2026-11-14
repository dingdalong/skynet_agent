import XCTest

@testable import SkynetHostCore

final class EmbeddedRuntimeTests: XCTestCase {
    func testSlowBuiltinExpiresWithoutBlockingAnotherMailbox() async throws {
        let owner = DispatchQueue(label: "test.embedded.timeout")
        let slow = EmbeddedRuntime(queue: owner, generation: 1, deadline: 0.15)
        let other = EmbeddedRuntime(queue: owner, generation: 1)
        let code = """
            globalThis.SkynetApp = {
                initialState:()=>0,
                reduce(state) { const end=Date.now()+400; while(Date.now()<end){}; return {state:state+1}; }
            };
            """
        _ = try await request(slow, owner, ["type": "load", "code": code, "state": NSNull()])
        _ = try await request(other, owner, ["type": "load", "code": code, "state": NSNull()])
        do {
            _ = try await request(slow, owner, ["type": "command", "name": "slow", "state": 0])
            XCTFail("The slow app must lose authority at its deadline")
        } catch { XCTAssertEqual((error as? HostError)?.code, "timeout") }
        let alive = try await request(other, owner, ["type": "load", "code": code, "state": 9])
        XCTAssertEqual(alive["state"] as? Int, 9)
        await withCheckedContinuation { continuation in
            owner.async {
                slow.stop()
                other.stop()
                continuation.resume()
            }
        }
    }
    func testSeparateVirtualMachinesExceptionsAndCommittedInput() async throws {
        let owner = DispatchQueue(label: "test.embedded.owner")
        let first = EmbeddedRuntime(queue: owner, generation: 1)
        let second = EmbeddedRuntime(queue: owner, generation: 1)
        let code = """
            globalThis.privateValue = 0;
            globalThis.SkynetApp = {
                initialState: () => ({count:0}),
                reduce(state, command) {
                    if (command.type === "fail") { state.count=999; throw Error("intentional"); }
                    return {state:{count:state.count+1},result:++globalThis.privateValue};
                }
            };
            """
        _ = try await request(first, owner, ["type": "load", "code": code, "state": NSNull()])
        _ = try await request(second, owner, ["type": "load", "code": code, "state": NSNull()])
        let a = try await request(
            first, owner, ["type": "command", "name": "increment", "state": ["count": 0]])
        let b = try await request(
            second, owner, ["type": "command", "name": "increment", "state": ["count": 0]])
        XCTAssertEqual(a["result"] as? Int, 1)
        XCTAssertEqual(b["result"] as? Int, 1)
        do {
            _ = try await request(first, owner, ["type": "command", "name": "fail", "state": ["count": 1]])
            XCTFail("A thrown reducer must fail")
        } catch { XCTAssertTrue(String(describing: error).contains("intentional")) }
        let next = try await request(
            first, owner, ["type": "command", "name": "increment", "state": ["count": 1]])
        XCTAssertEqual(dictionary(next["state"])["count"] as? Int, 2)
        await withCheckedContinuation { continuation in
            owner.async {
                first.stop()
                second.stop()
                continuation.resume()
            }
        }
    }

    func testBoundedRepeatedFramesAndStoppedRuntime() async throws {
        let owner = DispatchQueue(label: "test.embedded.frames")
        let runtime = EmbeddedRuntime(queue: owner, generation: 2)
        let code = """
            globalThis.SkynetApp = {
                initialState:()=>({count:0,padding:"x".repeat(65536)}),
                reduce: state=>({state:{...state,count:state.count+1}})
            };
            """
        var value = try await request(runtime, owner, ["type": "load", "code": code, "state": NSNull()])
        for _ in 0..<512 {
            value = try await request(
                runtime, owner, ["type": "command", "name": "next", "state": value["state"]!])
        }
        XCTAssertEqual(dictionary(value["state"])["count"] as? Int, 512)
        await withCheckedContinuation { continuation in
            owner.async {
                runtime.stop()
                continuation.resume()
            }
        }
        do {
            _ = try await request(runtime, owner, ["type": "command"])
            XCTFail("Stopped VM must reject new work")
        } catch { XCTAssertTrue(String(describing: error).contains("unavailable")) }
    }

    private func request(_ runtime: EmbeddedRuntime, _ queue: DispatchQueue, _ value: [String: Any])
        async throws -> [String: Any]
    {
        try await withCheckedThrowingContinuation { continuation in
            queue.async { runtime.request(value) { continuation.resume(with: $0) } }
        }
    }
}
