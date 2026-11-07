fn main() {
    let proto_root = std::path::Path::new("../../common/proto");
    let mut protos = std::fs::read_dir(proto_root)
        .expect("读取共享协议目录失败")
        .map(|entry| entry.expect("读取协议文件失败").path())
        .filter(|path| {
            path.extension()
                .is_some_and(|extension| extension == "proto")
        })
        .collect::<Vec<_>>();
    protos.sort();
    for path in &protos {
        println!("cargo:rerun-if-changed={}", path.display());
    }
    prost_build::Config::new()
        .protoc_executable(protoc_bin_vendored::protoc_bin_path().expect("缺少 protoc 构建工具"))
        .compile_protos(&protos, &[proto_root])
        .expect("生成 Rust 协议失败");
    println!("cargo:rerun-if-env-changed=VITE_AGENT_WS_URL");
    println!(
        "cargo:rustc-env=AGENT_WS_URL={}",
        std::env::var("VITE_AGENT_WS_URL").unwrap_or_else(|_| "ws://127.0.0.1:18787/agent".into())
    );
    tauri_build::build()
}
