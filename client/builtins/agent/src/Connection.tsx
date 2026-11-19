import { useState } from "react";
import {
    Banner,
    Dialog,
    DialogHeader,
    Switch,
    Text,
    VStack,
} from "@astryxdesign/core";
import { request } from "@skynet/app-sdk";
import type { AgentState } from "@skynet/agent-client/types";

export function Connection({
    state,
    close,
}: {
    state: AgentState;
    close(): void;
}) {
    const [error, setError] = useState("");
    return (
        <Dialog
            isOpen
            purpose="form"
            onOpenChange={(open) => {
                if (!open) close();
            }}
        >
            <DialogHeader title="连接与设备" onOpenChange={close} />
            <VStack gap={3} padding={4}>
                <Text>{state.configuration.username}</Text>
                <Text>{state.configuration.url}</Text>
                {state.local && state.supportsLocal && (
                    <Switch
                        label="允许其他设备使用本机工作目录"
                        value={state.local.remoteEnabled}
                        onChange={(enabled) => {
                            void request("agent.remote.set", { enabled }).catch(
                                (err) => setError(String(err)),
                            );
                        }}
                    />
                )}
                {error && (
                    <Banner
                        status="error"
                        title="设备设置失败"
                        description={error}
                    />
                )}
            </VStack>
        </Dialog>
    );
}
