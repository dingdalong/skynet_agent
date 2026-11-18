import {
    Component,
    useEffect,
    useLayoutEffect,
    useSyncExternalStore,
    type ErrorInfo,
    type ReactNode,
} from "react";
import { Banner, Button, Theme, VStack } from "@astryxdesign/core";
import { InternationalizationProvider } from "@astryxdesign/core/i18n";
import chinese from "@astryxdesign/core/locales/zh-CN.generated.js";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import "@astryxdesign/theme-neutral/theme.css";
import "./viewport.css";
import type { AppSnapshot, Json } from "@skynet/contracts";
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
            <VStack as="main" padding={6} gap={4}>
                <Banner
                    status="error"
                    title="应用界面遇到问题"
                    description={this.state.error}
                />
                <Button
                    label="重新载入界面"
                    onClick={() => location.reload()}
                />
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
