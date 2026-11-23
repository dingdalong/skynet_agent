import { useEffect, useState } from "react";
import {
    Banner,
    Button,
    Heading,
    HStack,
    Text,
    VStack,
} from "@astryxdesign/core";
import { request } from "@skynet/app-sdk";
import type { AppSnapshot } from "@skynet/contracts";

interface OnlineNode {
    app_id: string;
    name: string;
    version: string;
}

function installedVersion(version?: string, build?: string) {
    return version ? version + (build ? "+" + build : "") : "未上报";
}

function VersionRow({ label, value }: { label: string; value: string }) {
    return (
        <HStack align="center" gap={2} wrap="wrap">
            <Text color="secondary">{label}</Text>
            <Text>{value}</Text>
        </HStack>
    );
}

export function About({
    snapshot,
}: {
    snapshot: Pick<AppSnapshot, "apps" | "about">;
}) {
    const { about, apps } = snapshot;
    const [refresh, setRefresh] = useState(0);
    const [online, setOnline] = useState<OnlineNode[]>();
    const [error, setError] = useState("");
    useEffect(() => {
        let active = true;
        setOnline(undefined);
        setError("");
        void request("settings.onlineVersions").then(
            (result) => {
                if (active) setOnline(result.online as unknown as OnlineNode[]);
            },
            (failure) => {
                if (active) setError(String(failure));
            },
        );
        return () => {
            active = false;
        };
    }, [about?.catalogRevision, refresh]);
    const servers = new Map(online?.map((node) => [node.app_id, node]));
    const installed = new Map(apps.map((entry) => [entry.id, entry]));
    const ids = [...new Set([...installed.keys(), ...servers.keys()])].sort();
    return (
        <VStack gap={4}>
            <VStack gap={1}>
                <Heading level={2}>Skynet Agent</Heading>
                <VersionRow
                    label="宿主客户端"
                    value={installedVersion(about?.clientVersion, about?.build)}
                />
                <VersionRow
                    label="Gateway 服务端"
                    value={about?.gatewayVersion || "未上报"}
                />
            </VStack>
            <HStack justify="between" align="center" wrap="wrap" gap={2}>
                <Heading level={2}>子应用</Heading>
                <Button
                    label="刷新版本"
                    variant="secondary"
                    onClick={() => setRefresh((value) => value + 1)}
                />
            </HStack>
            {error && (
                <Banner
                    status="error"
                    title="读取服务端版本失败"
                    description={error}
                />
            )}
            {ids.map((id) => {
                const local = installed.get(id);
                const server = servers.get(id);
                let status = server?.version || "未上报";
                if (!server && id === "settings") status = "仅本机";
                else if (!server && !online)
                    status = error ? "读取失败" : "正在读取…";
                else if (!server && online?.length) status = "未发现在线服务";
                return (
                    <VStack key={id} gap={1}>
                        <Heading level={3}>
                            {local?.name ?? server?.name}
                        </Heading>
                        <VersionRow
                            label="客户端"
                            value={
                                local
                                    ? installedVersion(
                                          local.version,
                                          local.build,
                                      )
                                    : "未安装"
                            }
                        />
                        <VersionRow label="服务端" value={status} />
                    </VStack>
                );
            })}
        </VStack>
    );
}
