import {
    Component,
    useEffect,
    useEffectEvent,
    useLayoutEffect,
    useSyncExternalStore,
    type ErrorInfo,
    type ReactNode,
} from "react";
import {
    Button,
    Center,
    EmptyState,
    Icon,
    Theme,
    VStack,
} from "@astryxdesign/core";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { InternationalizationProvider } from "@astryxdesign/core/i18n";
import chinese from "@astryxdesign/core/locales/zh-CN.generated.js";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import "@astryxdesign/theme-neutral/theme.css";
import "./viewport.css";
import type { AppSnapshot, Json, PaneToolbarItem } from "@skynet/contracts";
import { getSnapshot, refreshSnapshot, request, subscribe } from "./bridge";

let presentationReady = false;
function revealPresentation() {
    if (presentationReady) return;
    let firstFrame = 0;
    let secondFrame = 0;
    const cleanup = () => {
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
        document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    const ready = () => {
        cleanup();
        if (presentationReady) return;
        presentationReady = true;
        void request("view.ready").catch(console.error);
    };
    function onVisibilityChange() {
        if (document.hidden) ready();
    }
    // Occluded/background WebViews suspend animation frames. Their committed UI
    // is already safe to reveal when the window becomes visible again.
    if (document.hidden) ready();
    else {
        document.addEventListener("visibilitychange", onVisibilityChange);
        firstFrame = requestAnimationFrame(() => {
            secondFrame = requestAnimationFrame(ready);
        });
    }
    return cleanup;
}

const messages = { "zh-CN": chinese };

export function usePaneToolbar(
    items: PaneToolbarItem[],
    activate: (id: string) => void,
) {
    const declaration = JSON.stringify(items);
    const onAction = useEffectEvent((event: Event) => {
        const { presentationId, id } = (event as CustomEvent).detail;
        if (presentationId !== window.__skynetPresentationId) return;
        if (
            items.some((item) =>
                item.choices
                    ? item.choices.some((choice) => choice.id === id)
                    : item.id === id,
            )
        )
            activate(id);
    });
    useEffect(() => {
        const listener = (event: Event) => onAction(event);
        window.addEventListener("skynet:toolbar", listener);
        return () => {
            window.removeEventListener("skynet:toolbar", listener);
            void request("view.toolbar", { items: [] }).catch(console.error);
        };
    }, []);
    useEffect(() => {
        void request("view.toolbar", { items: JSON.parse(declaration) }).catch(
            console.error,
        );
    }, [declaration]);
}

export function AppBoundary({ children }: { children: ReactNode }) {
    const snapshot = useSyncExternalStore(subscribe, getSnapshot);
    useLayoutEffect(() => {
        document.documentElement.dataset.reduceMotion = String(
            snapshot?.preferences.reduceMotion ?? false,
        );
    }, [snapshot?.preferences.reduceMotion]);
    return (
        <Theme
            theme={neutralTheme}
            mode={snapshot?.preferences.appearance ?? "system"}
        >
            <InternationalizationProvider locale="zh-CN" messages={messages}>
                <ViewBoundary>{children}</ViewBoundary>
            </InternationalizationProvider>
        </Theme>
    );
}

class ViewBoundary extends Component<
    { children: ReactNode },
    { error?: string }
> {
    state: { error?: string } = {};
    static getDerivedStateFromError(error: Error) {
        return { error: error.message };
    }
    componentDidCatch(error: Error, info: ErrorInfo) {
        revealPresentation();
        void request("view.error", {
            message: `${error.message}\n${info.componentStack ?? ""}`.slice(
                0,
                2048,
            ),
        }).catch(console.error);
    }
    render() {
        if (!this.state.error) return this.props.children;
        return (
            <VStack as="main" height="100dvh" width="100%">
                <Center axis="both" height="100%" padding={6}>
                    <EmptyState
                        icon={<Icon icon={ExclamationTriangleIcon} size="lg" />}
                        title="应用界面遇到问题"
                        description={this.state.error}
                        actions={
                            <Button
                                label="重新载入界面"
                                variant="primary"
                                onClick={() => location.reload()}
                            />
                        }
                    />
                </Center>
            </VStack>
        );
    }
}

export function useAppSnapshot<State = Json>(): AppSnapshot<State> | undefined {
    useEffect(() => {
        void refreshSnapshot().catch(console.error);
    }, []);
    const snapshot = useSyncExternalStore(subscribe, getSnapshot);
    const initialized =
        !!snapshot &&
        snapshot.apps.find((app) => app.id === snapshot.appId)?.status !==
            "starting";
    useEffect(() => {
        if (initialized) return revealPresentation();
    }, [initialized]);
    return snapshot as AppSnapshot<State> | undefined;
}
