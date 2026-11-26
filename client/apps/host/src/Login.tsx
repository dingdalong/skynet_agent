import { useRef, useState } from "react";
import {
    Banner,
    Button,
    Card,
    Center,
    FormLayout,
    Heading,
    HStack,
    Icon,
    Text,
    TextInput,
    VStack,
} from "@astryxdesign/core";
import { GlobeAltIcon, UserIcon } from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { validateLoginInput } from "../../../packages/workspace/src/presentation";

export function Login({
    login,
}: {
    login(url: string, username: string): Promise<void>;
}) {
    const [url, setUrl] = useState("ws://127.0.0.1:18787/agent");
    const [username, setUsername] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{
        url?: string;
        username?: string;
    }>({});
    const urlRef = useRef<HTMLInputElement>(null);
    const usernameRef = useRef<HTMLInputElement>(null);

    return (
        <VStack
            as="main"
            height="100dvh"
            width="100%"
            isScrollable
            style={{
                backgroundColor: "var(--color-background-body)",
                minHeight: 0,
            }}
        >
            <Center
                axis="both"
                width="100%"
                padding={6}
                style={{
                    flex: "1 0 auto",
                    paddingTop:
                        "max(var(--spacing-6), var(--window-controls-height, 0px))",
                }}
            >
                <VStack
                    gap={5}
                    hAlign="center"
                    width="100%"
                    style={{ maxWidth: 400 }}
                >
                    <VStack gap={2} hAlign="center">
                        <HStack
                            as="span"
                            width={48}
                            height={48}
                            align="center"
                            justify="center"
                            aria-hidden="true"
                            data-app-artwork="graphite"
                        >
                            <Icon
                                icon={SparklesIcon}
                                style={{ width: "56%", height: "56%" }}
                            />
                        </HStack>
                        <Text weight="bold" size="lg" justify="center">
                            Skynet Agent
                        </Text>
                    </VStack>
                    <Card padding={6} width="100%" elevation="low">
                        <VStack
                            as="form"
                            gap={4}
                            hAlign="stretch"
                            onSubmit={async (event) => {
                                event.preventDefault();
                                if (busy) return;
                                const check = validateLoginInput(url, username);
                                setFieldErrors(check.errors);
                                if (!check.valid) {
                                    if (check.errors.url)
                                        urlRef.current?.focus();
                                    else if (check.errors.username)
                                        usernameRef.current?.focus();
                                    return;
                                }
                                setBusy(true);
                                setError("");
                                try {
                                    await login(check.url, check.username);
                                } catch (failure) {
                                    setError(
                                        failure instanceof Error
                                            ? failure.message
                                            : String(failure),
                                    );
                                } finally {
                                    setBusy(false);
                                }
                            }}
                        >
                            <VStack gap={1} hAlign="center">
                                <Heading
                                    level={2}
                                    accessibilityLevel={1}
                                    justify="center"
                                >
                                    登录工作区
                                </Heading>
                                <Text
                                    color="secondary"
                                    size="sm"
                                    justify="center"
                                >
                                    连接受信任的服务器以进入工作空间
                                </Text>
                            </VStack>
                            {error && (
                                <Banner
                                    status="error"
                                    title="登录失败"
                                    description={error}
                                    container="card"
                                />
                            )}
                            <FormLayout defaultOptionality="required">
                                <TextInput
                                    ref={urlRef}
                                    label="服务器地址"
                                    id="gateway-url"
                                    htmlName="url"
                                    type="text"
                                    inputMode="url"
                                    size="lg"
                                    value={url}
                                    placeholder="ws://127.0.0.1:18787/agent"
                                    description="仅连接你信任的服务器，应用将使用该服务器上的用户身份。"
                                    startIcon={GlobeAltIcon}
                                    status={
                                        fieldErrors.url
                                            ? {
                                                  type: "error",
                                                  message: fieldErrors.url,
                                              }
                                            : undefined
                                    }
                                    onChange={(next) => {
                                        setUrl(next);
                                        if (fieldErrors.url)
                                            setFieldErrors((prev) => ({
                                                ...prev,
                                                url: undefined,
                                            }));
                                    }}
                                    autoCapitalize="none"
                                    hasAutoCorrect={false}
                                    hasSpellCheck={false}
                                />
                                <TextInput
                                    ref={usernameRef}
                                    label="用户名"
                                    id="gateway-username"
                                    htmlName="username"
                                    size="lg"
                                    value={username}
                                    placeholder="输入用户名"
                                    startIcon={UserIcon}
                                    status={
                                        fieldErrors.username
                                            ? {
                                                  type: "error",
                                                  message: fieldErrors.username,
                                              }
                                            : undefined
                                    }
                                    onChange={(next) => {
                                        setUsername(next);
                                        if (fieldErrors.username)
                                            setFieldErrors((prev) => ({
                                                ...prev,
                                                username: undefined,
                                            }));
                                    }}
                                    autoComplete="username"
                                    autoCapitalize="none"
                                    hasAutoCorrect={false}
                                    hasSpellCheck={false}
                                />
                            </FormLayout>
                            <Button
                                type="submit"
                                label={busy ? "正在连接…" : "登录"}
                                variant="primary"
                                size="lg"
                                width="100%"
                                isLoading={busy}
                            />
                        </VStack>
                    </Card>
                </VStack>
            </Center>
        </VStack>
    );
}
