import Foundation

/// The host owns the mailbox and commits; platform runtimes only evaluate one
/// synchronous JSON transition. A queue/VM is not an operating-system process.
protocol BusinessRuntime: AnyObject {
    var pid: Int { get }
    var onFailure: ((Error) -> Void)? { get set }
    func request(_ message: [String: Any], completion: @escaping HostCore.Reply)
    func stop(_ error: Error)
}

extension BusinessRuntime {
    func stop() { stop(failure("stopped", "Runtime stopped")) }
}

enum RuntimeScript {
    static let bootstrap = """
        globalThis.console = Object.freeze({log(){}, warn(){}, error(){}});
        globalThis.__invokeJSON = function(json) {
            const message = JSON.parse(json);
            const app = globalThis.SkynetApp;
            if (!app || typeof app.initialState !== "function") throw Error("Invalid runtime exports");
            let value;
            if (message.type === "load") {
                const state = message.state ?? app.initialState();
                if (state === undefined || (state && typeof state.then === "function"))
                    throw Error("Initial state must be synchronous JSON");
                value = {state, result: null};
            } else if (message.type === "start") {
                value = app.start ? app.start(message.state) : {state: message.state};
            } else {
                const handler = message.type === "action" ? app.actions?.[message.name] : app.reduce;
                if (typeof handler !== "function") throw Error("Unknown command or action");
                value = message.type === "action"
                    ? handler(message.state, message.payload)
                    : handler(message.state, {type: message.name, payload: message.payload});
            }
            if (!value || typeof value.then === "function"
                || !Object.prototype.hasOwnProperty.call(value, "state"))
                throw Error("Reducer must return a synchronous transition");
            return JSON.stringify(value);
        };
        """
}
