import {
    Badge,
    Card,
    Divider,
    Heading,
    HStack,
    Icon,
    List,
    ListItem,
    StatusDot,
    Switch,
    Text,
    VStack,
} from "@astryxdesign/core";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import {
    ChatBubbleLeftRightIcon,
    RectangleStackIcon,
    ViewColumnsIcon,
} from "@heroicons/react/24/outline";
import type { Preferences } from "@skynet/contracts";

const MOTION_SCOPES = [
    {
        id: "workspace",
        icon: ViewColumnsIcon,
        label: "工作区与分屏布局",
        description:
            "图标拖动排序、主屏幕与后台视图切换、分屏展开与收起改为即时或柔和过渡。",
    },
    {
        id: "overlays",
        icon: RectangleStackIcon,
        label: "侧栏、抽屉与命令面板",
        description:
            "减少侧栏折叠、详情抽屉滑入与快捷命令弹窗的位移和缩放动效。",
    },
    {
        id: "streaming",
        icon: ChatBubbleLeftRightIcon,
        label: "Agent 对话流式输出",
        description:
            "回复文本按更平稳的节奏直接呈现，降低连续滚动时的视觉跳动。",
    },
] as const;

export function MotionSection({
    preferences,
    busy,
    onChangeReduceMotion,
}: {
    preferences: Preferences;
    busy: boolean;
    onChangeReduceMotion: (reduceMotion: boolean) => void;
}) {
    const systemReduced = useMediaQuery("(prefers-reduced-motion: reduce)");
    const effectiveReduced = systemReduced || preferences.reduceMotion;

    return (
        <VStack gap={4} width="100%">
            <Card padding={4} width="100%">
                <VStack gap={4}>
                    <Switch
                        label="减少动态效果"
                        description="关闭缩放和位移动画。系统辅助功能设置始终优先。"
                        labelPosition="start"
                        labelSpacing="spread"
                        value={preferences.reduceMotion}
                        isDisabled={busy}
                        onChange={onChangeReduceMotion}
                    />
                    <Divider />
                    <HStack
                        hAlign="between"
                        vAlign="center"
                        gap={2}
                        wrap="wrap"
                    >
                        <HStack gap={2} vAlign="center">
                            <StatusDot
                                variant={
                                    effectiveReduced ? "success" : "neutral"
                                }
                                label={
                                    effectiveReduced
                                        ? "已减少动态效果"
                                        : "标准动态效果"
                                }
                            />
                            <Text type="supporting" size="sm" color="secondary">
                                {systemReduced
                                    ? "系统辅助功能已开启「减少动态效果」，当前始终生效。"
                                    : preferences.reduceMotion
                                      ? "当前已在应用内开启减少动态效果。"
                                      : "当前使用标准过渡动画与弹簧动效。"}
                            </Text>
                        </HStack>
                        <Badge
                            variant={
                                systemReduced
                                    ? "info"
                                    : preferences.reduceMotion
                                      ? "success"
                                      : "neutral"
                            }
                            label={
                                systemReduced
                                    ? "系统优先"
                                    : preferences.reduceMotion
                                      ? "已启用"
                                      : "标准"
                            }
                        />
                    </HStack>
                </VStack>
            </Card>

            <Card padding={4} width="100%">
                <VStack gap={3}>
                    <VStack gap={0.5}>
                        <Heading level={2}>生效范围</Heading>
                        <Text type="supporting" size="sm" color="secondary">
                            开启后仍保留清晰的活动面板标识与操作状态反馈。
                        </Text>
                    </VStack>
                    <List>
                        {MOTION_SCOPES.map((item) => (
                            <ListItem
                                key={item.id}
                                label={item.label}
                                description={item.description}
                                align="first-line"
                                startContent={
                                    <Icon
                                        icon={item.icon}
                                        size="sm"
                                        color="secondary"
                                    />
                                }
                            />
                        ))}
                    </List>
                </VStack>
            </Card>
        </VStack>
    );
}
