import Foundation
import JavaScriptCore

/// Only bundled, trusted apps run here. Public iOS APIs do not provide a way to
/// terminate an arbitrary JSC evaluation or give each app a memory/process quota.
/// A separate VM and queue keep normal computation off the host/UI queues.
final class EmbeddedRuntime: BusinessRuntime {
    var pid: Int { 0 }
    var onFailure: ((Error) -> Void)?
    private let owner: DispatchQueue
    private let execution: DispatchQueue
    private let deadline: TimeInterval
    private var context: JSContext?
    private var scriptError: String?
    private var stopped = false
    private var active: (UUID, HostCore.Reply)?

    init(queue: DispatchQueue, generation: Int, deadline: TimeInterval = 2) {
        owner = queue
        self.deadline = deadline
        execution = DispatchQueue(label: "app.skynet.builtin.\(generation).\(UUID())", qos: .userInitiated)
    }

    func request(_ message: [String: Any], completion: @escaping HostCore.Reply) {
        guard !stopped, active == nil else {
            completion(.failure(failure("unavailable", "Runtime unavailable or already evaluating")))
            return
        }
        let id = UUID()
        do {
            let data = try jsonData(message)
            guard data.count < 1_048_576 else { throw failure("size", "Runtime input too large") }
            let json = String(decoding: data, as: UTF8.self)
            active = (id, completion)
            owner.asyncAfter(deadline: .now() + deadline) { [weak self] in
                guard let self, !self.stopped, self.active?.0 == id else { return }
                // This expires authority and callbacks, not the executing thread.
                self.stop(failure("timeout", "内置应用计算超时；请重新启动客户端后再试"))
            }
            execution.async {
                let result: Result<[String: Any], Error> = autoreleasepool {
                    Result {
                        if self.context == nil {
                            guard let context = JSContext(virtualMachine: JSVirtualMachine()) else {
                                throw failure("runtime", "Cannot create built-in JavaScript VM")
                            }
                            self.context = context
                            context.exceptionHandler = { [weak self] _, value in
                                self?.scriptError = String(
                                    (value?.toString() ?? "JavaScript exception").prefix(2048))
                            }
                            context.evaluateScript(RuntimeScript.bootstrap)
                        }
                        guard let context = self.context else { throw failure("runtime", "Missing VM") }
                        self.scriptError = nil
                        if message["type"] as? String == "load" {
                            guard let code = message["code"] as? String else {
                                throw failure("runtime", "Missing bundled runtime")
                            }
                            context.evaluateScript(
                                code, withSourceURL: URL(string: "skynet-runtime://builtin/runtime.js"))
                            if let error = self.scriptError { throw failure("app", error) }
                        }
                        let value = context.objectForKeyedSubscript("__invokeJSON")?
                            .call(withArguments: [json])?.toString()
                        if let error = self.scriptError { throw failure("app", error) }
                        guard let value, value.utf8.count < 1_048_576 else {
                            throw failure("size", "Runtime result missing or too large")
                        }
                        return try jsonObject(Data(value.utf8))
                    }
                }
                self.owner.async {
                    guard !self.stopped, self.active?.0 == id else { return }
                    self.active = nil
                    completion(result)
                }
            }
        } catch { completion(.failure(error)) }
    }

    func stop(_ error: Error = failure("stopped", "Runtime stopped")) {
        guard !stopped else { return }
        stopped = true
        let current = active
        active = nil
        // Release all VM references on their execution queue, after the current turn.
        execution.async {
            self.context?.exceptionHandler = nil
            self.context = nil
        }
        current?.1(.failure(error))
        onFailure?(error)
        onFailure = nil
    }
}
