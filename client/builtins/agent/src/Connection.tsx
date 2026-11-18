import { useState, type FormEvent } from "react";
import {
    Banner,
    Button,
    Dialog,
    DialogHeader,
    FormLayout,
    HStack,
    Layout,
    LayoutContent,
    LayoutFooter,
    Switch,
    TextInput,
    VStack,
} from "@astryxdesign/core";
import { app, request } from "@skynet/app-sdk";
import type { AgentState } from "@skynet/agent-client/types";
import manifest from "../manifest.json";

export function Connection({
    state,
    close,
}: {
    state: AgentState;
    close(): void;
}) {
    const [address, setAddress] = useState(state.configuration.url);
    const [username, setUsername] = useState(state.configuration.username);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    async function submit(event: FormEvent) {
        event.preventDefault();
        setError("");
        setBusy(true);
        try {
            const url = new URL(address).toString();
            const origins = [
                ...manifest.networkOrigins,
                ...(state.local?.origins ?? []),
            ];
            if (
                state.supportsLocal &&
                !origins.some(
                    (origin) => url === origin || url.startsWith(`${origin}/`),
                )
            ) {
                await request("agent.server.authorize", { url });
            }
            await app.command("connection.configure", { url, username });
            close();
        } catch (error) {
            setError(error instanceof Error ? error.message : String(error));
        } finally {
            setBusy(false);
        }
    }
    return (
        <Dialog
            isOpen
            onOpenChange={(open) => {
                if (!open) close();
            }}
            purpose="form"
        >
            <Layout
                height="auto"
                header={
                    <DialogHeader
                        title="连接 Agent 服务器"
                        onOpenChange={close}
                    />
                }
                content={
                    <LayoutContent>
                        <VStack
                            as="form"
                            id="agent-connection"
                            aria-label="服务器连接"
                            onSubmit={submit}
                        >
                            <FormLayout defaultOptionality="required">
                                <TextInput
                                    label="服务器地址"
                                    id="agent-url"
                                    type="url"
                                    htmlName="url"
                                    isRequired
                                    description="远程服务器使用 wss。首次连接新服务器时需要授权。"
                                    value={address}
                                    onChange={setAddress}
                                    autoCapitalize="none"
                                    hasAutoCorrect={false}
                                    hasSpellCheck={false}
                                />
                                <TextInput
                                    label="用户名"
                                    id="agent-username"
                                    htmlName="username"
                                    isRequired
                                    description="使用同一用户名可恢复服务器上的会话。"
                                    value={username}
                                    onChange={(value) =>
                                        setUsername(value.slice(0, 64))
                                    }
                                    autoComplete="username"
                                    autoCapitalize="none"
                                    hasAutoCorrect={false}
                                    hasSpellCheck={false}
                                />
                                {state.local && state.supportsLocal && (
                                    <Switch
                                        label="允许其他设备使用本机工作目录"
                                        description="关闭会停止远程执行。模型与工具结果仍经过服务器。"
                                        value={state.local.remoteEnabled}
                                        onChange={(enabled) => {
                                            void request("agent.remote.set", {
                                                enabled,
                                            }).catch((error: Error) =>
                                                setError(error.message),
                                            );
                                        }}
                                    />
                                )}
                                {error && (
                                    <Banner
                                        status="error"
                                        title="连接未完成"
                                        description={error}
                                    />
                                )}
                            </FormLayout>
                        </VStack>
                    </LayoutContent>
                }
                footer={
                    <LayoutFooter hasDivider>
                        <HStack gap={2} hAlign="end" wrap="wrap">
                            {state.configuration.enabled && (
                                <Button
                                    type="button"
                                    label="断开连接"
                                    variant="secondary"
                                    isDisabled={busy}
                                    onClick={() => {
                                        void app
                                            .command("connection.disconnect")
                                            .then(close)
                                            .catch((error: Error) =>
                                                setError(error.message),
                                            );
                                    }}
                                />
                            )}
                            <Button
                                type="submit"
                                form="agent-connection"
                                label="连接"
                                isLoading={busy}
                            />
                        </HStack>
                    </LayoutFooter>
                }
            />
        </Dialog>
    );
}
