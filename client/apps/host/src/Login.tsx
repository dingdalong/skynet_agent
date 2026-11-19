import { useState } from "react";
import {
    Banner,
    Button,
    Card,
    FormLayout,
    Heading,
    TextInput,
    VStack,
} from "@astryxdesign/core";

export function Login({
    login,
}: {
    login(url: string, username: string): Promise<void>;
}) {
    const [url, setUrl] = useState("ws://127.0.0.1:18787/agent");
    const [username, setUsername] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    return (
        <VStack as="main" padding={6} hAlign="center" vAlign="center">
            <Card padding={5}>
                <VStack
                    as="form"
                    gap={4}
                    onSubmit={async (event) => {
                        event.preventDefault();
                        if (busy) return;
                        setBusy(true);
                        setError("");
                        try {
                            await login(url.trim(), username.trim());
                        } catch (failure) {
                            setError(String(failure));
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    <Heading level={1}>登录工作区</Heading>
                    <FormLayout defaultOptionality="required">
                        <TextInput
                            label="服务器地址"
                            id="gateway-url"
                            htmlName="url"
                            type="url"
                            value={url}
                            description="请选择你信任的服务器。应用将使用此服务器上的用户身份。"
                            onChange={setUrl}
                            isRequired
                            autoCapitalize="none"
                            hasAutoCorrect={false}
                            hasSpellCheck={false}
                        />
                        <TextInput
                            label="用户名"
                            id="gateway-username"
                            htmlName="username"
                            value={username}
                            onChange={setUsername}
                            isRequired
                            autoComplete="username"
                            autoCapitalize="none"
                            hasAutoCorrect={false}
                            hasSpellCheck={false}
                        />
                    </FormLayout>
                    {error && (
                        <Banner
                            status="error"
                            title="登录失败"
                            description={error}
                        />
                    )}
                    <Button type="submit" label="登录" isLoading={busy} />
                </VStack>
            </Card>
        </VStack>
    );
}
