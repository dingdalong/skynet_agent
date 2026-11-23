#if os(macOS)
    import AgentRuntime
    import Darwin
    import Foundation

    /// All native handles, timers and callbacks belong to the supplied serial queue.
    /// No JS evaluation happens on the host queue.
    final class RuntimeProcess: BusinessRuntime {
        typealias Reply = (Result<[String: Any], Error>) -> Void
        let generation: Int
        private let queue: DispatchQueue
        private var process: OpaquePointer?
        private var output: Int32 = -1
        private var errors: Int32 = -1
        private var timer: DispatchSourceTimer?
        private let io = DispatchGroup()
        private var reader: DispatchSourceRead?
        private var writer: DispatchSourceWrite?
        private let maximumFrame: Int
        private var scanned = 0
        private var incoming = Data()
        private var outgoing = Data()
        private var diagnostics = Data()
        private var requests: [(String, [String: Any], Reply)] = []
        private var active: (id: String, deadline: Date, reply: Reply)?
        private(set) var pid: Int = 0
        var onFailure: ((Error) -> Void)?
        private var stopped = false

        init(
            queue: DispatchQueue, launcher: URL, executable: URL, profile: URL, generation: Int,
            maximumFrame: Int = 1_048_576
        ) throws {
            self.maximumFrame = maximumFrame
            self.queue = queue
            self.generation = generation
            let arguments = [
                "/usr/bin/sandbox-exec", "-f", profile.path, executable.path, String(maximumFrame),
            ]
            let strings = arguments.map { strdup($0) } + [nil]
            let environment = [strdup("PATH=/usr/bin:/bin"), strdup("LANG=en_US.UTF-8"), nil]
            defer {
                for item in strings { free(item) }
                for item in environment { free(item) }
            }
            process = strings.withUnsafeBufferPointer { args in
                environment.withUnsafeBufferPointer { env in
                    args.baseAddress!.withMemoryRebound(
                        to: UnsafePointer<CChar>?.self, capacity: strings.count
                    ) {
                        argv in
                        env.baseAddress!.withMemoryRebound(
                            to: UnsafePointer<CChar>?.self, capacity: environment.count
                        ) {
                            ar_spawn(launcher.path, executable.deletingLastPathComponent().path, argv, $0, 0)
                        }
                    }
                }
            }
            guard let process else { throw failure("spawn", "Cannot start app runtime: \(errno)") }
            ar_take_fds(process, &output, &errors)
            var enabled: Int32 = 1
            setsockopt(
                output, SOL_SOCKET, SO_NOSIGPIPE, &enabled, socklen_t(MemoryLayout.size(ofValue: enabled)))
            let reader = DispatchSource.makeReadSource(fileDescriptor: output, queue: queue)
            io.enter()
            reader.setCancelHandler { [io] in io.leave() }
            reader.setEventHandler { [weak self] in self?.readOutput() }
            self.reader = reader
            reader.resume()
            let timer = DispatchSource.makeTimerSource(queue: queue)
            timer.schedule(deadline: .now(), repeating: .milliseconds(10))
            timer.setEventHandler { [weak self] in self?.poll() }
            self.timer = timer
            timer.resume()
        }

        func request(_ message: [String: Any], completion: @escaping Reply) {
            guard !stopped, requests.count < 64 else {
                completion(.failure(failure("unavailable", "Runtime unavailable or mailbox full")))
                return
            }
            requests.append((UUID().uuidString, message, completion))
            next()
        }

        private func next() {
            guard active == nil, !requests.isEmpty, !stopped else { return }
            let (id, message, completion) = requests.removeFirst()
            var frame = message
            frame["id"] = id
            frame["generation"] = generation
            do {
                outgoing = try jsonData(frame)
                guard outgoing.count < maximumFrame else { throw failure("size", "Runtime input too large") }
                outgoing.append(10)
                active = (id, Date().addingTimeInterval(maximumFrame > 1_048_576 ? 15 : 2), completion)
                flushInput()
            } catch {
                completion(.failure(error))
                next()
            }
        }

        private func flushInput() {
            guard !stopped, !outgoing.isEmpty else { return }
            let count = outgoing.withUnsafeBytes { Darwin.write(output, $0.baseAddress!, $0.count) }
            if count > 0 {
                outgoing.removeFirst(count)
            } else if count < 0, errno != EAGAIN, errno != EINTR {
                stop(failure("pipe", "Runtime input closed"))
                return
            }
            if outgoing.isEmpty {
                writer?.cancel()
                writer = nil
            } else if writer == nil {
                let writer = DispatchSource.makeWriteSource(fileDescriptor: output, queue: queue)
                io.enter()
                writer.setCancelHandler { [io] in io.leave() }
                writer.setEventHandler { [weak self] in self?.flushInput() }
                self.writer = writer
                writer.resume()
            }
        }

        private func readOutput() {
            guard !stopped else { return }
            var bytes = [UInt8](repeating: 0, count: 16_384)
            // Bound each poll so an app flooding stdout cannot monopolize HostCore.
            for _ in 0..<8 {
                let count = Darwin.read(output, &bytes, bytes.count)
                if count <= 0 { break }
                incoming.append(contentsOf: bytes.prefix(count))
                if incoming.count > maximumFrame {
                    stop(failure("size", "Runtime output exceeded limit"))
                    return
                }
            }
            while !stopped, let newline = incoming.dropFirst(scanned).firstIndex(of: 10) {
                scanned = 0
                let frame = incoming.prefix(upTo: newline)
                incoming.removeSubrange(...newline)
                do {
                    let reply = try jsonObject(frame)
                    if reply["ready"] as? Bool == true, pid == 0, let processId = reply["pid"] as? Int,
                        processId > 0
                    {
                        pid = processId
                        continue
                    }
                    guard let active, reply["id"] as? String == active.id,
                        reply["generation"] as? Int == generation
                    else {
                        throw failure("protocol", "Runtime reply does not match the active request")
                    }
                    self.active = nil
                    pid = reply["pid"] as? Int ?? 0
                    if let error = reply["error"] as? String {
                        active.reply(.failure(failure("app", String(error.prefix(2048)))))
                    } else if let value = reply["value"] as? [String: Any] {
                        active.reply(.success(value))
                    } else {
                        throw failure("protocol", "Missing runtime result")
                    }
                    next()
                } catch {
                    stop(error)
                    return
                }
            }
            scanned = incoming.count
        }

        private func poll() {
            guard !stopped, let process else { return }
            var bytes = [UInt8](repeating: 0, count: 8192)
            let diagnosticCount = Darwin.read(errors, &bytes, bytes.count)
            if diagnosticCount > 0, diagnostics.count < 8192 {
                diagnostics.append(contentsOf: bytes.prefix(min(diagnosticCount, 8192 - diagnostics.count)))
            }
            if let active, active.deadline < Date() {
                stop(failure("timeout", "App runtime exceeded its deadline"))
                return
            }
            if pid > 0, skynet_resident_memory(Int32(pid)) > 268_435_456 {
                stop(failure("memory", "App runtime exceeded its 256 MiB resident-memory budget"))
                return
            }
            var code: Int32 = 0
            if ar_poll(process, &code) != 0 {
                let detail = String(data: diagnostics, encoding: .utf8) ?? ""
                stop(failure("exit", "App runtime exited (\(code)): \(detail)"))
            }
        }

        func stop(_ error: Error = failure("stopped", "Runtime stopped")) {
            guard !stopped else { return }
            stopped = true
            timer?.cancel()
            timer = nil
            if output >= 0 {
                reader?.cancel()
                writer?.cancel()
                reader = nil
                writer = nil
                let fd = output
                output = -1
                // Both dispatch sources must release the descriptor before it can be reused.
                io.notify(queue: queue) { Darwin.close(fd) }
            }
            if errors >= 0 {
                Darwin.close(errors)
                errors = -1
            }
            if let process {
                ar_terminate(process)
                self.process = nil
                // ar_close waits for process-group cleanup. Never block HostCore.
                DispatchQueue.global(qos: .utility).async { ar_close(process) }
            }
            let pending = requests
            requests.removeAll()
            let current = active
            active = nil
            current?.reply(.failure(error))
            for item in pending { item.2(.failure(error)) }
            onFailure?(error)
            onFailure = nil
        }

        deinit {
            assert(stopped, "RuntimeProcess must be stopped on its owner queue")
        }
    }
#endif
