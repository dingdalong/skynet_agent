import Foundation
import XCTest

@testable import SkynetHostCore

final class LocalExecutionTests: XCTestCase {
    private var root: URL!
    private var project: URL!
    private var service: AgentServices!
    private var target: [String: String] = [:]
    private var context: [String: Any] = [:]
    override func setUpWithError() throws {
        root = FileManager.default.temporaryDirectory.appendingPathComponent(
            "skynet-local-\(UUID().uuidString)")
        project = root.appendingPathComponent("project")
        try FileManager.default.createDirectory(at: project, withIntermediateDirectories: true)
        let native = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
            .deletingLastPathComponent().deletingLastPathComponent()
        service = try AgentServices(
            root: root, launcher: native.appendingPathComponent(".build/c-core/process_launcher"))
        target = try service.addDirectory(project)
        let ready = expectation(description: "native local context")
        service.context(reset: false) { result in
            self.context = (try? result.get()) ?? [:]
            ready.fulfill()
        }
        wait(for: [ready], timeout: 3)
    }
    override func tearDownWithError() throws {
        service.close()
        service = nil
        try? FileManager.default.removeItem(at: root)
    }
    private func action(
        _ operation: String, _ args: [String: Any], id: String = UUID().uuidString,
        override: [String: Any] = [:], timeout: TimeInterval = 8
    ) throws -> [String: Any] {
        var input: [String: Any] = [
            "request_id": id, "session_id": "chat-1", "run_id": "run-1", "operation": operation,
            "workspace_id": target["workspace_id"]!, "authorization_id": context["authorizationId"]!,
            "remote": false, "arguments": String(data: try jsonData(args), encoding: .utf8)!,
        ]
        input.merge(override) { _, next in next }
        let done = expectation(description: "native \(operation)")
        var response: Result<[String: Any], Error>!
        service.execute(input) { result in
            response = result
            done.fulfill()
        }
        wait(for: [done], timeout: timeout)
        return try response.get()
    }
    func testProjectRulesPatchAndCommandUseTheSelectedRoot() throws {
        try Data("使用中文回答\n".utf8).write(to: project.appendingPathComponent("AGENTS.md"))
        let rules = try action("project", ["max_bytes": 32768])
        XCTAssertEqual(dictionary(rules["project"])["text"] as? String, "使用中文回答\n")
        let patch = "*** Begin Patch\n*** Add File: native.txt\n+LOCAL_NATIVE_OK\n*** End Patch\n"
        let prepared = try action("prepare", ["name": "apply_patch", "args": ["patch": patch]])
        XCTAssertEqual(prepared["ok"] as? Bool, true)
        let applied = try action("execute", ["name": "apply_patch", "args": ["patch": patch]])
        XCTAssertEqual(applied["ok"] as? Bool, true, "\(applied)")
        XCTAssertEqual(
            try String(contentsOf: project.appendingPathComponent("native.txt"), encoding: .utf8),
            "LOCAL_NATIVE_OK\n")
        let result = try action(
            "execute", ["name": "exec_command", "args": ["cmd": "cat native.txt", "yield_time_ms": 1000]])
        XCTAssertEqual(result["exit_code"] as? Int, 0, "\(result)")
        XCTAssertEqual(result["output"] as? String, "LOCAL_NATIVE_OK\n")
    }
    func testAuthorizationRemoteScopeAndRequestIdentity() throws {
        XCTAssertThrowsError(try action("project", [:], override: ["authorization_id": "old"]))
        XCTAssertThrowsError(try action("project", [:], override: ["workspace_id": "forged"]))
        XCTAssertThrowsError(try action("project", [:], override: ["remote": true]))
        let args: [String: Any] = [
            "name": "exec_command", "args": ["cmd": "printf x >> once.txt", "yield_time_ms": 1000],
        ]
        let id = UUID().uuidString
        _ = try action("execute", args, id: id)
        _ = try action("execute", args, id: id)
        XCTAssertEqual(
            try String(contentsOf: project.appendingPathComponent("once.txt"), encoding: .utf8), "x")
        XCTAssertThrowsError(
            try action("execute", ["name": "exec_command", "args": ["cmd": "printf y >> once.txt"]], id: id))
        let reset = expectation(description: "reset authorization")
        service.context(reset: true) { _ in reset.fulfill() }
        wait(for: [reset], timeout: 3)
        XCTAssertThrowsError(try action("project", [:]))
    }
    func testRejectsEscapesAndSandboxActuallyDeniesOutsideWrites() throws {
        let outside = root.appendingPathComponent("outside")
        try FileManager.default.createDirectory(at: outside, withIntermediateDirectories: true)
        try FileManager.default.createSymbolicLink(
            at: project.appendingPathComponent("escape"), withDestinationURL: outside)
        let escape = try action(
            "prepare", ["name": "exec_command", "args": ["cmd": "pwd", "workdir": "escape"]])
        XCTAssertEqual(escape["ok"] as? Bool, false)
        let escalated = try action(
            "prepare",
            ["name": "exec_command", "args": ["cmd": "pwd", "sandbox_permissions": "require_escalated"]])
        XCTAssertEqual(escalated["ok"] as? Bool, false)
        let patch = "*** Begin Patch\n*** Add File: ../escape.txt\n+x\n*** End Patch\n"
        XCTAssertEqual(
            try action("prepare", ["name": "apply_patch", "args": ["patch": patch]])["ok"] as? Bool, false)
        let denied = try action(
            "execute",
            ["name": "exec_command", "args": ["cmd": "printf x > ../outside/no.txt", "yield_time_ms": 1000]])
        XCTAssertNotEqual(denied["exit_code"] as? Int, 0)
        XCTAssertFalse(FileManager.default.fileExists(atPath: outside.appendingPathComponent("no.txt").path))
    }
    func testBackgroundStatusInputCancellationAndSessionIsolation() throws {
        let background = try action(
            "execute",
            [
                "name": "exec_command",
                "args": [
                    "cmd": "printf START; sleep 0.2; printf DONE", "yield_time_ms": 1,
                ],
            ])
        let id = try XCTUnwrap(background["session_id"] as? String)
        XCTAssertEqual(try action("status", ["session_id": id])["done"] as? Bool, false)
        let collected = try action(
            "execute", ["name": "write_stdin", "args": ["session_id": id, "yield_time_ms": 1000]])
        XCTAssertEqual(collected["exit_code"] as? Int, 0)
        XCTAssertTrue((try action("status", ["session_id": id])["output"] as? String ?? "").contains("DONE"))
        XCTAssertEqual(
            try action("status", ["session_id": id], override: ["session_id": "other-chat"])["ok"] as? Bool,
            false)
        let tty = try action(
            "execute",
            [
                "name": "exec_command",
                "args": [
                    "cmd": "read -r line; printf 'RESULT:%s' \"$line\"", "tty": true, "yield_time_ms": 1,
                ],
            ])
        let ttyId = try XCTUnwrap(tty["session_id"] as? String)
        let input = try action(
            "execute",
            [
                "name": "write_stdin",
                "args": ["session_id": ttyId, "chars": "hello\n", "yield_time_ms": 1000],
            ])
        XCTAssertTrue((input["output"] as? String ?? "").contains("RESULT:hello"), "\(input)")
        let running = try action(
            "execute", ["name": "exec_command", "args": ["cmd": "sleep 20", "yield_time_ms": 1]])
        let runningId = try XCTUnwrap(running["session_id"] as? String)
        _ = try action("cancel", ["session_id": runningId])
        let stopped = try action(
            "execute", ["name": "write_stdin", "args": ["session_id": runningId, "yield_time_ms": 1000]])
        XCTAssertEqual(stopped["done"] as? Bool, true)
        XCTAssertEqual(stopped["cancelled"] as? Bool, true)
    }
    func testServerOriginsAreExactAndRequireSecureRemoteTransport() throws {
        XCTAssertEqual(try AgentServices.origin("wss://Example.com:443/agent"), "wss://example.com:443")
        XCTAssertEqual(try AgentServices.origin("ws://localhost:18787/agent"), "ws://localhost:18787")
        for value in [
            "ws://example.com/agent", "https://example.com", "wss://user:pass@example.com",
            "wss://example.com/#token",
        ] {
            XCTAssertThrowsError(try AgentServices.origin(value))
        }
    }
    func testTimeoutIsAFailureAndRespectsTheServerBudget() throws {
        let invalid = try action(
            "prepare",
            [
                "name": "exec_command", "limits": ["timeout_ms": 100],
                "args": ["cmd": "sleep 2", "timeout_ms": 200],
            ])
        XCTAssertEqual(invalid["ok"] as? Bool, false)
        let timedOut = try action(
            "execute",
            [
                "name": "exec_command", "limits": ["timeout_ms": 100],
                "args": ["cmd": "sleep 2", "yield_time_ms": 1000],
            ])
        XCTAssertEqual(timedOut["done"] as? Bool, true)
        XCTAssertEqual(timedOut["ok"] as? Bool, false)
        XCTAssertEqual(timedOut["cancelled"] as? Bool, false)
        XCTAssertTrue((timedOut["error"] as? String ?? "").contains("超时"))
    }

    func testLongPendingCollectionReturnsOnceAndLeavesTheProcessRunning() throws {
        let result = try action(
            "execute",
            ["name": "exec_command", "args": ["cmd": "sleep 35", "yield_time_ms": 30_000]],
            timeout: 40)
        XCTAssertEqual(result["done"] as? Bool, false)
        let id = try XCTUnwrap(result["session_id"] as? String)
        XCTAssertEqual(try action("status", ["session_id": id])["done"] as? Bool, false)
        _ = try action("cancel", ["session_id": id])
    }
}
