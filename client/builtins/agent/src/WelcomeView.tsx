import {
    Badge,
    Button,
    ClickableCard,
    EmptyState,
    Grid,
    Heading,
    HStack,
    Icon,
    StatusDot,
    Text,
    VStack,
} from "@astryxdesign/core";
import {
    BeakerIcon,
    BugAntIcon,
    SparklesIcon,
    Squares2X2Icon,
    WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import type { AgentState } from "@skynet/agent-client/types";
import {
    connectionStatusMeta,
    STARTER_PROMPTS,
    type StarterPrompt,
} from "./format";

const PROMPT_ICONS = {
    debug: BugAntIcon,
    architecture: Squares2X2Icon,
    test: BeakerIcon,
    refactor: WrenchScrewdriverIcon,
} as const;

export function WelcomeView({
    state,
    wide,
    onPickPrompt,
    onReconnect,
}: {
    state: AgentState;
    wide: boolean;
    onPickPrompt: (prompt: string) => void;
    onReconnect: () => void;
}) {
    const status = state.connection.status;
    const online = status === "online";
    const canReconnect = status === "offline" || status === "error";
    const connection = connectionStatusMeta(status, state.syncing);

    if (!online) {
        const title =
            status === "unavailable"
                ? "Agent 服务已下线"
                : status === "error"
                  ? "连接 Agent 失败"
                  : status === "retrying"
                    ? "正在重新连接 Agent"
                    : status === "offline"
                      ? "未连接到 Agent"
                      : "正在连接 Agent";
        return (
            <EmptyState
                isCompact={!wide}
                role="status"
                icon={
                    <StatusDot
                        variant={connection.dotVariant}
                        isPulsing={connection.pulsing}
                        label={connection.label}
                    />
                }
                title={title}
                description={connection.description}
                actions={
                    canReconnect ? (
                        <Button label="重新连接" onClick={onReconnect} />
                    ) : undefined
                }
            />
        );
    }

    const modelName = state.models.find(
        (model) => model.id === state.defaultModelId,
    )?.name;
    return (
        <VStack
            gap={wide ? 6 : 4}
            hAlign="center"
            width="100%"
            style={{ maxWidth: 680, marginInline: "auto" }}
            padding={wide ? 4 : 2}
        >
            <VStack gap={2} hAlign="center">
                <Icon icon={SparklesIcon} size="lg" color="accent" />
                <Heading level={2} justify="center">
                    与 Agent 开始一个新任务
                </Heading>
                <Text
                    type="body"
                    color="secondary"
                    justify="center"
                    className="agent-welcome-subtitle"
                >
                    选择下方快捷模板填入草稿，或直接在输入框中描述你的需求。
                </Text>
                <HStack
                    gap={1.5}
                    hAlign="center"
                    wrap="wrap"
                    className="agent-welcome-badges"
                >
                    {modelName && (
                        <Badge
                            variant="neutral"
                            label={`模型 · ${modelName}`}
                        />
                    )}
                </HStack>
            </VStack>

            <Grid
                className="agent-welcome-cards"
                columns={{ minWidth: 220, max: 2, repeat: "fit" }}
                gap={3}
                width="100%"
            >
                {STARTER_PROMPTS.map((item: StarterPrompt) => (
                    <ClickableCard
                        key={item.id}
                        label={item.title}
                        variant="muted"
                        padding={3}
                        onClick={() => onPickPrompt(item.prompt)}
                    >
                        <VStack gap={1.5}>
                            <HStack gap={2} vAlign="center">
                                <Icon
                                    icon={PROMPT_ICONS[item.icon]}
                                    size="sm"
                                    color="accent"
                                />
                                <Text type="label" weight="semibold">
                                    {item.title}
                                </Text>
                            </HStack>
                            <Text type="supporting" color="secondary">
                                {item.description}
                            </Text>
                        </VStack>
                    </ClickableCard>
                ))}
            </Grid>
        </VStack>
    );
}
