import CryptoKit
import Darwin
import XCTest

@testable import SkynetHostCore

final class ProcessTests: XCTestCase {
    var directory: URL!
    var host: HostCore!

    override func setUpWithError() throws {
        directory = FileManager.default.temporaryDirectory.appendingPathComponent(
            "skynet-\(UUID().uuidString)")
        let builtins = directory.appendingPathComponent("builtins")
        try FileManager.default.createDirectory(at: builtins, withIntermediateDirectories: true)
        let native = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
            .deletingLastPathComponent().deletingLastPathComponent()
        let runtime = native.appendingPathComponent(".build/out/Products/Debug/SkynetAppRuntime")
        XCTAssertTrue(FileManager.default.isExecutableFile(atPath: runtime.path))
        host = try HostCore(
            dataRoot: directory.appendingPathComponent("data"), builtins: builtins,
            launcher: native.appendingPathComponent(".build/c-core/process_launcher"), executable: runtime)
    }

    override func tearDownWithError() throws {
        let done = expectation(description: "shutdown")
        host.shutdown { done.fulfill() }
        wait(for: [done], timeout: 5)
        host = nil
        try FileManager.default.removeItem(at: directory)
    }

    func package(
        _ id: String, code: String, version: String = "1.0.0", permissions: [String] = [],
        actions: [String: Any] = [:], origins: [String] = []
    ) throws -> URL {
        let root = directory.appendingPathComponent("\(UUID().uuidString).skapp")
        try FileManager.default.createDirectory(
            at: root.appendingPathComponent("ui"), withIntermediateDirectories: true)
        let files = ["runtime.js": code, "ui/index.html": "<!doctype html><html><body>fixture</body></html>"]
        var digests: [String: String] = [:]
        for (path, value) in files {
            let data = Data(value.utf8)
            try data.write(to: root.appendingPathComponent(path))
            digests[path] = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        }
        let manifest: [String: Any] = [
            "schemaVersion": 1, "minimumHostVersion": 1, "stateVersion": 1, "id": id, "name": id,
            "version": version, "permissions": permissions, "networkOrigins": origins, "actions": actions,
            "files": digests,
        ]
        try jsonData(manifest).write(to: root.appendingPathComponent("manifest.json"))
        return root
    }

    @discardableResult
    func install(_ root: URL, permissions: [String] = [], succeeds: Bool = true) -> [String: Any] {
        let done = expectation(description: "install")
        var response: [String: Any] = [:]
        host.install(source: root, approvedPermissions: permissions) { result in
            switch result {
            case .success(let value):
                XCTAssertTrue(succeeds)
                response = value
            case .failure(let error): XCTAssertFalse(succeeds, "\(error)")
            }
            done.fulfill()
        }
        wait(for: [done], timeout: 8)
        return response
    }

    let counter = """
        globalThis.SkynetApp = {
          initialState(){return {count:0}},
          reduce(state, command){
            if(command.type === 'hang') { while(true){} }
            if(command.type === 'crash') throw Error('fixture error');
            return {state:{count:state.count+1}, result:state.count+1};
          }
        };
        """

    func testActualHelperSerialMailboxAndViewReload() throws {
        install(try package("test.counter", code: counter))
        let started = expectation(description: "runtime ready")
        var fulfilled = false
        let first = host.attach(appId: "test.counter") { value in
            if value["revision"] as? Int ?? 0 > 0, !fulfilled {
                fulfilled = true
                started.fulfill()
            }
        }
        wait(for: [started], timeout: 5)
        let completed = expectation(description: "commands committed")
        completed.expectedFulfillmentCount = 32
        var results: [Int] = []
        for _ in 0..<32 {
            host.request(lease: first, kind: "command", input: ["name": "increment"]) { result in
                do { results.append(try result.get()["result"] as? Int ?? -1) } catch { XCTFail("\(error)") }
                completed.fulfill()
            }
        }
        wait(for: [completed], timeout: 8)
        XCTAssertEqual(results, Array(1...32))
        host.detach(first)
        let reloaded = expectation(description: "new view has durable state")
        var reloadFulfilled = false
        let second = host.attach(appId: "test.counter") { value in
            if dictionary(value["state"])["count"] as? Int == 32, !reloadFulfilled {
                reloadFulfilled = true
                reloaded.fulfill()
            }
        }
        wait(for: [reloaded], timeout: 3)
        host.detach(second)
    }

    func testCollapsedAppRetainsItsProcessAndCommittedState() throws {
        install(try package("test.left", code: counter))
        install(try package("test.right", code: counter))
        func apply(_ command: String, _ input: [String: Any]) -> [String: Any] {
            let done = expectation(description: command)
            var snapshot: [String: Any] = [:]
            host.workspace(command, input: input) { result in
                do { snapshot = try result.get() } catch { XCTFail("\(error)") }
                done.fulfill()
            }
            wait(for: [done], timeout: 4)
            return snapshot
        }
        _ = apply("open", ["appId": "test.left"])
        _ = apply("split", ["appId": "test.left", "edge": "left"])
        _ = apply("open", ["appId": "test.right"])
        let lease = host.attach(appId: "test.left") { _ in }
        let incremented = expectation(description: "left app commits state")
        host.request(lease: lease, kind: "command", input: ["name": "increment"]) { result in
            XCTAssertEqual((try? result.get())?["result"] as? Int, 1)
            incremented.fulfill()
        }
        wait(for: [incremented], timeout: 4)
        let before = apply("resize", ["ratio": 1.0 / 3])
        let collapsed = apply("collapse", ["edge": "left"])
        XCTAssertEqual(dictionary(collapsed["workspace"])["panes"] as? [String], ["test.right"])
        let beforeApps = before["apps"] as? [[String: Any]] ?? []
        let afterApps = collapsed["apps"] as? [[String: Any]] ?? []
        let beforePid = beforeApps.first { $0["id"] as? String == "test.left" }?["pid"] as? Int
        let afterPid = afterApps.first { $0["id"] as? String == "test.left" }?["pid"] as? Int
        XCTAssertGreaterThan(beforePid ?? 0, 0)
        XCTAssertEqual(afterPid, beforePid)
        host.detach(lease)
        let background = host.attach(appId: "test.left") { _ in }
        let resumed = expectation(description: "collapsed app continues in the same process")
        host.request(lease: background, kind: "command", input: ["name": "increment"]) { result in
            XCTAssertEqual((try? result.get())?["result"] as? Int, 2)
            resumed.fulfill()
        }
        wait(for: [resumed], timeout: 4)
        host.detach(background)
    }

    func testHungAppDoesNotBlockAnotherAppAndIsTerminated() throws {
        install(try package("test.hang", code: counter))
        install(try package("test.healthy", code: counter))
        let failed = expectation(description: "deadline kills hung helper")
        let healthy = expectation(description: "other app responds while first is hung")
        let first = host.attach(appId: "test.hang") { _ in }
        let second = host.attach(appId: "test.healthy") { _ in }
        host.request(lease: first, kind: "command", input: ["name": "hang"]) { result in
            if case .success = result { XCTFail("Hung app should time out") }
            failed.fulfill()
        }
        host.request(lease: second, kind: "command", input: ["name": "increment"]) { result in
            XCTAssertEqual((try? result.get())?["result"] as? Int, 1)
            healthy.fulfill()
        }
        wait(for: [healthy], timeout: 1.5)
        wait(for: [failed], timeout: 4)
        host.detach(first)
        host.detach(second)
    }

    func testFailedUpdateRetainsOldVersionAndData() throws {
        install(try package("test.update", code: counter))
        let lease = host.attach(appId: "test.update") { _ in }
        let incremented = expectation(description: "old version committed")
        host.request(lease: lease, kind: "command", input: ["name": "increment"]) { _ in incremented.fulfill()
        }
        wait(for: [incremented], timeout: 4)
        install(
            try package("test.update", code: "throw Error('broken update')", version: "2.0.0"),
            succeeds: false)
        let checked = expectation(description: "old app remains usable")
        host.request(lease: lease, kind: "command", input: ["name": "increment"]) { result in
            XCTAssertEqual((try? result.get())?["result"] as? Int, 2)
            checked.fulfill()
        }
        wait(for: [checked], timeout: 3)
        host.detach(lease)
    }

    func testPermissionDenialAndManifestIntegrity() throws {
        let root = try package("test.denied", code: counter, permissions: ["network"])
        install(root, succeeds: false)
        try Data("tampered".utf8).write(to: root.appendingPathComponent("runtime.js"))
        install(root, permissions: ["network"], succeeds: false)
        let valid = try package("test.lease", code: counter)
        install(valid)
        let lease = host.attach(appId: "test.lease") { _ in }
        let denied = expectation(description: "unprivileged view cannot mutate host")
        host.request(lease: lease, kind: "preferences.set", input: ["appearance": "dark"]) { result in
            if case .success = result { XCTFail("Missing permission accepted") }
            denied.fulfill()
        }
        wait(for: [denied], timeout: 3)
        host.detach(lease)
        let stale = expectation(description: "expired lease rejected")
        host.request(lease: lease, kind: "command", input: ["name": "increment"]) { result in
            if case .success = result { XCTFail("Expired lease accepted") }
            stale.fulfill()
        }
        wait(for: [stale], timeout: 3)
    }

    func testMediatedActionChecksBothSchemasAndPermission() throws {
        let input: [String: Any] = [
            "type": "object", "properties": ["amount": ["type": "integer"]],
            "required": ["amount"], "additionalProperties": false,
        ]
        let output: [String: Any] = ["type": "integer"]
        let actions: [String: Any] = [
            "add": ["title": "Add", "input": input, "output": output],
            "bad": ["title": "Bad", "input": input, "output": output],
        ]
        let target = """
            globalThis.SkynetApp = {
              initialState(){ return {count:0} }, reduce(state){return {state}},
              actions:{
                add(state,input){return {state:{count:state.count+input.amount},result:state.count+input.amount}},
                bad(state,input){return {state:{count:999},result:"invalid"}}
              }
            };
            """
        install(try package("test.target", code: target, actions: actions))
        let permissions = ["apps.call:test.target:add", "apps.call:test.target:bad"]
        install(try package("test.caller", code: counter, permissions: permissions), permissions: permissions)
        let lease = host.attach(appId: "test.caller") { _ in }
        let called = expectation(description: "brokered action")
        host.request(
            lease: lease, kind: "action",
            input: ["target": "test.target", "name": "add", "input": ["amount": 3]]
        ) { result in
            XCTAssertEqual((try? result.get())?["result"] as? Int, 3)
            called.fulfill()
        }
        wait(for: [called], timeout: 5)
        let denied = expectation(description: "invalid inputs and undeclared grants are rejected")
        denied.expectedFulfillmentCount = 2
        host.request(
            lease: lease, kind: "action",
            input: ["target": "test.target", "name": "add", "input": ["amount": "invalid"]]
        ) { result in
            if case .success = result { XCTFail("Invalid action input accepted") }
            denied.fulfill()
        }
        host.request(
            lease: lease, kind: "action",
            input: ["target": "test.target", "name": "undeclared", "input": [:]]
        ) { result in
            if case .success = result { XCTFail("Undeclared action accepted") }
            denied.fulfill()
        }
        wait(for: [denied], timeout: 3)
        let invalid = expectation(description: "invalid output not committed")
        host.request(
            lease: lease, kind: "action",
            input: ["target": "test.target", "name": "bad", "input": ["amount": 1]]
        ) { result in
            if case .success = result { XCTFail("Bad action result accepted") }
            invalid.fulfill()
        }
        wait(for: [invalid], timeout: 3)
        let unchanged = expectation(description: "state only changed by valid action")
        var fulfilled = false
        let targetLease = host.attach(appId: "test.target") { snapshot in
            if dictionary(snapshot["state"])["count"] as? Int == 3, !fulfilled {
                fulfilled = true
                unchanged.fulfill()
            }
        }
        wait(for: [unchanged], timeout: 3)
        host.detach(lease)
        host.detach(targetLease)
    }

    func testActualWebSocketSurvivesViewReload() throws {
        guard let url = ProcessInfo.processInfo.environment["SKYNET_TEST_SOCKET"] else {
            throw failure("fixture", "Run native tests through node tooling/macos.mjs test")
        }
        let code = """
            globalThis.SkynetApp = {
              initialState(){return {connectionId:"",messages:[],sent:0}},
              reduce(state,command){
                if(command.type==="connect") return {state,effects:[{id:"connect",kind:"socket.open",input:{key:"main",url:"\(url)"}}]};
                if(command.type==="ping") return {state:{...state,sent:state.sent+1},effects:[{id:"ping"+state.sent,kind:"socket.send",input:{key:"main",text:"ping"}}]};
                if(command.type==="$effect" && command.payload.id==="connect")
                  return {state:{...state,connectionId:command.payload.value.connectionId}};
                if(command.type==="$resource" && command.payload.text)
                  return {state:{...state,messages:[...state.messages,command.payload.text]}};
                return {state};
              }
            };
            """
        install(
            try package("test.socket", code: code, permissions: ["network"], origins: [url]),
            permissions: ["network"])
        var nativeConnection = ""
        let connected = expectation(description: "native socket owned by host")
        var connectedOnce = false
        let first = host.attach(appId: "test.socket") { value in
            if let id = dictionary(value["state"])["connectionId"] as? String, !id.isEmpty, !connectedOnce {
                connectedOnce = true
                nativeConnection = id
                connected.fulfill()
            }
        }
        host.request(lease: first, kind: "command", input: ["name": "connect"]) { _ in }
        wait(for: [connected], timeout: 5)
        host.detach(first)
        let received = expectation(description: "same native and server connection after reload")
        var receivedOnce = false
        let second = host.attach(appId: "test.socket") { value in
            let state = dictionary(value["state"])
            if let messages = state["messages"] as? [String], messages.count == 2, !receivedOnce {
                receivedOnce = true
                XCTAssertEqual(state["connectionId"] as? String, nativeConnection)
                XCTAssertEqual(messages[0], messages[1], "Fixture identifies the physical server connection")
                received.fulfill()
            }
        }
        host.request(lease: second, kind: "command", input: ["name": "ping"]) { _ in }
        host.request(lease: second, kind: "command", input: ["name": "ping"]) { _ in }
        wait(for: [received], timeout: 6)
        host.detach(second)
    }

    func testRepeatedBoundedStateTransitionsDoNotRetainOldFrames() throws {
        let code = """
            globalThis.SkynetApp = {
              initialState(){return {text:"x".repeat(65536), count:0}},
              reduce(state){return {state:{...state,count:state.count+1},result:state.count+1}}
            };
            """
        install(try package("test.frames", code: code))
        let lease = host.attach(appId: "test.frames") { _ in }
        defer { host.detach(lease) }
        for index in 1...512 {
            let done = expectation(description: "bounded transition \(index)")
            var response: Result<[String: Any], Error>?
            host.request(lease: lease, kind: "command", input: ["name": "increment"]) {
                response = $0
                done.fulfill()
            }
            wait(for: [done], timeout: 4)
            let value = try XCTUnwrap(response).get()
            XCTAssertEqual(value["result"] as? Int, index)
        }
    }

    func testMemoryGrowthIsTerminated() throws {
        let code = """
            globalThis.SkynetApp = {
              initialState(){return {}},
              reduce(state,command){
                const allocations=[];
                while(true){ const data=new Uint8Array(8*1024*1024); data.fill(42); allocations.push(data); }
              }
            };
            """
        install(try package("test.memory", code: code))
        let lease = host.attach(appId: "test.memory") { _ in }
        let failed = expectation(description: "supervisor terminates memory growth")
        host.request(lease: lease, kind: "command", input: ["name": "allocate"]) { result in
            if case .success = result { XCTFail("Unbounded allocation accepted") }
            if case .failure(let error) = result { XCTAssertEqual((error as? HostError)?.code, "memory") }
            failed.fulfill()
        }
        wait(for: [failed], timeout: 4)
        host.detach(lease)
    }

    func testBinarySocketAndNativeTimerSurviveViewDetach() throws {
        let url = try XCTUnwrap(ProcessInfo.processInfo.environment["SKYNET_TEST_SOCKET"])
        let code = """
            globalThis.SkynetApp = {
              initialState(){return {events:[],connectionId:"",data:"",timer:false}},
              start(state){return {state,effects:[{id:"open",kind:"socket.open",input:{key:"binary",url:"\(url)"}}]}},
              reduce(state,command){
                if(command.type==="$effect"){
                  const event=command.payload;
                  if(event.id==="open") return {state:{...state,connectionId:event.value.connectionId}};
                  if(event.id==="timer") return {state:{...state,timer:true}};
                  return {state:{...state,events:[...state.events,event]}};
                }
                if(command.type==="$resource") return {state:{...state,data:command.payload.data ?? ""}};
                if(command.type==="send") return {state,effects:[
                  {id:"send",kind:"socket.send",input:{key:"binary",connectionId:state.connectionId,data:"AP9/gA=="}},
                  {id:"timer",kind:"timer.wait",input:{key:"clock",milliseconds:200}}
                ]};
                if(command.type==="invalid") return {state,effects:[
                  {id:"mixed",kind:"socket.send",input:{key:"binary",text:"text",data:"AA=="}},
                  {id:"stale",kind:"socket.send",input:{key:"binary",connectionId:"expired",data:"AA=="}},
                  {id:"oversize",kind:"socket.send",input:{key:"binary",data:"A".repeat(349532)}},
                  {id:"delay",kind:"timer.wait",input:{key:"bad",milliseconds:true}}
                ]};
                if(command.type==="closeDuringSend") return {state,effects:[
                  {id:"closed-send",kind:"socket.send",input:{key:"binary",data:"AA=="}},
                  {id:"close",kind:"socket.close",input:{key:"binary"}}
                ]};
                return {state};
              }
            };
            """
        install(
            try package("test.binary", code: code, permissions: ["network"], origins: [url]),
            permissions: ["network"])
        let connected = expectation(description: "startup owns binary socket")
        var once = false
        let lease = host.attach(appId: "test.binary") { snapshot in
            if let id = dictionary(snapshot["state"])["connectionId"] as? String, !id.isEmpty, !once {
                once = true
                connected.fulfill()
            }
        }
        wait(for: [connected], timeout: 5)
        let sent = expectation(description: "binary and timer effects committed")
        host.request(lease: lease, kind: "command", input: ["name": "send"]) { _ in sent.fulfill() }
        wait(for: [sent], timeout: 4)
        host.detach(lease)
        let received = expectation(description: "native resources outlive presentation")
        var receivedOnce = false
        let second = host.attach(appId: "test.binary") { snapshot in
            let state = dictionary(snapshot["state"])
            if state["data"] as? String == "AP9/gA==", state["timer"] as? Bool == true, !receivedOnce {
                receivedOnce = true
                received.fulfill()
            }
        }
        wait(for: [received], timeout: 5)
        let rejected = expectation(description: "malformed resource operations rejected independently")
        var rejectedOnce = false
        let third = host.attach(appId: "test.binary") { snapshot in
            let events = dictionary(snapshot["state"])["events"] as? [[String: Any]] ?? []
            let errors = events.filter { $0["error"] is String }
            if errors.count == 4, !rejectedOnce {
                rejectedOnce = true
                rejected.fulfill()
            }
        }
        host.request(lease: second, kind: "command", input: ["name": "invalid"]) { _ in }
        wait(for: [rejected], timeout: 5)
        let settled = expectation(description: "closing a socket also settles its pending sends")
        var settledOnce = false
        let closing = host.attach(appId: "test.binary") { snapshot in
            let events = dictionary(snapshot["state"])["events"] as? [[String: Any]] ?? []
            if events.contains(where: { $0["id"] as? String == "closed-send" }), !settledOnce {
                settledOnce = true
                settled.fulfill()
            }
        }
        host.request(lease: second, kind: "command", input: ["name": "closeDuringSend"]) { _ in }
        wait(for: [settled], timeout: 5)
        host.detach(second)
        host.detach(third)
        host.detach(closing)
    }

    func testRealAgentRuntimeBinaryProtocolAndPresentationReload() throws {
        let environment = ProcessInfo.processInfo.environment
        let url = try XCTUnwrap(environment["SKYNET_TEST_SOCKET"])
        let code = try String(
            contentsOfFile: XCTUnwrap(environment["SKYNET_TEST_AGENT_RUNTIME"]), encoding: .utf8)
        install(
            try package("test.agent", code: code, permissions: ["network"], origins: [url]),
            permissions: ["network"])
        let ready = expectation(description: "Agent receives initial data in actual JavaScriptCore")
        var once = false
        let first = host.attach(appId: "test.agent") { snapshot in
            if dictionary(snapshot["state"])["version"] as? Int == 1, !once {
                once = true
                ready.fulfill()
            }
        }
        wait(for: [ready], timeout: 5)
        host.request(
            lease: first, kind: "command",
            input: [
                "name": "connection.configure",
                "payload": ["url": "\(url)/agent", "username": "native-agent"],
            ]
        ) { _ in }
        let online = expectation(description: "Agent logs in over binary socket")
        var onlineOnce = false
        var connectionId = ""
        let observer = host.attach(appId: "test.agent") { snapshot in
            let connection = dictionary(dictionary(snapshot["state"])["connection"])
            if connection["status"] as? String == "online", !onlineOnce {
                onlineOnce = true
                connectionId = connection["id"] as? String ?? ""
                online.fulfill()
            }
        }
        wait(for: [online], timeout: 6)
        let accepted = expectation(description: "chat acknowledged before detaching view")
        var acceptedOnce = false
        let progress = host.attach(appId: "test.agent") { snapshot in
            let state = dictionary(snapshot["state"])
            if state["selectedId"] as? String == "session", !acceptedOnce {
                acceptedOnce = true
                accepted.fulfill()
            }
        }
        host.request(
            lease: first, kind: "command",
            input: [
                "name": "chat.send", "payload": ["target": "", "text": "native integration"],
            ]
        ) { _ in }
        wait(for: [accepted], timeout: 6)
        host.detach(first)
        host.detach(observer)
        host.detach(progress)
        let completed = expectation(
            description: "same Agent connection receives final state after presentation reload")
        var completedOnce = false
        let reloaded = host.attach(appId: "test.agent") { snapshot in
            let state = dictionary(snapshot["state"])
            let session = dictionary(dictionary(dictionary(state["sessions"])["session"])["session"])
            let messages = session["messages"] as? [[String: Any]] ?? []
            let tools = messages.first?["tool_calls"] as? [[String: Any]] ?? []
            if messages.first?["status"] as? Int == 2, tools.first?["output"] as? String == "background✓",
                !completedOnce
            {
                completedOnce = true
                XCTAssertEqual(messages.first?["content"] as? String, "binary✓")
                XCTAssertEqual(dictionary(state["connection"])["id"] as? String, connectionId)
                XCTAssertEqual(state["selectedId"] as? String, "session")
                XCTAssertEqual(state["syncing"] as? Bool, false)
                XCTAssertEqual(dictionary(state["connection"])["nextId"] as? Int, 3)
                completed.fulfill()
            }
        }
        wait(for: [completed], timeout: 6)
        host.detach(reloaded)
    }

    func testInstalledAppCannotAcquireBuiltinAgentDirectoryOrServerAccess() throws {
        install(try package("test.untrusted", code: counter))
        let lease = host.attach(appId: "test.untrusted") { _ in }
        let denied = expectation(description: "native Agent capabilities remain builtin-only")
        denied.expectedFulfillmentCount = 3
        for kind in ["agent.directory.choose", "agent.server.authorize", "agent.remote.set"] {
            host.request(lease: lease, kind: kind, input: ["url": "wss://example.com", "enabled": true]) {
                result in
                switch result {
                case .success: XCTFail("Installed application acquired \(kind)")
                case .failure(let error): XCTAssertEqual((error as? HostError)?.code, "permission")
                }
                denied.fulfill()
            }
        }
        wait(for: [denied], timeout: 4)
        host.detach(lease)
    }

    func testProcessCrashAndRestartPreserveCommittedState() throws {
        install(try package("test.crash", code: counter))
        let ready = expectation(description: "committed before crash")
        var processId: Int32 = 0
        var readyOnce = false
        let lease = host.attach(appId: "test.crash") { snapshot in
            if dictionary(snapshot["state"])["count"] as? Int == 1, !readyOnce {
                readyOnce = true
                let apps = snapshot["apps"] as? [[String: Any]] ?? []
                processId = Int32(apps.first { $0["id"] as? String == "test.crash" }?["pid"] as? Int ?? 0)
                ready.fulfill()
            }
        }
        host.request(lease: lease, kind: "command", input: ["name": "increment"]) { _ in }
        wait(for: [ready], timeout: 5)
        XCTAssertGreaterThan(processId, 0)
        XCTAssertEqual(Darwin.kill(processId, SIGKILL), 0)
        let stopped = expectation(description: "native supervisor reports crash")
        var stoppedOnce = false
        let crashedView = host.attach(appId: "test.crash") { snapshot in
            if snapshot["error"] is String, !stoppedOnce {
                stoppedOnce = true
                stopped.fulfill()
            }
        }
        wait(for: [stopped], timeout: 3)
        let restarted = expectation(description: "restart")
        host.workspace("restart", input: ["appId": "test.crash"]) { result in
            if case .failure(let error) = result { XCTFail("\(error)") }
            restarted.fulfill()
        }
        wait(for: [restarted], timeout: 3)
        let recovered = expectation(description: "committed state survives process crash")
        host.request(lease: lease, kind: "command", input: ["name": "increment"]) { result in
            XCTAssertEqual((try? result.get())?["result"] as? Int, 2)
            recovered.fulfill()
        }
        wait(for: [recovered], timeout: 5)
        host.detach(lease)
        host.detach(crashedView)
    }

    func testSuccessfulUpdateRestartsRuntimeWithoutLosingState() throws {
        install(try package("test.upgrade", code: counter))
        let lease = host.attach(appId: "test.upgrade") { _ in }
        let initial = expectation(description: "old app state")
        host.request(lease: lease, kind: "command", input: ["name": "increment"]) { _ in initial.fulfill() }
        wait(for: [initial], timeout: 4)
        let upgraded = counter.replacingOccurrences(of: "state.count+1", with: "state.count+10")
        install(try package("test.upgrade", code: upgraded, version: "2.0.0"))
        let checked = expectation(description: "updated app uses saved state")
        host.request(lease: lease, kind: "command", input: ["name": "increment"]) { result in
            XCTAssertEqual((try? result.get())?["result"] as? Int, 11)
            checked.fulfill()
        }
        wait(for: [checked], timeout: 4)
        host.detach(lease)
    }

    func testFailedStorageDoesNotPublishUncommittedState() throws {
        install(try package("test.storage", code: counter))
        let ready = expectation(description: "initial state persisted")
        var fulfilled = false
        let lease = host.attach(appId: "test.storage") { snapshot in
            if dictionary(snapshot["state"])["count"] as? Int == 0, !fulfilled {
                fulfilled = true
                ready.fulfill()
            }
        }
        wait(for: [ready], timeout: 4)
        let file = directory.appendingPathComponent("data/state/test.storage.json")
        try FileManager.default.removeItem(at: file)
        try FileManager.default.createDirectory(at: file, withIntermediateDirectories: false)
        let rejected = expectation(description: "failed state write rejects command")
        host.request(lease: lease, kind: "command", input: ["name": "increment"]) { result in
            if case .success = result { XCTFail("Uncommitted state reported as successful") }
            rejected.fulfill()
        }
        wait(for: [rejected], timeout: 4)
        let unchanged = expectation(description: "snapshot remains committed state")
        host.request(lease: lease, kind: "snapshot", input: [:]) { result in
            XCTAssertEqual(dictionary((try? result.get())?["state"])["count"] as? Int, 0)
            unchanged.fulfill()
        }
        wait(for: [unchanged], timeout: 3)
        host.detach(lease)
    }

    func testCancelledTaskIgnoresLateCompletion() throws {
        let schema: [String: Any] = ["type": "object", "properties": [:], "additionalProperties": false]
        let slow = """
            globalThis.SkynetApp = {
              initialState(){return {}}, reduce(state){return {state}},
              actions:{run(state){const end=Date.now()+500; while(Date.now()<end){}; return {state,result:42}}}
            };
            """
        let caller = """
            globalThis.SkynetApp = {
              initialState(){return {events:[]}},
              reduce(state,command){
                if(command.type==="start") return {state,effects:[{id:"work",kind:"apps.call",input:{target:"test.slow",name:"run",input:{}}}]};
                if(command.type==="$effect") return {state:{events:[...state.events,command.payload]}};
                return {state};
              }
            };
            """
        install(
            try package(
                "test.slow", code: slow,
                actions: ["run": ["title": "Run", "input": schema, "output": ["type": "integer"]]]))
        let permissions = ["apps.call:test.slow:run"]
        install(try package("test.tasks", code: caller, permissions: permissions), permissions: permissions)
        let lease = host.attach(appId: "test.tasks") { _ in }
        let started = expectation(description: "task started")
        host.request(lease: lease, kind: "command", input: ["name": "start"]) { _ in started.fulfill() }
        wait(for: [started], timeout: 4)
        let cancelled = expectation(description: "task cancelled")
        host.request(lease: lease, kind: "task.cancel", input: ["taskId": "work"]) { result in
            if case .failure(let error) = result { XCTFail("\(error)") }
            cancelled.fulfill()
        }
        wait(for: [cancelled], timeout: 3)
        let drained = expectation(description: "target finished its prior action")
        let target = host.attach(appId: "test.slow") { _ in }
        host.request(lease: target, kind: "command", input: ["name": "barrier"]) { _ in drained.fulfill() }
        wait(for: [drained], timeout: 4)
        let checked = expectation(description: "late success cannot overwrite cancellation")
        host.request(lease: lease, kind: "snapshot", input: [:]) { result in
            let events = dictionary((try? result.get())?["state"])["events"] as? [[String: Any]] ?? []
            XCTAssertEqual(events.count, 1)
            XCTAssertEqual(events.first?["error"] as? String, "cancelled")
            checked.fulfill()
        }
        wait(for: [checked], timeout: 3)
        host.detach(lease)
        host.detach(target)
    }

    func testFailedRemovalRestoresPackageAndRuntime() throws {
        install(try package("test.remove", code: counter))
        let transaction = expectation(description: "failed metadata commit rolls back package removal")
        host.queue.async {
            do {
                try self.host.catalog.remove("test.remove") {
                    throw failure("storage", "injected disk failure")
                }
                XCTFail("Removal should fail when metadata cannot commit")
            } catch {
                XCTAssertEqual((error as? HostError)?.code, "storage")
            }
            do {
                let entry = try XCTUnwrap(self.host.catalog.entries["test.remove"])
                _ = try self.host.catalog.verify(entry.root)
            } catch {
                XCTFail("Rolled-back package failed verification: \(error)")
            }
            transaction.fulfill()
        }
        wait(for: [transaction], timeout: 3)
        let lease = host.attach(appId: "test.remove") { _ in }
        let usable = expectation(description: "rolled-back application remains usable")
        host.request(lease: lease, kind: "command", input: ["name": "increment"]) { result in
            XCTAssertEqual((try? result.get())?["result"] as? Int, 1)
            usable.fulfill()
        }
        wait(for: [usable], timeout: 4)
        host.detach(lease)
    }

    func testRestartReportsInterruptedTaskWithoutReplay() throws {
        let schema: [String: Any] = ["type": "object", "properties": [:], "additionalProperties": false]
        let slow = """
            globalThis.SkynetApp = {
              initialState(){return {count:0}}, reduce(state){return {state,result:state.count}},
              actions:{run(state){const end=Date.now()+500; while(Date.now()<end){}; return {state:{count:state.count+1},result:42}}}
            };
            """
        let caller = """
            globalThis.SkynetApp = {
              initialState(){return {events:[]}},
              reduce(state,command){
                if(command.type==="start") return {state,effects:[{id:"work",kind:"apps.call",input:{target:"test.interrupted-target",name:"run",input:{}}}]};
                if(command.type==="$interrupted") return {state:{events:[...state.events,"interrupted"]}};
                if(command.type==="$effect") return {state:{events:[...state.events,"completed"]}};
                return {state};
              }
            };
            """
        install(
            try package(
                "test.interrupted-target", code: slow,
                actions: ["run": ["title": "Run", "input": schema, "output": ["type": "integer"]]]))
        let permissions = ["apps.call:test.interrupted-target:run"]
        install(
            try package("test.interrupted", code: caller, permissions: permissions), permissions: permissions)
        let lease = host.attach(appId: "test.interrupted") { _ in }
        let started = expectation(description: "durable pending task")
        host.request(lease: lease, kind: "command", input: ["name": "start"]) { _ in started.fulfill() }
        wait(for: [started], timeout: 4)
        let interrupted = expectation(description: "new runtime receives interruption")
        var fulfilled = false
        let reloaded = host.attach(appId: "test.interrupted") { snapshot in
            if dictionary(snapshot["state"])["events"] as? [String] == ["interrupted"], !fulfilled {
                fulfilled = true
                interrupted.fulfill()
            }
        }
        host.workspace("restart", input: ["appId": "test.interrupted"])
        wait(for: [interrupted], timeout: 4)
        let target = host.attach(appId: "test.interrupted-target") { _ in }
        let finished = expectation(description: "only the original action executes")
        host.request(lease: target, kind: "command", input: ["name": "read"]) { result in
            XCTAssertEqual((try? result.get())?["result"] as? Int, 1)
            finished.fulfill()
        }
        wait(for: [finished], timeout: 4)
        let checked = expectation(description: "old completion cannot affect new generation")
        host.request(lease: lease, kind: "snapshot", input: [:]) { result in
            XCTAssertEqual(dictionary((try? result.get())?["state"])["events"] as? [String], ["interrupted"])
            checked.fulfill()
        }
        wait(for: [checked], timeout: 3)
        host.detach(lease)
        host.detach(reloaded)
        host.detach(target)
    }
}
