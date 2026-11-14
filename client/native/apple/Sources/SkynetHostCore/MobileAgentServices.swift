#if os(iOS)
    import Foundation
    import OSLog

    /// The phone is a remote client. It never registers as a desktop executor or
    /// gains filesystem/shell access through the shared business protocol.
    final class AgentServices {
        typealias Confirmation = (String, @escaping (Bool) -> Void) -> Void
        private struct Access: Codable {
            var deviceId = UUID().uuidString
            var origins: [String] = []
        }
        private let queue = DispatchQueue(label: "app.skynet.agent.mobile")
        private let file: URL
        private var access: Access
        private var confirmation: Confirmation?
        private var authorizing = false
        private let logger = Logger(subsystem: "app.skynet.agent", category: "MobileAgent")

        init(root: URL) throws {
            file = root.appendingPathComponent("mobile-access.json")
            access =
                FileManager.default.fileExists(atPath: file.path)
                ? try JSONDecoder().decode(Access.self, from: Data(contentsOf: file)) : Access()
            try JSONEncoder().encode(access).write(to: file, options: .atomic)
            logger.info("Mobile Agent initialized; local execution disabled")
        }
        func setConfirmation(_ confirmation: @escaping Confirmation) {
            queue.async { self.confirmation = confirmation }
        }
        private func value() -> [String: Any] {
            [
                "deviceId": access.deviceId, "name": "iOS", "authorizationId": "",
                "remoteEnabled": false, "canExecute": false, "origins": access.origins,
                "workspaces": [],
            ]
        }
        func origins(_ completion: @escaping ([String]) -> Void) {
            queue.async { completion(self.access.origins) }
        }
        func context(reset: Bool, completion: @escaping HostCore.Reply) {
            queue.async { completion(.success(self.value())) }
        }
        func authorize(_ raw: String, completion: @escaping HostCore.Reply) {
            queue.async {
                do {
                    let origin = try ServerOrigin.parse(raw)
                    if self.access.origins.contains(origin) {
                        completion(.success(self.value()))
                        return
                    }
                    guard !self.authorizing, self.access.origins.count < 32,
                        let confirmation = self.confirmation
                    else {
                        throw failure("permission", "无法显示服务器授权，请回到前台后重试")
                    }
                    self.authorizing = true
                    DispatchQueue.main.async {
                        confirmation(origin) { allowed in
                            self.queue.async {
                                self.authorizing = false
                                do {
                                    guard allowed else { throw failure("permission", "已取消服务器授权") }
                                    var candidate = self.access
                                    if !candidate.origins.contains(origin) {
                                        candidate.origins.append(origin)
                                    }
                                    try JSONEncoder().encode(candidate).write(to: self.file, options: .atomic)
                                    self.access = candidate
                                    completion(.success(self.value()))
                                } catch {
                                    self.logger.error(
                                        "authorize error=\(String(describing: error), privacy: .public)")
                                    completion(.failure(error))
                                }
                            }
                        }
                    }
                } catch { completion(.failure(error)) }
            }
        }
        func chooseDirectory(completion: @escaping HostCore.Reply) {
            completion(.failure(failure("capability", "请在桌面端授权项目，再从手机控制远程任务")))
        }
        func setRemote(_ enabled: Bool, completion: @escaping HostCore.Reply) {
            completion(.failure(failure("capability", "iOS 不提供本地开发执行器")))
        }
        func execute(_ input: [String: Any], completion: @escaping HostCore.Reply) {
            completion(.failure(failure("capability", "iOS 不执行本机工具")))
        }
        func close() {}
    }
#endif
