import { useState } from "react";
import { createRoot } from "react-dom/client";
import { app } from "@skynet/app-sdk";
import { AppBoundary, useAppSnapshot } from "@skynet/app-sdk/react";
import { Button } from "@skynet/ui/components/ui/button";
import type { State } from "./runtime";
import "@skynet/ui/styles.css";

function ConnectionFixture() {
    const snapshot = useAppSnapshot<State>();
    const [viewId] = useState(() => crypto.randomUUID());
    const state = snapshot?.state;
    return (
        <main className="flex flex-col gap-5 p-8">
            <h1>连接生命周期测试</h1>
            <p>界面实例：{viewId}</p>
            <p>原生连接：{state?.nativeId || "等待连接"}</p>
            <p>物理连接：{state?.serverId || "等待消息"}</p>
            <p>接收消息：{state?.received ?? 0}</p>
            {state?.error && <p role="alert">{state.error}</p>}
            <div className="flex gap-3">
                <Button onClick={() => void app.command("connect")}>
                    连接测试服务
                </Button>
                <Button
                    disabled={!state?.nativeId}
                    onClick={() => void app.command("ping")}
                >
                    发送测试消息
                </Button>
            </div>
        </main>
    );
}
createRoot(document.getElementById("root")!).render(
    <AppBoundary>
        <ConnectionFixture />
    </AppBoundary>,
);
