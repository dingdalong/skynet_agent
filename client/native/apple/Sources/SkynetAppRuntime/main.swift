import Darwin
import Foundation
import JavaScriptCore

let ready = Data("{\"ready\":true,\"pid\":\(getpid())}\n".utf8)
_ = ready.withUnsafeBytes { Darwin.write(STDOUT_FILENO, $0.baseAddress!, $0.count) }

// Only structured JSON enters this process. No filesystem, network or native
// objects are exported to JavaScriptCore; the supervisor imposes a deadline.
let context = JSContext()!
var exception: String?
context.exceptionHandler = { _, value in
    exception = value?.toString() ?? "JavaScript exception"
    if let stack = value?.forProperty("stack"), !stack.isUndefined {
        exception = "\(exception!)\n\(stack.toString() ?? "")"
    }
}
context.evaluateScript(
    """
    globalThis.console = Object.freeze({log(){}, warn(){}, error(){}});
    globalThis.__invoke = function(message) {
        const app = globalThis.SkynetApp;
        if (!app || typeof app.initialState !== "function") throw Error("Invalid runtime exports");
        if (message.type === "load") {
            const state = message.state ?? app.initialState();
            if (state && typeof state.then === "function") throw Error("Initial state must be synchronous");
            if (state === undefined) throw Error("Initial state must be JSON");
            return {state, result: null};
        }
        const state = message.state;
        if (message.type === "start") {
            const value = app.start ? app.start(state) : {state};
            if (!value || typeof value.then === "function"
                || !Object.prototype.hasOwnProperty.call(value, "state"))
                throw Error("Start must return a synchronous transition");
            return value;
        }
        const handler = message.type === "action" ? app.actions?.[message.name] : app.reduce;
        if (typeof handler !== "function") throw Error("Unknown command or action");
        const value = message.type === "action"
            ? handler(state, message.payload)
            : handler(state, {type: message.name, payload: message.payload});
        if (value && typeof value.then === "function") throw Error("Reducers must be synchronous");
        if (!value || !Object.prototype.hasOwnProperty.call(value, "state"))
            throw Error("Reducer must return state");
        return value;
    };
    globalThis.__invokeJSON = function(json) {
        return JSON.stringify(__invoke(JSON.parse(json)));
    };
    """)
let invoke = context.objectForKeyedSubscript("__invokeJSON")!
var buffer = Data()
let maximumFrame = CommandLine.arguments.dropFirst().first.flatMap(Int.init) ?? 1_048_576
var scanned = 0
while true {
    // FileHandle's length-based read can wait to fill the requested capacity on
    // a duplex socket. POSIX read returns the available protocol bytes.
    var bytes = [UInt8](repeating: 0, count: 16_384)
    let count = Darwin.read(STDOUT_FILENO, &bytes, bytes.count)
    if count < 0, errno == EINTR { continue }
    if count <= 0 { break }
    buffer.append(contentsOf: bytes.prefix(count))
    if buffer.count > maximumFrame { exit(65) }
    while let newline = buffer.dropFirst(scanned).firstIndex(of: 10) {
        scanned = 0
        let frame = buffer.prefix(upTo: newline)
        buffer.removeSubrange(...newline)
        // This command-line process has no AppKit run loop to drain temporary
        // Foundation/JSValue objects. Each mailbox turn must release its frame.
        try autoreleasepool {
            var response: [String: Any] = [:]
            do {
                guard let message = try JSONSerialization.jsonObject(with: frame) as? [String: Any],
                    let id = message["id"] as? String,
                    let generation = message["generation"] as? Int
                else { exit(65) }
                response = ["id": id, "generation": generation, "pid": getpid()]
                exception = nil
                if message["type"] as? String == "load" {
                    guard let code = message["code"] as? String else { throw RuntimeError.invalid }
                    context.evaluateScript(
                        code, withSourceURL: URL(string: "skynet-runtime://app/runtime.js"))
                    if let exception { throw RuntimeError.script(exception) }
                }
                let json = String(decoding: frame, as: UTF8.self)
                // Data stays an argument; do not compile a new script containing
                // the entire state for every token or timer update.
                let value = invoke.call(withArguments: [json])?.toString()
                if let exception { throw RuntimeError.script(exception) }
                guard let value,
                    let result = try JSONSerialization.jsonObject(
                        with: Data(value.utf8)
                    ) as? [String: Any]
                else { throw RuntimeError.invalid }
                response["value"] = result
            } catch {
                response["error"] = String(describing: error)
            }
            var output = try JSONSerialization.data(withJSONObject: response, options: [.sortedKeys])
            output.append(10)
            if output.count > maximumFrame { exit(65) }
            var offset = 0
            while offset < output.count {
                let count = output.withUnsafeBytes { pointer in
                    Darwin.write(
                        STDOUT_FILENO, pointer.baseAddress!.advanced(by: offset), output.count - offset)
                }
                if count < 0, errno == EINTR { continue }
                if count <= 0 { exit(74) }
                offset += count
            }
        }
    }
    scanned = buffer.count
}

enum RuntimeError: Error {
    case invalid
    case script(String)
}
