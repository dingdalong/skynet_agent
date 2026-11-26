import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Badge,
    Banner,
    Button,
    Card,
    Divider,
    Heading,
    HStack,
    Icon,
    MetadataList,
    MetadataListItem,
    Skeleton,
    StatusDot,
    Text,
    VStack,
    useToast,
} from "@astryxdesign/core";
import {
    CheckIcon,
    ClipboardDocumentIcon,
    SparklesIcon,
} from "@heroicons/react/24/outline";
import { request } from "@skynet/app-sdk";
import type { AppSnapshot } from "@skynet/contracts";
import {
    buildAboutAppRows,
    capabilitiesSummary,
    formatDiagnosticSummary,
    formatVersion,
    isolationLabel,
    platformLabel,
    type OnlineNode,
} from "./presentation";

export function About({
    snapshot,
    refreshToken,
    onLoadingChange,
}: {
    snapshot: Pick<AppSnapshot, "apps" | "about" | "capabilities">;
    refreshToken: number;
    onLoadingChange?: (loading: boolean) => void;
}) {
    const { about, apps, capabilities } = snapshot;
    const showToast = useToast();
    const [localRefresh, setLocalRefresh] = useState(0);
    const [online, setOnline] = useState<OnlineNode[]>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadedOnce = useRef(false);

    useEffect(
        () => () => {
            if (copyTimer.current) clearTimeout(copyTimer.current);
        },
        [],
    );

    const loadVersions = useCallback(
        (notifySuccess: boolean) => {
            let active = true;
            setLoading(true);
            onLoadingChange?.(true);
            setError("");
            void request("settings.onlineVersions").then(
                (result) => {
                    if (!active) return;
                    setOnline((result.online as unknown as OnlineNode[]) ?? []);
                    setLoading(false);
                    onLoadingChange?.(false);
                    if (notifySuccess && loadedOnce.current) {
                        showToast({
                            uniqueID: "settings-versions-refreshed",
                            body: "版本信息已刷新",
                            type: "info",
                            autoHideDuration: 2000,
                        });
                    }
                    loadedOnce.current = true;
                },
                (failure) => {
                    if (!active) return;
                    setError(
                        failure instanceof Error
                            ? failure.message
                            : String(failure),
                    );
                    setLoading(false);
                    onLoadingChange?.(false);
                },
            );
            return () => {
                active = false;
            };
        },
        [onLoadingChange, showToast],
    );

    useEffect(() => {
        return loadVersions(refreshToken > 0 || localRefresh > 0);
    }, [about?.catalogRevision, refreshToken, localRefresh, loadVersions]);

    const rows = useMemo(
        () =>
            buildAboutAppRows(
                apps,
                online,
                loading && online === undefined,
                Boolean(error),
            ),
        [apps, online, loading, error],
    );

    const handleCopyDiagnostics = async () => {
        const summary = formatDiagnosticSummary({ about, capabilities, rows });
        try {
            await navigator.clipboard.writeText(summary);
            setCopied(true);
            if (copyTimer.current) clearTimeout(copyTimer.current);
            copyTimer.current = setTimeout(() => setCopied(false), 1800);
            showToast({
                uniqueID: "settings-copy-diagnostics",
                body: "已复制版本与环境信息",
                type: "info",
                autoHideDuration: 2200,
            });
        } catch {
            showToast({
                uniqueID: "settings-copy-diagnostics-failed",
                body: "无法写入剪贴板，请手动复制",
                type: "error",
                autoHideDuration: 2800,
            });
        }
    };

    const clientVersion = formatVersion(about?.clientVersion, about?.build);
    const gatewayVersion = about?.gatewayVersion?.trim() || "未上报";

    return (
        <VStack gap={4} width="100%">
            <Card padding={4} width="100%">
                <VStack gap={4}>
                    <HStack
                        hAlign="between"
                        vAlign="center"
                        gap={3}
                        wrap="wrap"
                    >
                        <HStack gap={3} vAlign="center">
                            <Card
                                variant="muted"
                                padding={2}
                                aria-hidden="true"
                            >
                                <Icon icon={SparklesIcon} size="md" />
                            </Card>
                            <VStack gap={0.5}>
                                <HStack gap={2} vAlign="center" wrap="wrap">
                                    <Heading level={2}>Skynet Agent</Heading>
                                    <Badge
                                        variant="neutral"
                                        label={clientVersion}
                                    />
                                </HStack>
                                <Text
                                    type="supporting"
                                    size="sm"
                                    color="secondary"
                                >
                                    跨端智能体工作区宿主与运行时
                                </Text>
                            </VStack>
                        </HStack>
                        <Button
                            label={copied ? "已复制信息" : "复制诊断信息"}
                            variant="secondary"
                            size="sm"
                            icon={
                                <Icon
                                    icon={
                                        copied
                                            ? CheckIcon
                                            : ClipboardDocumentIcon
                                    }
                                    size="sm"
                                />
                            }
                            onClick={() => void handleCopyDiagnostics()}
                        />
                    </HStack>

                    <Divider />

                    <MetadataList>
                        <MetadataListItem label="宿主客户端">
                            <Text type="body" size="sm" hasTabularNumbers>
                                {clientVersion}
                            </Text>
                        </MetadataListItem>
                        <MetadataListItem label="Gateway 服务端">
                            <HStack gap={1.5} vAlign="center">
                                <StatusDot
                                    variant={
                                        about?.gatewayVersion?.trim()
                                            ? "success"
                                            : "neutral"
                                    }
                                    label={gatewayVersion}
                                />
                                <Text type="body" size="sm" hasTabularNumbers>
                                    {gatewayVersion}
                                </Text>
                            </HStack>
                        </MetadataListItem>
                        <MetadataListItem label="运行平台">
                            {platformLabel(capabilities?.platform)}
                        </MetadataListItem>
                        <MetadataListItem label="隔离模式">
                            {isolationLabel(capabilities?.runtimeIsolation)}
                        </MetadataListItem>
                        <MetadataListItem label="系统能力">
                            {capabilitiesSummary(capabilities)}
                        </MetadataListItem>
                    </MetadataList>
                </VStack>
            </Card>

            <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2}>
                <Heading level={2}>子应用版本</Heading>
                <Text
                    type="supporting"
                    size="sm"
                    color="secondary"
                    hasTabularNumbers
                >
                    共 {rows.length} 项
                </Text>
            </HStack>

            {error && (
                <Banner
                    status="error"
                    title="读取服务端版本失败"
                    description={error}
                    endContent={
                        <Button
                            label="重试"
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                                setLocalRefresh((value) => value + 1)
                            }
                        />
                    }
                />
            )}

            {loading && online === undefined && rows.length === 0 ? (
                <VStack gap={3} width="100%">
                    {[0, 1, 2].map((index) => (
                        <Card key={index} padding={4}>
                            <VStack gap={2}>
                                <Skeleton
                                    width="35%"
                                    height={20}
                                    radius={1}
                                    index={index}
                                />
                                <Skeleton
                                    width="70%"
                                    height={14}
                                    radius={1}
                                    index={index}
                                />
                            </VStack>
                        </Card>
                    ))}
                </VStack>
            ) : (
                <VStack gap={3} width="100%">
                    {rows.map((row) => (
                        <Card key={row.id} padding={4} width="100%">
                            <VStack gap={3}>
                                <HStack
                                    hAlign="between"
                                    vAlign="center"
                                    gap={2}
                                    wrap="wrap"
                                >
                                    <HStack gap={2} vAlign="center" wrap="wrap">
                                        <Heading level={3}>{row.name}</Heading>
                                        <Text
                                            type="supporting"
                                            size="sm"
                                            color="secondary"
                                        >
                                            {row.id}
                                        </Text>
                                    </HStack>
                                    <Badge
                                        variant={row.statusVariant}
                                        label={row.statusLabel}
                                    />
                                </HStack>
                                <MetadataList>
                                    <MetadataListItem label="客户端">
                                        <Text
                                            type="body"
                                            size="sm"
                                            hasTabularNumbers
                                        >
                                            {row.localVersion}
                                        </Text>
                                    </MetadataListItem>
                                    <MetadataListItem label="服务端">
                                        <Text
                                            type="body"
                                            size="sm"
                                            hasTabularNumbers
                                        >
                                            {row.serverVersion}
                                        </Text>
                                    </MetadataListItem>
                                </MetadataList>
                            </VStack>
                        </Card>
                    ))}
                </VStack>
            )}
        </VStack>
    );
}
