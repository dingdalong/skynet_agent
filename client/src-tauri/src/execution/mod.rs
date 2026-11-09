//! Desktop execution uses the same C core as the server. State is owned by this engine.
use crate::chat::protocol::pb;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::{HashMap, HashSet},
    ffi::{c_char, c_int, c_void, CStr, CString},
    io::Read,
    path::{Path, PathBuf},
    ptr,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

unsafe extern "C" {
    fn ar_free(p: *mut c_void);
    fn ar_realpath(path: *const c_char) -> *mut c_char;
    fn ar_resolve(path: *const c_char, base: *const c_char) -> *mut c_char;
    fn ar_read_file(path: *const c_char, limit: usize, length: *mut usize) -> *mut c_char;
    fn ar_temporary_file(text: *const c_char, length: usize) -> *mut c_char;
    fn ar_prepare_patch(text: *const c_char, root: *const c_char, escalated: c_int) -> *mut c_char;
    fn ar_spawn(
        launcher: *const c_char,
        cwd: *const c_char,
        argv: *const *const c_char,
        env: *const *const c_char,
        tty: c_int,
    ) -> *mut c_void;
    fn ar_sandbox(
        argv: *const *const c_char,
        root: *const c_char,
        dependencies: *const *const c_char,
    ) -> *mut *mut c_char;
    fn ar_argv_free(argv: *mut *mut c_char);
    fn ar_poll(p: *mut c_void, code: *mut c_int) -> c_int;
    fn ar_read(p: *mut c_void, buffer: *mut c_void, capacity: usize) -> isize;
    fn ar_write(p: *mut c_void, buffer: *const c_void, length: usize) -> isize;
    fn ar_terminate(p: *mut c_void);
    fn ar_close(p: *mut c_void);
}
fn c(s: &str) -> Result<CString, String> {
    CString::new(s).map_err(|_| "参数不能包含 NUL".into())
}
fn owned(p: *mut c_char) -> Result<String, String> {
    if p.is_null() {
        return Err(std::io::Error::last_os_error().to_string());
    }
    let value = unsafe { CStr::from_ptr(p).to_string_lossy().into_owned() };
    unsafe { ar_free(p.cast()) };
    Ok(value)
}
fn canonical(path: &str) -> Result<String, String> {
    owned(unsafe { ar_realpath(c(path)?.as_ptr()) })
}
fn resolve(path: &str, root: &str) -> Result<String, String> {
    owned(unsafe { ar_resolve(c(path)?.as_ptr(), c(root)?.as_ptr()) })
}
fn inside(path: &str, root: &str) -> bool {
    path == root || path.starts_with(&format!("{root}/"))
}
fn read_file(path: &str, cap: usize) -> Result<String, String> {
    let mut n = 0;
    let p = unsafe { ar_read_file(c(path)?.as_ptr(), cap, &mut n) };
    if p.is_null() {
        return Err(std::io::Error::last_os_error().to_string());
    }
    let result = if n > cap {
        Err("文件超过字节上限".into())
    } else {
        std::str::from_utf8(unsafe { std::slice::from_raw_parts(p.cast(), n) })
            .map(str::to_owned)
            .map_err(|_| "文件必须是 UTF-8 文本".into())
    };
    unsafe { ar_free(p.cast()) };
    result
}
fn unique() -> Result<String, String> {
    let mut bytes = [0u8; 16];
    std::fs::File::open("/dev/urandom")
        .and_then(|mut file| file.read_exact(&mut bytes))
        .map_err(|e| e.to_string())?;
    Ok(bytes.iter().map(|byte| format!("{byte:02x}")).collect())
}
fn text(bytes: &[u8], final_chunk: bool) -> (String, usize) {
    let mut consumed = 0;
    while consumed < bytes.len() {
        match std::str::from_utf8(&bytes[consumed..]) {
            Ok(_) => {
                consumed = bytes.len();
            }
            Err(error) => {
                consumed += error.valid_up_to();
                match error.error_len() {
                    Some(length) => consumed += length,
                    None if final_chunk => consumed = bytes.len(),
                    None => break,
                }
            }
        }
    }
    let output = String::from_utf8_lossy(&bytes[..consumed])
        .chars()
        .filter(|ch| !ch.is_control() || matches!(ch, '\n' | '\r' | '\t'))
        .collect();
    (output, consumed)
}
struct Temporary(Option<PathBuf>);
impl Drop for Temporary {
    fn drop(&mut self) {
        if let Some(path) = self.0.take() {
            let _ = std::fs::remove_file(path);
        }
    }
}
struct Sandbox(*mut *mut c_char);
impl Drop for Sandbox {
    fn drop(&mut self) {
        unsafe { ar_argv_free(self.0) };
    }
}
#[derive(Default, Deserialize, Serialize)]
struct Settings {
    device_id: String,
    remote: HashMap<String, bool>,
    workspaces: HashMap<String, HashMap<String, String>>,
}
struct Process(*mut c_void);
// Each handle is used under its Job mutex; the C core has no shared mutable state.
unsafe impl Send for Process {}
impl Drop for Process {
    fn drop(&mut self) {
        unsafe { ar_close(self.0) };
    }
}
struct Job {
    process: Process,
    cwd: String,
    mode: String,
    argv: Vec<String>,
    tty: bool,
    pending: Vec<u8>,
    output: Vec<u8>,
    exit_code: Option<i32>,
    error: Option<String>,
    deadline: Instant,
    remote: bool,
    session: String,
    run: String,
    truncated: bool,
    temporary: Option<PathBuf>,
    cancelled: bool,
    max_output_bytes: usize,
}
impl Job {
    fn drain(&mut self) {
        let mut buffer = [0u8; 8192];
        for _ in 0..256 {
            let n = unsafe { ar_read(self.process.0, buffer.as_mut_ptr().cast(), buffer.len()) };
            if n <= 0 {
                break;
            }
            self.pending.extend_from_slice(&buffer[..n as usize]);
            self.output.extend_from_slice(&buffer[..n as usize]);
        }
        if self.pending.len() > self.max_output_bytes {
            self.pending
                .drain(..self.pending.len() - self.max_output_bytes);
            self.truncated = true;
        }
        if self.output.len() > 32768 {
            self.output.drain(..self.output.len() - 32768);
            self.truncated = true;
        }
    }
    fn pump(&mut self) {
        if self.exit_code.is_some() {
            return;
        }
        if Instant::now() >= self.deadline && !self.cancelled {
            self.error = Some("命令执行超时".into());
            self.cancel();
        }
        self.drain();
        let mut code = 0;
        if unsafe { ar_poll(self.process.0, &mut code) } == 1 {
            // The child can exit between the first drain and waitpid.
            self.drain();
            self.exit_code = Some(code);
            if let Some(path) = self.temporary.take() {
                let _ = std::fs::remove_file(path);
            }
        }
    }
    fn cancel(&mut self) {
        self.cancelled = true;
        unsafe { ar_terminate(self.process.0) };
    }
}
struct State {
    settings: Settings,
    username: String,
    jobs: HashMap<String, Arc<Mutex<Job>>>,
    sequence: u64,
    seen: HashMap<String, (Value, Value)>,
    epoch: u64,
    remote_epoch: u64,
    connected: bool,
    inflight: HashSet<String>,
    cancelled_runs: HashSet<String>,
    prepared: HashMap<String, (String, Value, Value)>,
    authorization_id: String,
}
#[derive(Clone)]
pub struct Engine {
    state: Arc<Mutex<State>>,
    settings_path: PathBuf,
    binaries: PathBuf,
}
impl Engine {
    pub fn new(data: PathBuf, resources: PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(&data).map_err(|e| e.to_string())?;
        let path = data.join("execution.json");
        let mut settings: Settings = match std::fs::read(&path) {
            Ok(bytes) => {
                serde_json::from_slice(&bytes).map_err(|e| format!("执行配置损坏: {e}"))?
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Settings::default(),
            Err(e) => return Err(e.to_string()),
        };
        if settings.device_id.is_empty() {
            settings.device_id = unique()?;
        }
        let binaries = if resources.join("native/agent_worker").is_file() {
            resources.join("native")
        } else if cfg!(debug_assertions) {
            PathBuf::from(env!("AGENT_NATIVE_BIN"))
        } else {
            return Err("安装包缺少本地执行辅助程序".into());
        };
        let engine = Self {
            state: Arc::new(Mutex::new(State {
                settings,
                username: String::new(),
                jobs: HashMap::new(),
                sequence: 0,
                seen: HashMap::new(),
                epoch: 0,
                remote_epoch: 0,
                connected: false,
                inflight: HashSet::new(),
                cancelled_runs: HashSet::new(),
                prepared: HashMap::new(),
                authorization_id: unique()?,
            })),
            settings_path: path,
            binaries,
        };
        engine.save()?;
        Ok(engine)
    }
    fn save(&self) -> Result<(), String> {
        let state = self.state.lock().unwrap();
        let bytes = serde_json::to_vec(&state.settings).map_err(|e| e.to_string())?;
        let tmp = self.settings_path.with_extension("tmp");
        std::fs::write(&tmp, bytes).map_err(|e| e.to_string())?;
        std::fs::rename(tmp, &self.settings_path).map_err(|e| e.to_string())
    }
    pub fn login(&self, username: &str) {
        let mut state = self.state.lock().unwrap();
        state.connected = true;
        if state.username != username {
            state.epoch += 1;
            for job in state.jobs.values() {
                job.lock().unwrap().cancel();
            }
            state.username = username.into();
            state.seen.clear();
            state.inflight.clear();
        }
    }
    pub fn registration(&self) -> pb::DesktopRegisterReq {
        let s = self.state.lock().unwrap();
        pb::DesktopRegisterReq {
            device_id: s.settings.device_id.clone(),
            name: std::env::var("HOSTNAME").unwrap_or_else(|_| "桌面设备".into()),
            remote_enabled: *s.settings.remote.get(&s.username).unwrap_or(&false),
            authorization_id: s.authorization_id.clone(),
        }
    }
    pub fn set_remote(&self, enabled: bool) -> Result<(), String> {
        let authorization_id = unique()?;
        {
            let mut s = self.state.lock().unwrap();
            s.authorization_id = authorization_id;
            let user = s.username.clone();
            s.settings.remote.insert(user, enabled);
            if !enabled {
                s.remote_epoch += 1;
                for job in s.jobs.values() {
                    let mut j = job.lock().unwrap();
                    if j.remote {
                        j.cancel();
                    }
                }
            }
        }
        self.save()
    }
    pub fn bind(&self, directory: &str) -> Result<pb::ExecutionTarget, String> {
        let root = canonical(directory)?;
        if !Path::new(&root).is_dir() {
            return Err("工作目录不存在".into());
        }
        for name in [".agent-home", ".agent-tmp"] {
            std::fs::create_dir_all(Path::new(&root).join(name)).map_err(|e| e.to_string())?;
        }
        let mut s = self.state.lock().unwrap();
        let user = s.username.clone();
        let workspaces = s.settings.workspaces.entry(user).or_default();
        let id = workspaces
            .iter()
            .find(|(_, path)| **path == root)
            .map(|(id, _)| id.clone())
            .map(Ok)
            .unwrap_or_else(unique)?;
        workspaces.insert(id.clone(), root.clone());
        let device_id = s.settings.device_id.clone();
        drop(s);
        self.save()?;
        Ok(pb::ExecutionTarget {
            device_id,
            workspace_id: id,
            directory: root,
            platform: if cfg!(target_os = "macos") {
                "macos"
            } else {
                "linux"
            }
            .into(),
        })
    }
    fn root(&self, id: &str, remote: bool) -> Result<String, String> {
        let s = self.state.lock().unwrap();
        if remote && !s.settings.remote.get(&s.username).copied().unwrap_or(false) {
            return Err("此桌面未开启远程执行".into());
        }
        let root = s
            .settings
            .workspaces
            .get(&s.username)
            .and_then(|w| w.get(id))
            .ok_or("工作区未由此桌面授权")?;
        if canonical(root)? != *root {
            return Err("工作区路径已改变，请重新选择目录".into());
        }
        Ok(root.clone())
    }
    pub fn disconnect(&self) {
        let mut s = self.state.lock().unwrap();
        s.connected = false;
        s.epoch += 1;
        for job in s.jobs.values() {
            job.lock().unwrap().cancel();
        }
    }
    pub fn tick(&self) {
        let jobs: Vec<_> = self.state.lock().unwrap().jobs.values().cloned().collect();
        for job in jobs {
            job.lock().unwrap().pump();
        }
    }
    fn get_job(&self, id: &str, session: &str) -> Result<Arc<Mutex<Job>>, String> {
        let job = self
            .state
            .lock()
            .unwrap()
            .jobs
            .get(id)
            .cloned()
            .ok_or("执行会话不存在")?;
        if job.lock().unwrap().session != session {
            return Err("执行会话不属于当前会话".into());
        }
        Ok(job)
    }
    fn prepare(
        &self,
        root: &str,
        name: &str,
        args: &Value,
        session: &str,
        limits: &Value,
    ) -> Result<Value, String> {
        let mode = args["sandbox_permissions"]
            .as_str()
            .unwrap_or("use_default");
        if !matches!(mode, "use_default" | "require_escalated") {
            return Err("执行权限模式无效".into());
        }
        if mode == "require_escalated"
            && args["justification"]
                .as_str()
                .unwrap_or("")
                .trim()
                .is_empty()
        {
            return Err("沙盒外执行必须说明原因".into());
        }
        let max_timeout = limits["timeout_ms"]
            .as_u64()
            .unwrap_or(300000)
            .clamp(1, 3600000);
        let timeout = args["timeout_ms"]
            .as_u64()
            .unwrap_or(max_timeout)
            .clamp(1, max_timeout);
        let mut action = json!({"name":name,"args":args,"workspace":root,"mode":mode,"max_tokens":args["max_output_tokens"].as_u64().unwrap_or(4000),"wait_ms":args["yield_time_ms"].as_u64().unwrap_or(if name == "write_stdin" {1000} else {10000}),"timeout":timeout});
        match name {
            "exec_command" => {
                let cmd = args["cmd"].as_str().ok_or("缺少命令")?;
                if cmd.trim().is_empty() || cmd.len() > 65536 {
                    return Err("命令为空或过长".into());
                }
                let cwd = resolve(args["workdir"].as_str().unwrap_or("."), root)?;
                if !Path::new(&cwd).is_dir() || (mode != "require_escalated" && !inside(&cwd, root))
                {
                    return Err("工作目录不存在或越界".into());
                }
                action["cwd"] = json!(cwd);
            }
            "apply_patch" => {
                let patch = c(args["patch"].as_str().ok_or("缺少补丁")?)?;
                let result: Value = serde_json::from_str(&owned(unsafe {
                    ar_prepare_patch(
                        patch.as_ptr(),
                        c(root)?.as_ptr(),
                        (mode == "require_escalated") as i32,
                    )
                })?)
                .map_err(|e| e.to_string())?;
                if result["ok"] != true {
                    return Err(result["error"].as_str().unwrap_or("补丁无效").into());
                }
                action["paths"] = result["changed_files"].clone();
            }
            "write_stdin" => {
                let job =
                    self.get_job(args["session_id"].as_str().ok_or("缺少执行会话")?, session)?;
                let j = job.lock().unwrap();
                action["mode"] = json!(j.mode);
                action["cwd"] = json!(j.cwd);
                action["launch_argv"] = json!(j.argv);
            }
            _ => return Err("未知工具".into()),
        }
        Ok(action)
    }
    fn spawn(
        &self,
        root: &str,
        name: &str,
        args: &Value,
        action: &Value,
        message: &pb::ExecutionActionNtf,
        token: (u64, u64),
        limits: &Value,
    ) -> Result<String, String> {
        let mode = action["mode"].as_str().unwrap_or("use_default");
        let mut temporary = Temporary(None);
        let argv = if name == "apply_patch" {
            let text = c(args["patch"].as_str().ok_or("缺少补丁")?)?;
            let path = owned(unsafe { ar_temporary_file(text.as_ptr(), text.as_bytes().len()) })?;
            temporary.0 = Some(PathBuf::from(&path));
            vec![
                self.binaries
                    .join("agent_worker")
                    .to_string_lossy()
                    .into_owned(),
                "patch".into(),
                root.into(),
                path,
            ]
        } else {
            vec![
                "/bin/bash".into(),
                "--noprofile".into(),
                "--norc".into(),
                "-c".into(),
                args["cmd"].as_str().ok_or("缺少命令")?.into(),
            ]
        };
        let cwd = action["cwd"].as_str().unwrap_or(root).to_owned();
        let cargv: Vec<_> = argv.iter().map(|a| c(a)).collect::<Result<_, _>>()?;
        let mut ptrs: Vec<_> = cargv.iter().map(|s| s.as_ptr()).collect();
        ptrs.push(ptr::null());
        let deps: Vec<_> = if temporary.0.is_some() {
            vec![c(&argv[0])?, c(&argv[3])?]
        } else {
            vec![]
        };
        let mut dep_ptrs: Vec<_> = deps.iter().map(|s| s.as_ptr()).collect();
        dep_ptrs.push(ptr::null());
        let sandbox = Sandbox(if mode == "require_escalated" {
            ptr::null_mut()
        } else {
            unsafe { ar_sandbox(ptrs.as_ptr(), c(root)?.as_ptr(), dep_ptrs.as_ptr()) }
        });
        if mode != "require_escalated" && sandbox.0.is_null() {
            return Err("系统沙盒不可用".into());
        }
        let env = [
            "PATH=/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin".into(),
            format!("HOME={root}/.agent-home"),
            format!("TMPDIR={root}/.agent-tmp"),
            "LANG=en_US.UTF-8".into(),
            "TERM=xterm-256color".into(),
        ];
        let env: Vec<_> = env.iter().map(|s| c(s)).collect::<Result<_, _>>()?;
        let mut env_ptrs: Vec<_> = env.iter().map(|s| s.as_ptr()).collect();
        env_ptrs.push(ptr::null());
        let mut s = self.state.lock().unwrap();
        let binding = s
            .settings
            .workspaces
            .get(&s.username)
            .and_then(|w| w.get(&message.workspace_id));
        if !s.connected
            || s.epoch != token.0
            || (message.remote && s.remote_epoch != token.1)
            || binding.map(String::as_str) != Some(root)
            || s.cancelled_runs
                .contains(&format!("{}:{}", message.session_id, message.run_id))
        {
            return Err("执行任务已停止或工作区绑定已改变".into());
        }
        if message.remote && !s.settings.remote.get(&s.username).copied().unwrap_or(false) {
            return Err("远程执行已关闭".into());
        }
        if s.jobs.len() > 64 {
            s.jobs
                .retain(|_, job| job.lock().unwrap().exit_code.is_none());
        }
        let max_processes = limits["max_processes"].as_u64().unwrap_or(8).clamp(1, 64) as usize;
        if s.jobs
            .values()
            .filter(|job| {
                let job = job.lock().unwrap();
                job.session == message.session_id && job.exit_code.is_none()
            })
            .count()
            >= max_processes
        {
            return Err("运行进程数量已达上限".into());
        }
        let tty = name != "apply_patch" && args["tty"].as_bool().unwrap_or(false);
        let handle = unsafe {
            ar_spawn(
                c(&self.binaries.join("process_launcher").to_string_lossy())?.as_ptr(),
                c(&cwd)?.as_ptr(),
                if sandbox.0.is_null() {
                    ptrs.as_ptr()
                } else {
                    sandbox.0.cast()
                },
                env_ptrs.as_ptr(),
                tty as i32,
            )
        };
        if handle.is_null() {
            return Err(std::io::Error::last_os_error().to_string());
        }
        s.sequence += 1;
        let id = format!("{}:{}", message.session_id, s.sequence);
        let timeout = action["timeout"].as_u64().ok_or("缺少执行时限")?;
        s.jobs.insert(
            id.clone(),
            Arc::new(Mutex::new(Job {
                process: Process(handle),
                cwd,
                mode: mode.into(),
                argv,
                tty,
                pending: vec![],
                output: vec![],
                exit_code: None,
                error: None,
                deadline: Instant::now() + Duration::from_millis(timeout),
                remote: message.remote,
                session: message.session_id.clone(),
                run: message.run_id.clone(),
                truncated: false,
                temporary: temporary.0.take(),
                cancelled: false,
                max_output_bytes: limits["max_output_bytes"]
                    .as_u64()
                    .unwrap_or(2097152)
                    .clamp(32768, 16777216) as usize,
            })),
        );
        Ok(id)
    }
    fn collect(
        &self,
        id: &str,
        args: &Value,
        message: &pb::ExecutionActionNtf,
        token: (u64, u64),
        patch: bool,
    ) -> Result<Value, String> {
        let session = &message.session_id;
        let job = self.get_job(id, session)?;
        if let Some(input) = args["chars"].as_str().filter(|s| !s.is_empty()) {
            let s = self.state.lock().unwrap();
            if !s.connected
                || s.epoch != token.0
                || s.cancelled_runs
                    .contains(&format!("{}:{}", message.session_id, message.run_id))
                || (message.remote
                    && (s.remote_epoch != token.1
                        || message.authorization_id != s.authorization_id
                        || !s.settings.remote.get(&s.username).copied().unwrap_or(false)))
            {
                return Err("终端输入授权已失效".into());
            }
            let j = job.lock().unwrap();
            if !j.tty || j.exit_code.is_some() || input.len() > 65536 {
                return Err("终端输入无效或已关闭".into());
            }
            let mut n = 0;
            while n < input.len() {
                let written =
                    unsafe { ar_write(j.process.0, input.as_ptr().add(n).cast(), input.len() - n) };
                if written <= 0 {
                    return Err("终端写入失败".into());
                }
                n += written as usize;
            }
        }
        let until = if patch {
            job.lock().unwrap().deadline + Duration::from_secs(1)
        } else {
            Instant::now()
                + Duration::from_millis(
                    args["yield_time_ms"]
                        .as_u64()
                        .unwrap_or(10000)
                        .clamp(1, 30000),
                )
        };
        loop {
            let mut j = job.lock().unwrap();
            j.pump();
            if j.exit_code.is_some() || Instant::now() >= until {
                break;
            }
            drop(j);
            std::thread::sleep(Duration::from_millis(10));
        }
        let mut j = job.lock().unwrap();
        let (mut output, consumed) = text(&j.pending, j.exit_code.is_some());
        j.pending.drain(..consumed);
        if patch {
            return serde_json::from_str(&output).map_err(|_| format!("补丁执行失败: {output}"));
        }
        let cap = (args["max_output_tokens"]
            .as_u64()
            .unwrap_or(4000)
            .clamp(1, 16384)
            * 4) as usize;
        let truncated = j.truncated || output.len() > cap;
        if output.len() > cap {
            let mut start = cap / 2;
            while !output.is_char_boundary(start) {
                start -= 1;
            }
            let mut end = output.len() - cap / 2;
            while !output.is_char_boundary(end) {
                end += 1;
            }
            output = format!("{}\n… 输出已截断 …\n{}", &output[..start], &output[end..]);
        }
        Ok(
            json!({"ok":j.error.is_none(),"session_id":if j.exit_code.is_none(){Some(id)}else{None},"output":output,"exit_code":j.exit_code,"truncated":truncated,"error":j.error,"cancelled":j.cancelled}),
        )
    }
    pub fn token(&self) -> (u64, u64) {
        let s = self.state.lock().unwrap();
        (s.epoch, s.remote_epoch)
    }
    fn perform(
        &self,
        message: &pb::ExecutionActionNtf,
        token: (u64, u64),
    ) -> Result<Value, String> {
        {
            let s = self.state.lock().unwrap();
            let launch = !matches!(message.operation.as_str(), "cancel" | "status");
            if !s.connected
                || s.epoch != token.0
                || (message.remote
                    && launch
                    && (s.remote_epoch != token.1
                        || message.authorization_id != s.authorization_id))
            {
                return Err("执行连接或远程授权已改变".into());
            }
        }
        let root = self.root(
            &message.workspace_id,
            message.remote && !matches!(message.operation.as_str(), "cancel" | "status"),
        )?;
        let args: Value = serde_json::from_str(&message.arguments).map_err(|e| e.to_string())?;
        match message.operation.as_str() {
            "project" => {
                let cap = args["max_bytes"].as_u64().unwrap_or(32768).min(1048576) as usize;
                let mut project = json!({"workspace":root});
                if cap > 0 {
                    for name in ["AGENTS.override.md", "AGENTS.md"] {
                        let path = Path::new(&root).join(name);
                        if path.symlink_metadata().is_err() {
                            continue;
                        }
                        let resolved = canonical(&path.to_string_lossy())?;
                        if !inside(&resolved, &root) {
                            return Err("项目规则超出工作目录".into());
                        }
                        let text = read_file(&resolved, cap)?;
                        project["path"] = json!(path.to_string_lossy());
                        if !text.trim().is_empty() {
                            project["text"] = json!(text);
                        }
                        break;
                    }
                }
                Ok(json!({"ok":true,"project":project}))
            }
            "prepare" => {
                let action = self.prepare(
                    &root,
                    args["name"].as_str().ok_or("缺少工具名称")?,
                    &args["args"],
                    &message.session_id,
                    &args["limits"],
                )?;
                let key = format!(
                    "{}:{}:{}",
                    message.session_id, message.run_id, message.tool_call_id
                );
                self.state
                    .lock()
                    .unwrap()
                    .prepared
                    .insert(key, (root, args.clone(), action.clone()));
                Ok(json!({"ok":true,"action":action}))
            }
            "execute" => {
                let name = args["name"].as_str().ok_or("缺少工具名称")?;
                let action = self.prepare(
                    &root,
                    name,
                    &args["args"],
                    &message.session_id,
                    &args["limits"],
                )?;
                let key = format!(
                    "{}:{}:{}",
                    message.session_id, message.run_id, message.tool_call_id
                );
                let (prepared_root, prepared_args, prepared_action) = self
                    .state
                    .lock()
                    .unwrap()
                    .prepared
                    .remove(&key)
                    .ok_or("动作尚未准备或已失效")?;
                if prepared_root != root || prepared_args != args || prepared_action != action {
                    return Err("执行目标在权限判断后改变，请重新准备动作".into());
                }
                let id = if name == "write_stdin" {
                    args["args"]["session_id"]
                        .as_str()
                        .ok_or("缺少执行会话")?
                        .to_owned()
                } else {
                    self.spawn(
                        &root,
                        name,
                        &args["args"],
                        &action,
                        message,
                        token,
                        &args["limits"],
                    )?
                };
                self.collect(&id, &args["args"], message, token, name == "apply_patch")
            }
            "status" => {
                let job = self.get_job(
                    args["session_id"].as_str().ok_or("缺少执行会话")?,
                    &message.session_id,
                )?;
                let mut j = job.lock().unwrap();
                j.pump();
                Ok(
                    json!({"done":j.exit_code.is_some(),"exit_code":j.exit_code,"output":text(&j.output, j.exit_code.is_some()).0,"error":j.error,"truncated":j.truncated,"cancelled":j.cancelled}),
                )
            }
            "cancel" => {
                self.state
                    .lock()
                    .unwrap()
                    .cancelled_runs
                    .insert(format!("{}:{}", message.session_id, message.run_id));
                if let Some(id) = args["session_id"].as_str() {
                    self.get_job(id, &message.session_id)?
                        .lock()
                        .unwrap()
                        .cancel();
                } else {
                    for job in self.state.lock().unwrap().jobs.values() {
                        let mut j = job.lock().unwrap();
                        if j.session == message.session_id && j.run == message.run_id {
                            j.cancel();
                        }
                    }
                }
                Ok(json!({"ok":true}))
            }
            _ => Err("未知执行操作".into()),
        }
    }
    #[cfg(test)]
    pub fn handle(&self, message: &pb::ExecutionActionNtf) -> Value {
        self.handle_with_token(message, self.token())
    }
    pub fn handle_with_token(&self, message: &pb::ExecutionActionNtf, token: (u64, u64)) -> Value {
        let key = format!(
            "{}:{}:{}",
            message.session_id, message.run_id, message.tool_call_id
        );
        let dedup = message.operation == "execute";
        if dedup {
            let mut s = self.state.lock().unwrap();
            if let Some((arguments, result)) = s.seen.get(&key) {
                if serde_json::from_str::<Value>(&message.arguments)
                    .ok()
                    .as_ref()
                    != Some(arguments)
                {
                    return json!({"ok":false,"error":"工具调用 ID 被不同参数复用"});
                }
                return result.clone();
            }
            if !s.inflight.insert(key.clone()) {
                return json!({"ok":false,"error":"工具调用正在执行，不重复启动"});
            }
        }
        let result = self.perform(message, token).unwrap_or_else(|error| {
            eprintln!("[execution] {} failed: {error}", message.operation);
            json!({"ok":false,"error":error})
        });
        if dedup {
            let mut s = self.state.lock().unwrap();
            s.inflight.remove(&key);
            s.seen.insert(
                key,
                (
                    serde_json::from_str(&message.arguments).unwrap_or(Value::Null),
                    result.clone(),
                ),
            );
        }
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn setup() -> (Engine, PathBuf) {
        let root = std::env::temp_dir().join(format!("execution-test-{}", unique().unwrap()));
        let workspace = root.join("project");
        std::fs::create_dir_all(&workspace).unwrap();
        let engine = Engine::new(root.join("settings"), root.join("resources")).unwrap();
        engine.login("alice");
        (engine, workspace)
    }
    fn action(
        target: &pb::ExecutionTarget,
        operation: &str,
        name: &str,
        args: Value,
    ) -> pb::ExecutionActionNtf {
        pb::ExecutionActionNtf {
            request_id: unique().unwrap(),
            workspace_id: target.workspace_id.clone(),
            session_id: "test-session".into(),
            run_id: "test-run".into(),
            tool_call_id: unique().unwrap(),
            operation: operation.into(),
            arguments: json!({"name":name,"args":args}).to_string(),
            remote: false,
            authorization_id: String::new(),
        }
    }
    fn execute(engine: &Engine, request: &pb::ExecutionActionNtf) -> Value {
        let mut prepare = request.clone();
        prepare.operation = "prepare".into();
        assert_eq!(engine.handle(&prepare)["ok"], true);
        engine.handle(request)
    }
    #[test]
    fn bindings_and_remote_opt_in_persist_per_username() {
        let (engine, root) = setup();
        let target = engine.bind(root.to_str().unwrap()).unwrap();
        assert!(engine.root(&target.workspace_id, true).is_err());
        engine.set_remote(true).unwrap();
        assert!(engine.root(&target.workspace_id, true).is_ok());
        let restored = Engine::new(
            engine.settings_path.parent().unwrap().into(),
            PathBuf::new(),
        )
        .unwrap();
        restored.login("alice");
        assert_eq!(restored.registration().device_id, target.device_id);
        assert_eq!(
            restored.root(&target.workspace_id, true).unwrap(),
            target.directory
        );
        restored.login("bob");
        assert!(!restored.registration().remote_enabled);
        assert!(restored.root(&target.workspace_id, false).is_err());
    }
    #[test]
    fn project_snapshot_uses_target_files_and_rejects_escaping_rules() {
        let (engine, root) = setup();
        let target = engine.bind(root.to_str().unwrap()).unwrap();
        std::fs::write(root.join("AGENTS.md"), "local-rule").unwrap();
        let mut request = action(&target, "project", "", Value::Null);
        request.arguments = json!({"max_bytes":128}).to_string();
        assert_eq!(engine.handle(&request)["project"]["text"], "local-rule");
        std::fs::remove_file(root.join("AGENTS.md")).unwrap();
        std::fs::write(root.parent().unwrap().join("outside"), "private").unwrap();
        std::os::unix::fs::symlink(
            root.parent().unwrap().join("outside"),
            root.join("AGENTS.md"),
        )
        .unwrap();
        assert_eq!(engine.handle(&request)["ok"], false);
    }
    #[test]
    fn calls_are_not_replayed_and_terminal_input_is_scoped_to_session() {
        let (engine, root) = setup();
        let target = engine.bind(root.to_str().unwrap()).unwrap();
        let request = action(
            &target,
            "execute",
            "exec_command",
            json!({"cmd":"printf once >> once.txt; cat once.txt","sandbox_permissions":"require_escalated","justification":"测试独立临时目录内的命令"}),
        );
        let first = execute(&engine, &request);
        assert_eq!(first["exit_code"], 0);
        assert_eq!(first["output"], "once");
        assert_eq!(engine.handle(&request), first);
        assert_eq!(
            std::fs::read_to_string(root.join("once.txt")).unwrap(),
            "once"
        );
        let bad = action(
            &target,
            "prepare",
            "exec_command",
            json!({"cmd":"pwd","workdir":".."}),
        );
        assert_eq!(engine.handle(&bad)["ok"], false);
    }
    #[test]
    fn disabling_remote_stops_remote_jobs_and_keeps_local_jobs() {
        let (engine, root) = setup();
        let target = engine.bind(root.to_str().unwrap()).unwrap();
        engine.set_remote(true).unwrap();
        let mut remote = action(
            &target,
            "execute",
            "exec_command",
            json!({"cmd":"sleep 10","yield_time_ms":1,"sandbox_permissions":"require_escalated","justification":"测试临时进程取消"}),
        );
        remote.remote = true;
        remote.authorization_id = engine.registration().authorization_id;
        let remote_id = execute(&engine, &remote)["session_id"]
            .as_str()
            .unwrap()
            .to_owned();
        let local = action(
            &target,
            "execute",
            "exec_command",
            json!({"cmd":"sleep 10","yield_time_ms":1,"sandbox_permissions":"require_escalated","justification":"测试临时进程独立性"}),
        );
        let local_id = execute(&engine, &local)["session_id"]
            .as_str()
            .unwrap()
            .to_owned();
        engine.set_remote(false).unwrap();
        assert!(
            engine
                .get_job(&remote_id, "test-session")
                .unwrap()
                .lock()
                .unwrap()
                .cancelled
        );
        assert!(
            !engine
                .get_job(&local_id, "test-session")
                .unwrap()
                .lock()
                .unwrap()
                .cancelled
        );
        assert!(engine.get_job(&local_id, "other-session").is_err());
        engine.disconnect();
    }
    #[test]
    fn cancellation_before_launch_prevents_late_actions() {
        let (engine, root) = setup();
        let target = engine.bind(root.to_str().unwrap()).unwrap();
        let mut cancel = action(&target, "cancel", "", Value::Null);
        cancel.arguments = "{}".into();
        assert_eq!(engine.handle(&cancel)["ok"], true);
        let request = action(
            &target,
            "execute",
            "exec_command",
            json!({"cmd":"printf forbidden > late.txt","sandbox_permissions":"require_escalated","justification":"验证已取消任务不会启动"}),
        );
        assert_eq!(execute(&engine, &request)["ok"], false);
        assert!(!root.join("late.txt").exists());
    }
    #[test]
    fn preparation_and_remote_authorization_must_still_match_at_launch() {
        let (engine, root) = setup();
        let target = engine.bind(root.to_str().unwrap()).unwrap();
        let mut request = action(
            &target,
            "execute",
            "exec_command",
            json!({"cmd":"printf forbidden > stale.txt","sandbox_permissions":"require_escalated","justification":"验证失效授权"}),
        );
        assert_eq!(engine.handle(&request)["ok"], false);
        request.tool_call_id = unique().unwrap();
        let mut prepare = request.clone();
        prepare.operation = "prepare".into();
        assert_eq!(engine.handle(&prepare)["ok"], true);
        request.arguments =
            json!({"name":"exec_command","args":{"cmd":"touch changed.txt"}}).to_string();
        assert_eq!(engine.handle(&request)["ok"], false);
        engine.set_remote(true).unwrap();
        request = prepare.clone();
        request.remote = true;
        request.authorization_id = engine.registration().authorization_id;
        request.tool_call_id = unique().unwrap();
        assert_eq!(engine.handle(&request)["ok"], true);
        let token = engine.token();
        engine.set_remote(false).unwrap();
        engine.set_remote(true).unwrap();
        request.operation = "execute".into();
        assert_eq!(engine.handle(&request)["ok"], false);
        request.tool_call_id = unique().unwrap();
        request.authorization_id = engine.registration().authorization_id;
        assert_eq!(engine.handle_with_token(&request, token)["ok"], false);
        assert!(!root.join("stale.txt").exists());
        assert!(!root.join("changed.txt").exists());
    }
    #[test]
    fn pty_continuation_and_split_utf8_preserve_output_after_exit() {
        let (engine, root) = setup();
        let target = engine.bind(root.to_str().unwrap()).unwrap();
        let request = action(
            &target,
            "execute",
            "exec_command",
            json!({"cmd":"read -r value; printf '\\001你好:%s\\n' \"$value\"","tty":true,"yield_time_ms":1,"sandbox_permissions":"require_escalated","justification":"验证临时终端"}),
        );
        let started = execute(&engine, &request);
        let id = started["session_id"].as_str().unwrap();
        let input = action(
            &target,
            "execute",
            "write_stdin",
            json!({"session_id":id,"chars":"world\n","yield_time_ms":1000}),
        );
        let finished = execute(&engine, &input);
        assert_eq!(finished["exit_code"], 0);
        assert!(finished["output"].as_str().unwrap().contains("你好:world"));
        assert!(!finished["output"].as_str().unwrap().contains('\u{1}'));
        let request = action(
            &target,
            "execute",
            "exec_command",
            json!({"cmd":"printf '\\344'; sleep 0.15; printf '\\275\\240好'","yield_time_ms":50,"sandbox_permissions":"require_escalated","justification":"验证分段 UTF-8 输出"}),
        );
        let started = execute(&engine, &request);
        assert_eq!(started["output"], "");
        let id = started["session_id"].as_str().unwrap();
        let read = action(
            &target,
            "execute",
            "write_stdin",
            json!({"session_id":id,"yield_time_ms":1000}),
        );
        let finished = execute(&engine, &read);
        assert_eq!(finished["exit_code"], 0);
        assert_eq!(finished["output"], "你好");
    }
}
