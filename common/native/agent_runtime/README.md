# 共用工具核心

服务端 Lua 和桌面 Rust 通过 `agent_runtime.h` 使用同一套文件、补丁、沙盒和进程实现。
核心不持有用户、会话或连接状态；权限判断由云端执行器负责，工作区绑定由宿主负责。
每个进程句柄只能由一个调用方持有，跨线程访问需要宿主加锁。

构建需要 Make、C 编译器和静态库归档工具。服务端 `make native`、桌面 Cargo 构建会自动编译静态库及
`process_launcher`、`agent_worker`。macOS 使用 Seatbelt，Linux 运行时依赖 bubblewrap。
其他平台不编译本地执行模块，也不携带这两个辅助程序。

```sh
make -C common/native/agent_runtime
make -C common/native/agent_runtime test
make -C common/native/agent_runtime clean
```

默认产物放在模块的 `build/` 目录；`BUILD_DIR` 可指定其他输出目录，服务端和桌面使用各自的目录。
支持通过 `CC`、`AR`、`CPPFLAGS`、`CFLAGS`、`LDFLAGS`、`LDLIBS` 覆盖工具链和构建参数。

返回的字符串由 `ar_free` 释放；沙盒参数用 `ar_argv_free` 释放。
进程 I/O 为非阻塞访问。收到退出状态后仍应读取尾部数据，再调用 `ar_close` 回收句柄；
`ar_take_fds` 移交描述符所有权后，由宿主负责读写和关闭。
`ar_terminate` 关闭监督通道，启动辅助程序负责终止并回收进程组。
补丁先预检全部操作，再逐文件写入；失败返回已经完成的修改，不自动回滚。

C 模块、平台策略和辅助程序通过重新构建及重启更新，不参与 Lua 热更新。
