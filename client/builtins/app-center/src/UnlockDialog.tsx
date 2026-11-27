import { useRef, useState } from "react";
import {
    Button,
    Dialog,
    DialogHeader,
    FormLayout,
    HStack,
    Layout,
    LayoutContent,
    LayoutFooter,
    TextInput,
    VStack,
} from "@astryxdesign/core";
import { KeyIcon } from "@heroicons/react/24/outline";
import { request } from "@skynet/app-sdk";
import { validateAdminToken } from "./presentation";

export function UnlockDialog({
    isOpen,
    onClose,
    onUnlocked,
}: {
    isOpen: boolean;
    onClose: () => void;
    onUnlocked: () => void;
}) {
    const [token, setToken] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    function dismiss() {
        if (busy) return;
        setToken("");
        setError("");
        onClose();
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (busy) return;
        const validationError = validateAdminToken(token);
        if (validationError) {
            setError(validationError);
            inputRef.current?.focus();
            return;
        }
        setBusy(true);
        setError("");
        try {
            await request("app-center.unlock", { token });
            setToken("");
            setBusy(false);
            onUnlocked();
        } catch (failure) {
            setError(
                failure instanceof Error ? failure.message : String(failure),
            );
            setBusy(false);
            inputRef.current?.focus();
        }
    }

    return (
        <Dialog
            isOpen={isOpen}
            width={420}
            purpose="form"
            onOpenChange={(open) => {
                if (!open) dismiss();
            }}
        >
            <Layout
                header={
                    <DialogHeader
                        title="管理员解锁"
                        subtitle="仅对当前会话连接生效，重新登录后需再次验证"
                        hasDivider
                        onOpenChange={dismiss}
                    />
                }
                content={
                    <LayoutContent>
                        <VStack
                            as="form"
                            id="app-center-unlock-form"
                            gap={0}
                            onSubmit={handleSubmit}
                        >
                            <FormLayout defaultOptionality="required">
                                <TextInput
                                    ref={inputRef}
                                    label="管理令牌"
                                    type="password"
                                    placeholder="输入服务器配置的管理令牌"
                                    startIcon={KeyIcon}
                                    value={token}
                                    hasAutoFocus
                                    description="解锁后可查看容器实例详情、审批上架或更新申请，并控制应用服务启停。"
                                    status={
                                        error
                                            ? { type: "error", message: error }
                                            : undefined
                                    }
                                    onChange={(value) => {
                                        setToken(value);
                                        if (error) setError("");
                                    }}
                                />
                            </FormLayout>
                        </VStack>
                    </LayoutContent>
                }
                footer={
                    <LayoutFooter hasDivider>
                        <HStack hAlign="end" gap={2}>
                            <Button
                                label="取消"
                                variant="secondary"
                                onClick={dismiss}
                                isDisabled={busy}
                            />
                            <Button
                                label="解锁"
                                variant="primary"
                                type="submit"
                                form="app-center-unlock-form"
                                isLoading={busy}
                            />
                        </HStack>
                    </LayoutFooter>
                }
            />
        </Dialog>
    );
}
