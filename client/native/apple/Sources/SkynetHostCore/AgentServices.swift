import AgentRuntime
import AppKit
import CryptoKit
import Darwin
import Foundation
import OSLog

/// A native owner, independent of presentation and the reloadable business VM.
/// Files, handles and all callbacks are confined to this separate serial queue.
final class AgentServices {
    struct Directory: Codable {
        let id: String
        let path: String
        let bookmark: Data
    }
    private struct Access: Codable {
        var deviceId = UUID().uuidString
        var origins: [String] = []
        var directories: [Directory] = []
        var remoteEnabled = false
    }
    private final class OutputRequest {
        let deadline: Date
        let tokens: Int
        let reply: HostCore.Reply
        init(wait: Int, tokens: Int, reply: @escaping HostCore.Reply) {
            deadline = Date().addingTimeInterval(Double(wait) / 1000)
            self.tokens = tokens
            self.reply = reply
        }
    }
    private final class Job {
        let id = UUID().uuidString
        let session: String
        let run: String
        let workspace: String
        let mode: String
        let cwd: String
        let argv: [String]
        let tty: Bool
        var remote = false
        var handle: OpaquePointer?
        var output = Data()
        var pending = Data()
        var done = false
        var cancelled = false
        var code: Int32?
        var error = ""
        var truncated = false
        var timer: DispatchSourceTimer?
        var deadline: Date
        var collectors: [OutputRequest] = []
        var patchInput: String?
        init(
            session: String, run: String, workspace: String, cwd: String, argv: [String], tty: Bool,
            timeout: Int
        ) {
            self.session = session
            self.run = run
            self.workspace = workspace
            self.cwd = cwd
            self.argv = argv
            self.tty = tty
            self.mode = "use_default"
            self.deadline = Date().addingTimeInterval(Double(timeout) / 1000)
        }
    }
    private let queue = DispatchQueue(label: "app.skynet.agent.execution", qos: .userInitiated)
    private let file: URL
    private let launcher: URL
    private let worker: URL
    private var access: Access
    private var authorization = UUID().uuidString
    private var jobs: [String: Job] = [:]
    private var pending: [String: (Data, [HostCore.Reply])] = [:]
    private var completed: [String: (Data, [String: Any])] = [:]
    private var executed: Set<String> = []
    private var scopes: [URL] = []
    private let logger = Logger(subsystem: "app.skynet.agent", category: "LocalExecutor")

    init(root: URL, launcher: URL) throws {
        self.file = root.appendingPathComponent("agent-access.json")
        self.launcher = launcher
        self.worker = launcher.deletingLastPathComponent().appendingPathComponent("agent_worker")
        self.access =
            FileManager.default.fileExists(atPath: file.path)
            ? try JSONDecoder().decode(Access.self, from: Data(contentsOf: file)) : Access()
        try JSONEncoder().encode(access).write(to: file, options: .atomic)
        for entry in access.directories {
            var stale = false
            if let url = try? URL(
                resolvingBookmarkData: entry.bookmark, options: .withSecurityScope,
                relativeTo: nil, bookmarkDataIsStale: &stale), url.startAccessingSecurityScopedResource()
            {
                scopes.append(url)
            }
        }
        logger.info("Local executor initialized; directories=\(self.access.directories.count)")
    }

    static func origin(_ raw: String) throws -> String {
        guard raw.utf8.count <= 4096, let parts = URLComponents(string: raw),
            let scheme = parts.scheme, let host = parts.host, !host.isEmpty,
            parts.user == nil, parts.password == nil, parts.fragment == nil,
            scheme == "wss" || scheme == "ws" && ["127.0.0.1", "localhost", "::1"].contains(host),
            parts.port == nil || (1...65535).contains(parts.port!)
        else { throw failure("network", "请输入完整 wss 地址；仅本机回环允许 ws") }
        var origin = URLComponents()
        origin.scheme = scheme
        origin.host = host.lowercased()
        origin.port = parts.port
        guard let value = origin.string else { throw failure("network", "服务器地址无效") }
        return value
    }

    private func save(_ candidate: Access) throws {
        try JSONEncoder().encode(candidate).write(to: file, options: .atomic)
        access = candidate
    }
    private func context() -> [String: Any] {
        [
            "deviceId": access.deviceId, "name": Host.current().localizedName ?? "Mac",
            "authorizationId": authorization, "remoteEnabled": access.remoteEnabled,
            "origins": access.origins,
            "workspaces": access.directories.map {
                [
                    "device_id": access.deviceId, "workspace_id": $0.id,
                    "directory": $0.path, "platform": "macos",
                ]
            },
        ]
    }
    func origins(_ completion: @escaping ([String]) -> Void) {
        queue.async { completion(self.access.origins) }
    }
    func context(reset: Bool, completion: @escaping HostCore.Reply) {
        queue.async {
            if reset { self.reset() }
            completion(.success(self.context()))
        }
    }
    func setRemote(_ enabled: Bool, completion: @escaping HostCore.Reply) {
        queue.async {
            do {
                var candidate = self.access
                candidate.remoteEnabled = enabled
                try self.save(candidate)
                if !enabled {
                    for job in self.jobs.values where job.remote { self.cancel(job) }
                }
                completion(.success(self.context()))
            } catch { completion(.failure(error)) }
        }
    }
    func authorize(_ raw: String, completion: @escaping HostCore.Reply) {
        queue.async {
            do {
                let origin = try Self.origin(raw)
                if self.access.origins.contains(origin) {
                    completion(.success(self.context()))
                    return
                }
                DispatchQueue.main.async {
                    let alert = NSAlert()
                    alert.messageText = "允许 Agent 连接此服务器？"
                    alert.informativeText = "\(origin)\n\n对话和所选项目的任务信息会发送到该服务器。仅授权你信任的服务器。"
                    alert.addButton(withTitle: "允许连接")
                    alert.addButton(withTitle: "取消")
                    let allowed = alert.runModal() == .alertFirstButtonReturn
                    self.queue.async {
                        do {
                            guard allowed else { throw failure("permission", "已取消服务器授权") }
                            guard self.access.origins.count < 32 else {
                                throw failure("permission", "服务器授权已达上限")
                            }
                            var candidate = self.access
                            candidate.origins.append(origin)
                            try self.save(candidate)
                            completion(.success(self.context()))
                        } catch { completion(.failure(error)) }
                    }
                }
            } catch { completion(.failure(error)) }
        }
    }
    func chooseDirectory(completion: @escaping HostCore.Reply) {
        DispatchQueue.main.async {
            let panel = NSOpenPanel()
            panel.title = "选择 Agent 本地工作目录"
            panel.prompt = "授权此目录"
            panel.message = "Agent 可在此目录内执行命令和修改文件。项目规则与工具结果会发送到已连接的服务器。"
            panel.canChooseDirectories = true
            panel.canChooseFiles = false
            panel.allowsMultipleSelection = false
            panel.begin { response in
                guard response == .OK, let url = panel.url else {
                    completion(.success(["cancelled": true]))
                    return
                }
                self.queue.async {
                    do {
                        let target = try self.addDirectory(url)
                        completion(.success(["context": self.context(), "target": target]))
                    } catch { completion(.failure(error)) }
                }
            }
        }
    }
    /// Only the native picker (and native integration fixtures) can add a root.
    func addDirectory(_ url: URL) throws -> [String: String] {
        let path = try resolved(url.path, base: "/")
        var directory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: path, isDirectory: &directory), directory.boolValue,
            path != "/", path != NSHomeDirectory()
        else { throw failure("directory", "请选择具体项目目录") }
        let entry: Directory
        if let existing = access.directories.first(where: { $0.path == path }) {
            entry = existing
        } else {
            guard access.directories.count < 32 else { throw failure("directory", "工作目录已达上限") }
            let bookmark = try url.bookmarkData(
                options: .withSecurityScope, includingResourceValuesForKeys: nil,
                relativeTo: nil)
            entry = Directory(id: UUID().uuidString, path: path, bookmark: bookmark)
            var candidate = access
            candidate.directories.append(entry)
            try save(candidate)
            if url.startAccessingSecurityScopedResource() { scopes.append(url) }
        }
        return [
            "device_id": access.deviceId, "workspace_id": entry.id, "directory": entry.path,
            "platform": "macos",
        ]
    }
    private func resolved(_ path: String, base: String) throws -> String {
        guard !path.utf8.contains(0), path.utf8.count <= 4096,
            let result = ar_resolve(path, base)
        else { throw failure("path", "路径无效") }
        defer { ar_free(result) }
        return String(cString: result)
    }
    private func object(_ pointer: UnsafeMutablePointer<CChar>?) throws -> [String: Any] {
        guard let pointer else { throw failure("execution", "本机工具核心操作失败") }
        defer { ar_free(pointer) }
        return try jsonObject(Data(String(cString: pointer).utf8))
    }

    func execute(_ input: [String: Any], completion: @escaping HostCore.Reply) {
        queue.async {
            do {
                guard input["authorization_id"] as? String == self.authorization,
                    input["remote"] as? Bool != true || self.access.remoteEnabled,
                    let workspace = input["workspace_id"] as? String,
                    let root = self.access.directories.first(where: { $0.id == workspace })?.path,
                    let session = input["session_id"] as? String, !session.isEmpty, session.count <= 128,
                    let run = input["run_id"] as? String, !run.isEmpty, run.count <= 128,
                    let request = input["request_id"] as? String, !request.isEmpty, request.count <= 128,
                    let operation = input["operation"] as? String,
                    let raw = input["arguments"] as? String, raw.utf8.count <= 131_072
                else { throw failure("permission", "本地执行授权无效、已过期或工作目录未授权") }
                guard try self.resolved(root, base: "/") == root else {
                    throw failure("path", "授权目录已移动或被替换，请重新选择")
                }
                let fingerprint = Data(SHA256.hash(data: try jsonData(input)))
                if let previous = self.completed[request] {
                    guard previous.0 == fingerprint else { throw failure("execution", "执行编号被重复用于不同操作") }
                    completion(.success(previous.1))
                    return
                }
                if let previous = self.pending[request] {
                    guard previous.0 == fingerprint else { throw failure("execution", "执行编号冲突") }
                    self.pending[request]!.1.append(completion)
                    return
                }
                guard self.pending.count < 32 else { throw failure("execution", "本地执行队列已满") }
                let args = try jsonObject(Data(raw.utf8))
                if operation == "execute" {
                    guard !self.executed.contains(request), self.executed.count < 4096 else {
                        throw failure("execution", "此执行编号已使用或连接执行预算已耗尽；不会重复执行")
                    }
                    self.executed.insert(request)
                }
                self.pending[request] = (fingerprint, [completion])
                let epoch = self.authorization
                let finish: HostCore.Reply = { result in
                    guard epoch == self.authorization, let pending = self.pending.removeValue(forKey: request)
                    else { return }
                    let value: [String: Any]
                    switch result {
                    case .success(let response): value = response
                    case .failure(let error):
                        self.logger.error(
                            "operation=\(operation, privacy: .public) error=\(String(describing: error), privacy: .public)"
                        )
                        value = ["ok": false, "error": String(describing: error)]
                    }
                    if self.completed.count >= 256 { self.completed.removeAll() }
                    self.completed[request] = (fingerprint, value)
                    for reply in pending.1 { reply(.success(value)) }
                }
                do {
                    try self.perform(
                        operation, args: args, root: root, workspace: workspace,
                        session: session, run: run, remote: input["remote"] as? Bool == true,
                        completion: finish)
                } catch { finish(.failure(error)) }
            } catch { completion(.failure(error)) }
        }
    }
    private func integer(_ args: [String: Any], _ key: String, _ fallback: Int, _ range: ClosedRange<Int>)
        throws -> Int
    {
        guard let raw = args[key] else { return fallback }
        guard let number = raw as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(),
            number.doubleValue.isFinite, number.doubleValue.rounded() == number.doubleValue,
            range.contains(number.intValue)
        else { throw failure("arguments", "参数 \(key) 无效") }
        return number.intValue
    }
    private func prepare(_ input: [String: Any], root: String, workspace: String, session: String) throws
        -> [String: Any]
    {
        guard let name = input["name"] as? String,
            ["exec_command", "write_stdin", "apply_patch"].contains(name),
            let args = input["args"] as? [String: Any]
        else { throw failure("arguments", "工具参数无效") }
        let common: Set<String> = [
            "sandbox_permissions", "justification", "max_output_tokens", "yield_time_ms",
        ]
        let fields: Set<String> =
            name == "exec_command"
            ? ["cmd", "workdir", "tty", "timeout_ms"]
            : name == "write_stdin" ? ["session_id", "chars"] : ["patch"]
        guard Set(args.keys).isSubset(of: common.union(fields)),
            args.values.allSatisfy({ !($0 is String) || !($0 as! String).utf8.contains(0) }),
            args["sandbox_permissions"] == nil || args["sandbox_permissions"] as? String == "use_default"
        else { throw failure("permission", "本地工具仅支持所选项目目录内的沙盒执行；参数无效或请求了沙盒外权限") }
        _ = try integer(args, "yield_time_ms", 10_000, 1...30_000)
        _ = try integer(args, "max_output_tokens", 4_000, 1...16_384)
        var action: [String: Any] = [
            "name": name, "args": args, "workspace": root, "mode": "use_default", "cwd": root,
        ]
        if name == "exec_command" {
            guard let cmd = args["cmd"] as? String,
                !cmd.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                cmd.utf8.count <= 65_536, args["workdir"] == nil || args["workdir"] is String,
                args["tty"] == nil
                    || (args["tty"] as? NSNumber).map({ CFGetTypeID($0) == CFBooleanGetTypeID() }) == true
            else { throw failure("arguments", "命令参数无效") }
            let cwd = try resolved(args["workdir"] as? String ?? ".", base: root)
            var isDirectory: ObjCBool = false
            guard ar_inside(cwd, root) != 0,
                FileManager.default.fileExists(atPath: cwd, isDirectory: &isDirectory),
                isDirectory.boolValue
            else { throw failure("path", "命令工作目录超出授权项目或不存在") }
            action["cwd"] = cwd
            let limit = try integer(dictionary(input["limits"]), "timeout_ms", 300_000, 1...300_000)
            action["timeout"] = try integer(args, "timeout_ms", limit, 1...limit)
        } else if name == "apply_patch" {
            guard let patch = args["patch"] as? String, patch.utf8.count <= 65_536 else {
                throw failure("arguments", "补丁无效或过大")
            }
            let prepared = try object(ar_prepare_patch(patch, root, 0))
            guard prepared["ok"] as? Bool != false else {
                throw failure("patch", prepared["error"] as? String ?? "补丁无效")
            }
            action["paths"] = prepared["changed_files"] ?? []
        } else {
            let job = try job(args, workspace: workspace, session: session)
            guard args["chars"] == nil || args["chars"] is String,
                (args["chars"] as? String ?? "").utf8.count <= 65_536
            else { throw failure("arguments", "终端输入无效") }
            action["cwd"] = job.cwd
            action["launch_argv"] = job.argv
        }
        return action
    }
    private func job(_ args: [String: Any], workspace: String, session: String) throws -> Job {
        guard let id = args["session_id"] as? String, let job = jobs[id],
            job.workspace == workspace, job.session == session
        else { throw failure("process", "进程不属于此会话和目录") }
        return job
    }
    private func perform(
        _ operation: String, args: [String: Any], root: String, workspace: String,
        session: String, run: String, remote: Bool, completion: @escaping HostCore.Reply
    ) throws {
        switch operation {
        case "project":
            let limit = try integer(args, "max_bytes", 32768, 0...32768)
            var project: [String: Any] = ["workspace": root]
            if limit > 0 {
                for name in ["AGENTS.override.md", "AGENTS.md"] {
                    let path = root + "/" + name
                    if !FileManager.default.fileExists(atPath: path) { continue }
                    let real = try resolved(path, base: root)
                    guard ar_inside(real, root) != 0 else { throw failure("path", "项目规则超出工作目录") }
                    var count = 0
                    guard let data = ar_read_file(real, limit, &count) else {
                        throw failure("project", "项目规则读取失败或超出上限")
                    }
                    defer { ar_free(data) }
                    guard count <= limit,
                        let text = String(data: Data(bytes: data, count: count), encoding: .utf8),
                        !text.utf8.contains(0)
                    else { throw failure("project", "项目规则必须为 UTF-8 文本") }
                    project["path"] = path
                    if !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        project["text"] = text
                    }
                    break
                }
            }
            completion(.success(["ok": true, "project": project]))
        case "prepare":
            completion(
                .success([
                    "ok": true,
                    "action": try prepare(args, root: root, workspace: workspace, session: session),
                ]))
        case "execute":
            let action = try prepare(args, root: root, workspace: workspace, session: session)
            let input = dictionary(args["args"])
            let name = args["name"] as! String
            let value: Job
            if name == "write_stdin" {
                value = try job(input, workspace: workspace, session: session)
                let chars = input["chars"] as? String ?? ""
                if !chars.isEmpty {
                    guard value.tty, !value.done, let handle = value.handle else {
                        throw failure("process", "终端输入已关闭")
                    }
                    let bytes = Data(chars.utf8)
                    let written = bytes.withUnsafeBytes { ar_write(handle, $0.baseAddress, $0.count) }
                    guard written == bytes.count else { throw failure("process", "终端输入未完整写入，请检查进程状态后继续") }
                }
            } else {
                guard jobs.values.filter({ !$0.done }).count < 8 else { throw failure("process", "本地进程已达上限") }
                if jobs.count >= 64 {
                    for (id, job) in jobs where job.done { jobs[id] = nil }
                }
                let argv: [String]
                var patchInput: String?
                if name == "apply_patch" {
                    let text = input["patch"] as! String
                    guard let file = text.withCString({ ar_temporary_file($0, text.utf8.count) }) else {
                        throw failure("patch", "无法暂存补丁")
                    }
                    patchInput = String(cString: file)
                    ar_free(file)
                    argv = [worker.path, "patch", root, patchInput!]
                } else {
                    argv = ["/bin/bash", "--noprofile", "--norc", "-c", input["cmd"] as! String]
                }
                value = Job(
                    session: session, run: run, workspace: workspace, cwd: action["cwd"] as! String,
                    argv: argv, tty: input["tty"] as? Bool ?? false,
                    timeout: action["timeout"] as? Int ?? 300_000)
                value.patchInput = patchInput
                value.remote = remote
                do { try spawn(value, root: root) } catch {
                    if let patchInput { try? FileManager.default.removeItem(atPath: patchInput) }
                    throw error
                }
                jobs[value.id] = value
            }
            let wait =
                name == "apply_patch" ? 300_000 : try integer(input, "yield_time_ms", 10_000, 1...30_000)
            let tokens = try integer(input, "max_output_tokens", 4000, 1...16384)
            value.collectors.append(OutputRequest(wait: wait, tokens: tokens, reply: completion))
            collect(value)
        case "status":
            completion(.success(status(try job(args, workspace: workspace, session: session))))
        case "cancel":
            if args["session_id"] != nil {
                let target = try job(args, workspace: workspace, session: session)
                cancel(target)
            } else {
                for job in jobs.values
                where job.session == session && job.workspace == workspace && job.run == run { cancel(job) }
            }
            completion(.success(["ok": true]))
        default: throw failure("execution", "不支持的本地执行操作")
        }
    }
    private func spawn(_ job: Job, root: String) throws {
        for name in [".agent-home", ".agent-tmp"] {
            let path = try resolved(root + "/" + name, base: root)
            guard ar_inside(path, root) != 0 else { throw failure("path", "工具临时目录越界") }
            try FileManager.default.createDirectory(atPath: path, withIntermediateDirectories: true)
        }
        let args = job.argv.map { strdup($0) } + [nil]
        let dependencies = ([worker.path] + (job.patchInput.map { [$0] } ?? [])).map { strdup($0) } + [nil]
        defer { for item in args + dependencies { free(item) } }
        let sandboxed = args.withUnsafeBufferPointer { argv in
            dependencies.withUnsafeBufferPointer { paths in
                argv.baseAddress!.withMemoryRebound(to: UnsafePointer<CChar>?.self, capacity: args.count) {
                    argv in
                    paths.baseAddress!.withMemoryRebound(
                        to: UnsafePointer<CChar>?.self, capacity: dependencies.count
                    ) {
                        ar_sandbox(argv, root, $0)
                    }
                }
            }
        }
        guard let sandboxed else { throw failure("sandbox", "本机沙盒不可用") }
        defer { ar_argv_free(sandboxed) }
        let variables: [String] = [
            "PATH=/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin",
            "HOME=\(root)/.agent-home", "TMPDIR=\(root)/.agent-tmp", "LANG=en_US.UTF-8",
            "TERM=xterm-256color",
        ]
        let environment = variables.map { strdup($0) } + [nil]
        defer { for item in environment { free(item) } }
        job.handle = environment.withUnsafeBufferPointer { env in
            sandboxed.withMemoryRebound(to: UnsafePointer<CChar>?.self, capacity: args.count + 8) { argv in
                env.baseAddress!.withMemoryRebound(
                    to: UnsafePointer<CChar>?.self, capacity: environment.count
                ) {
                    ar_spawn(launcher.path, job.cwd, argv, $0, job.tty ? 1 : 0)
                }
            }
        }
        guard job.handle != nil else { throw failure("spawn", "无法启动本地命令 errno=\(errno)") }
        let timer = DispatchSource.makeTimerSource(queue: queue)
        timer.schedule(deadline: .now(), repeating: .milliseconds(10))
        timer.setEventHandler { [weak self, weak job] in
            guard let self, let job else { return }
            self.poll(job)
        }
        job.timer = timer
        timer.resume()
    }
    private func poll(_ job: Job) {
        guard let handle = job.handle else { return }
        var code: Int32 = 0
        if ar_poll(handle, &code) != 0 { job.code = code }
        var buffer = [UInt8](repeating: 0, count: 8192)
        var drained = false
        for _ in 0..<8 {
            let count = ar_read(handle, &buffer, buffer.count)
            if count <= 0 {
                drained = true
                break
            }
            job.output.append(contentsOf: buffer.prefix(count))
            job.pending.append(contentsOf: buffer.prefix(count))
            if job.output.count > 32768 {
                job.output = job.output.suffix(32768)
                job.truncated = true
            }
            if job.pending.count > 65536 {
                job.pending = job.pending.suffix(65536)
                job.truncated = true
            }
        }
        if Date() > job.deadline && !job.cancelled {
            job.error = "命令执行超时"
            cancel(job)
        }
        if job.code != nil, drained {
            job.done = true
            job.timer?.cancel()
            job.timer = nil
            job.handle = nil
            ar_terminate(handle)
            DispatchQueue.global(qos: .utility).async { ar_close(handle) }
        }
        collect(job)
        if job.done, let file = job.patchInput {
            try? FileManager.default.removeItem(atPath: file)
            job.patchInput = nil
        }
    }
    private func text(_ bytes: Data) -> String {
        String(decoding: bytes, as: UTF8.self).filter {
            $0 == "\n" || $0 == "\t" || $0 >= " " && $0 != "\u{7f}"
        }
    }
    private func status(_ job: Job) -> [String: Any] {
        var result: [String: Any] = [
            "ok": job.error.isEmpty, "done": job.done, "output": text(job.output),
            "truncated": job.truncated, "cancelled": job.cancelled && job.error.isEmpty,
        ]
        if let code = job.code { result["exit_code"] = Int(code) }
        if !job.error.isEmpty { result["error"] = job.error }
        return result
    }
    private func collect(_ job: Job) {
        // Keep one callback object per request. Repeatedly copying a callback
        // tuple on each poll builds nested reabstraction wrappers in Release.
        var waiting: [OutputRequest] = []
        for collector in job.collectors {
            guard job.done || Date() >= collector.deadline else {
                waiting.append(collector)
                continue
            }
            if job.patchInput != nil, job.done {
                do { collector.reply(.success(try jsonObject(job.pending))) } catch {
                    collector.reply(.failure(failure("patch", job.error.isEmpty ? "补丁进程未返回有效结果" : job.error)))
                }
            } else {
                var result = status(job)
                let cap = min(65536, collector.tokens * 4)
                result["output"] = text(job.pending.suffix(cap))
                result["truncated"] = job.truncated || job.pending.count > cap
                if !job.done { result["session_id"] = job.id }
                collector.reply(.success(result))
            }
            job.pending.removeAll(keepingCapacity: true)
        }
        job.collectors = waiting
    }
    private func cancel(_ job: Job) {
        guard !job.done else { return }
        job.cancelled = true
        if let handle = job.handle { ar_terminate(handle) }
    }
    private func reset() {
        authorization = UUID().uuidString
        completed.removeAll()
        executed.removeAll()
        let requests = Array(pending.values)
        pending.removeAll()
        for request in requests {
            for reply in request.1 { reply(.failure(failure("execution", "本地执行授权已结束，不会重放"))) }
        }
        for job in jobs.values {
            cancel(job)
            job.timer?.cancel()
            job.timer = nil
            let patch = job.patchInput
            if let handle = job.handle {
                job.handle = nil
                DispatchQueue.global(qos: .utility).async {
                    ar_close(handle)
                    if let patch { try? FileManager.default.removeItem(atPath: patch) }
                }
            }
            let collectors = job.collectors
            job.collectors.removeAll()
            for item in collectors { item.reply(.failure(failure("execution", "本地执行已中断"))) }
        }
        jobs.removeAll()
    }
    func close() { queue.async { self.reset() } }
}
