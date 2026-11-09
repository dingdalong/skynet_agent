fn main() {
    let native = std::path::Path::new("../../common/native/agent_runtime")
        .canonicalize()
        .unwrap();
    let out = std::path::PathBuf::from(std::env::var_os("OUT_DIR").unwrap()).join("native");
    let target = std::env::var("CARGO_CFG_TARGET_OS").unwrap();
    if target == "macos" || target == "linux" {
        for entry in std::fs::read_dir(&native).unwrap() {
            let path = entry.unwrap().path();
            if path.file_name().is_some_and(|name| name == "makefile")
                || path
                    .extension()
                    .is_some_and(|extension| extension == "c" || extension == "h")
            {
                println!("cargo:rerun-if-changed={}", path.display());
            }
        }
        for name in ["CC", "AR", "CPPFLAGS", "CFLAGS", "LDFLAGS", "LDLIBS"] {
            println!("cargo:rerun-if-env-changed={name}");
        }
        assert!(
            std::process::Command::new("make")
                .arg("-C")
                .arg(&native)
                .arg(format!("BUILD_DIR={}", out.display()))
                .arg("all")
                .status()
                .expect("启动共用 C 核心 Make 构建失败")
                .success(),
            "共用 C 核心 Make 构建失败"
        );
        println!("cargo:rustc-link-search=native={}", out.display());
        println!("cargo:rustc-link-lib=static=agent_runtime");
        if target == "linux" {
            println!("cargo:rustc-link-lib=util");
        }
        let resources = std::path::Path::new("resources/native");
        std::fs::create_dir_all(resources).unwrap();
        for name in ["agent_worker", "process_launcher"] {
            std::fs::copy(out.join(name), resources.join(name)).unwrap();
        }
    }
    println!("cargo:rustc-env=AGENT_NATIVE_BIN={}", out.display());
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
        .type_attribute(
            "ExecutionTarget",
            "#[derive(serde::Serialize, serde::Deserialize)] #[serde(rename_all = \"camelCase\")]",
        )
        .type_attribute(
            "DesktopDevice",
            "#[derive(serde::Serialize, serde::Deserialize)] #[serde(rename_all = \"camelCase\")]",
        )
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
