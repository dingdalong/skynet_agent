pub mod chat;
mod platform;
use tauri::Manager;

pub fn builder() -> tauri::Builder<tauri::Wry> {
    // WebView 首次加载可能早于 setup；回调使用的核心必须先登记。
    let core =
        chat::ChatCore::start(env!("AGENT_WS_URL").into()).expect("初始化 Rust 客户端核心失败");
    tauri::Builder::default()
        .manage(core)
        .setup(|_app| {
            #[cfg(target_os = "macos")]
            _app.manage(platform::macos::MenuFilter::install());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            chat::chat_attach,
            chat::chat_detach,
            chat::chat_action
        ])
        .on_page_load(|webview, payload| {
            if payload.event() == tauri::webview::PageLoadEvent::Started {
                webview
                    .state::<chat::ChatCore>()
                    .detach(webview.label().into(), None, false);
            }
        })
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                window
                    .state::<chat::ChatCore>()
                    .detach(window.label().into(), None, true);
            }
        })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    builder()
        .build(tauri::generate_context!())
        .expect("运行 Skynet Agent 客户端失败")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::Exit) {
                shutdown(app);
            }
        });
}

pub fn shutdown(app: &tauri::AppHandle) {
    app.state::<chat::ChatCore>().shutdown();
    #[cfg(target_os = "macos")]
    app.state::<platform::macos::MenuFilter>().stop();
}
