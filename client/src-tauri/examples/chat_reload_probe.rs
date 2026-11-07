//! 独立原生重载测试夹具，不向正式 App 增加测试接口。
use skynet_agent_lib::chat::{self, ChatCore, Event};
use std::{
    fs,
    io::Write,
    path::PathBuf,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc,
    },
};
use tauri::{Manager, State, WebviewWindow};

struct Probe {
    directory: PathBuf,
    phase: AtomicU64,
    arm: AtomicU64,
}
#[tauri::command]
fn probe_phase(probe: State<'_, Arc<Probe>>, phase: Option<u64>) -> u64 {
    eprintln!("[probe] phase request={phase:?}");
    if let Some(phase) = phase {
        probe.phase.store(phase, Ordering::SeqCst);
    }
    probe.phase.load(Ordering::SeqCst)
}
#[tauri::command]
fn probe_reload(window: WebviewWindow) {
    window.reload().unwrap();
}
#[tauri::command]
fn probe_arm(probe: State<'_, Arc<Probe>>, phase: u64) {
    probe.phase.store(phase, Ordering::SeqCst);
    probe.arm.store(1, Ordering::SeqCst);
}
#[tauri::command]
fn probe_evidence(probe: State<'_, Arc<Probe>>) -> serde_json::Value {
    serde_json::from_slice(&fs::read(probe.directory.join("evidence.json")).unwrap()).unwrap()
}
#[tauri::command]
fn probe_drop(probe: State<'_, Arc<Probe>>) {
    fs::write(probe.directory.join("drop"), "drop").unwrap();
}
#[tauri::command]
fn probe_report(app: tauri::AppHandle, probe: State<'_, Arc<Probe>>, report: serde_json::Value) {
    fs::write(
        probe.directory.join("result.json"),
        serde_json::to_vec_pretty(&report).unwrap(),
    )
    .unwrap();
    app.exit(if report["status"] == "passed" { 0 } else { 1 });
}
#[tauri::command]
fn probe_menu_check() {
    eprintln!("[probe] menu check starting");
    #[cfg(target_os = "macos")]
    {
        use objc2::{sel, MainThreadMarker, MainThreadOnly};
        use objc2_app_kit::{NSMenu, NSMenuItem};
        use objc2_foundation::NSString;
        let main = MainThreadMarker::new().expect("菜单检查在主线程执行");
        let menu = NSMenu::new(main);
        let reload = unsafe {
            NSMenuItem::initWithTitle_action_keyEquivalent(
                NSMenuItem::alloc(main),
                &NSString::from_str("重载"),
                Some(sel!(forwardContextMenuAction:)),
                &NSString::new(),
            )
        };
        reload.setTag(12);
        menu.addItem(&reload);
        let copy = unsafe {
            NSMenuItem::initWithTitle_action_keyEquivalent(
                NSMenuItem::alloc(main),
                &NSString::from_str("复制"),
                Some(sel!(copy:)),
                &NSString::new(),
            )
        };
        copy.setTag(8);
        menu.addItem(&copy);
        assert!(reload.isHidden());
        assert!(!copy.isHidden());
        eprintln!("[probe] menu check passed");
    }
}
fn main() {
    let directory = PathBuf::from(
        std::env::var("CHAT_PROBE_DIR")
            .unwrap_or_else(|_| "/private/tmp/skynet-native-chat-probe".into()),
    );
    fs::create_dir_all(&directory).unwrap();
    let probe = Arc::new(Probe {
        directory: directory.clone(),
        phase: AtomicU64::new(0),
        arm: AtomicU64::new(0),
    });
    let navigations = Arc::new(AtomicU64::new(0));
    let observed = navigations.clone();
    let mut context = tauri::generate_context!();
    context.config_mut().identifier = "com.skynet.agent.chatprobe".into();
    let app = skynet_agent_lib::builder()
        .manage(probe.clone())
        .invoke_handler(tauri::generate_handler![
            chat::chat_attach,
            chat::chat_detach,
            chat::chat_action,
            probe_phase,
            probe_reload,
            probe_arm,
            probe_evidence,
            probe_drop,
            probe_report,
            probe_menu_check
        ])
        .plugin(
            tauri::plugin::Builder::<tauri::Wry>::new("reload-probe")
                .js_init_script(include_str!("../../tests/native/chat-reload-probe.js"))
                .on_page_load(move |_, payload| {
                    if payload.event() == tauri::webview::PageLoadEvent::Started {
                        observed.fetch_add(1, Ordering::SeqCst);
                    }
                })
                .build(),
        )
        .build(context)
        .expect("启动原生测试夹具失败");
    let handle = app.handle().clone();
    let core = handle.state::<ChatCore>().inner().clone();
    tauri::async_runtime::spawn(async move {
        core.attach("probe-monitor".into(), String::new(), move |event| {
            let mut file = fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(directory.join("events.jsonl"))
                .unwrap();
            writeln!(file, "{}", serde_json::to_string(&event).unwrap()).unwrap();
            if let Event::State { state } = &event {
                if !state.pending_sends.is_empty() && probe.arm.swap(0, Ordering::SeqCst) == 1 {
                    handle.get_webview_window("main").unwrap().reload().unwrap();
                }
            }
            fs::write(
                directory.join("navigations"),
                navigations.load(Ordering::SeqCst).to_string(),
            )
            .unwrap();
            true
        })
        .await
        .unwrap();
    });
    app.run(|app, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            skynet_agent_lib::shutdown(app)
        }
    });
}
