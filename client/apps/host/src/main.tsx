import {
    useEffect,
    useLayoutEffect,
    useState,
    useSyncExternalStore,
} from "react";
import { createRoot } from "react-dom/client";
import {
    Center,
    LayerProvider,
    Spinner,
    Theme,
    useToast,
} from "@astryxdesign/core";
import { InternationalizationProvider } from "@astryxdesign/core/i18n";
import chinese from "@astryxdesign/core/locales/zh-CN.generated.js";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { createHostStore } from "../../../packages/host-bridge/src";
import { Workspace } from "../../../packages/workspace/src/Workspace";
import { Login } from "./Login";
import type { HostSnapshot, PaneToolbar } from "@skynet/contracts";
import { tokens, hostTheme } from "@skynet/tokens";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import "@astryxdesign/theme-neutral/theme.css";
import "../../../packages/tokens/theme.css";
import "../../../packages/app-sdk/src/viewport.css";

declare global {
    interface Window {
        webkit: {
            messageHandlers: {
                workspace: {
                    postMessage(value: unknown): Promise<HostSnapshot | null>;
                };
            };
        };
    }
}
const post = (value: unknown) =>
    window.webkit.messageHandlers.workspace.postMessage(value);
const overlaySelector =
    'dialog[open], [role="menu"], [data-toast-id], [data-workspace-overlay]';
const store = createHostStore({
    async command(name, input) {
        const next = await post({ kind: "command", name, input });
        if (!next) throw Error("工作区未响应");
        return next;
    },
    subscribe(accept) {
        const listener = (event: Event) =>
            accept((event as CustomEvent<HostSnapshot>).detail);
        window.addEventListener("workspace:snapshot", listener);
        void post({ kind: "initial" })
            .then((next) => next && accept(next))
            .catch(report);
        return () => window.removeEventListener("workspace:snapshot", listener);
    },
});
function report(error: unknown) {
    window.dispatchEvent(
        new CustomEvent("workspace:error", { detail: String(error) }),
    );
}
function ShellErrorToast() {
    const showToast = useToast();
    useEffect(() => {
        const fail = (event: Event) => {
            const detail = (event as CustomEvent<string>).detail;
            if (!detail) return;
            showToast({
                type: "error",
                body: `工作区操作失败：${detail}`,
                uniqueID: "workspace-error",
            });
        };
        window.addEventListener("workspace:error", fail);
        return () => window.removeEventListener("workspace:error", fail);
    }, [showToast]);
    return null;
}
function Shell() {
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [toolbars, setToolbars] = useState<Record<string, PaneToolbar>>({});
    useLayoutEffect(() => {
        const surfaces = (event: Event) =>
            setErrors((event as CustomEvent<Record<string, string>>).detail);
        const controls = (event: Event) =>
            setToolbars(
                (event as CustomEvent<Record<string, PaneToolbar>>).detail,
            );
        const windowControls = (event: Event) => {
            const { end, height } = (
                event as CustomEvent<{ end: number; height: number }>
            ).detail;
            document.documentElement.style.setProperty(
                "--window-controls-end",
                `${end}px`,
            );
            document.documentElement.style.setProperty(
                "--window-controls-height",
                `${height}px`,
            );
        };
        window.addEventListener("workspace:errors", surfaces);
        window.addEventListener("workspace:toolbars", controls);
        window.addEventListener("workspace:windowControls", windowControls);
        return () => {
            window.removeEventListener("workspace:errors", surfaces);
            window.removeEventListener("workspace:toolbars", controls);
            window.removeEventListener(
                "workspace:windowControls",
                windowControls,
            );
        };
    }, []);
    useLayoutEffect(() => {
        if (!snapshot) return;
        const preferences = snapshot.preferences;
        document.documentElement.dataset.reduceMotion = String(
            preferences.reduceMotion,
        );
        const media = matchMedia("(prefers-color-scheme: dark)");
        const sync = () => {
            const frames: Record<string, DOMRect> = {};
            for (const slot of document.querySelectorAll<HTMLElement>(
                "[data-app-slot]",
            ))
                frames[slot.dataset.appSlot!] = slot
                    .getBoundingClientRect()
                    .toJSON();
            const dark =
                preferences.appearance === "dark" ||
                (preferences.appearance === "system" && media.matches);
            const mode = dark ? "dark" : "light";
            const desktop = snapshot.workspace.mode !== "apps";
            const background = hostTheme[mode].background;
            const rects = (selector: string) =>
                Array.from(document.querySelectorAll(selector), (element) =>
                    element.getBoundingClientRect(),
                )
                    .filter((rect) => rect.width > 0 && rect.height > 0)
                    .map((rect) => rect.toJSON());
            const matchedOverlays = Array.from(
                document.querySelectorAll<HTMLElement>(overlaySelector),
            ).filter((element) => {
                const rect = element.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });
            const topOverlays = matchedOverlays.filter(
                (element) =>
                    !matchedOverlays.some(
                        (other) => other !== element && other.contains(element),
                    ),
            );
            const overlays = topOverlays.flatMap((element) => {
                const outer = element.getBoundingClientRect();
                const surface = element.matches("[data-toast-id]")
                    ? (element.querySelector<HTMLElement>(".astryx-toast") ??
                      element)
                    : element;
                const inner =
                    surface === element
                        ? outer
                        : surface.getBoundingClientRect();
                const x = Math.max(outer.x, inner.x);
                const y = Math.max(outer.y, inner.y);
                const width = Math.min(outer.right, inner.right) - x;
                const height = Math.min(outer.bottom, inner.bottom) - y;
                if (width <= 0 || height <= 0) return [];
                const radius =
                    parseFloat(getComputedStyle(surface).borderTopLeftRadius) ||
                    0;
                return [
                    {
                        x,
                        y,
                        width,
                        height,
                        radius,
                        capture: element.matches('dialog[open], [role="menu"]'),
                    },
                ];
            });
            const modal = topOverlays.some((element) =>
                element.matches("dialog[open]"),
            );
            void post({
                kind: "layout",
                frames,
                revision: snapshot.revision,
                background,
                chrome: desktop
                    ? tokens.wallpapers[preferences.wallpaper][mode]
                    : [background],
                lightStatus: dark,
                overlays,
                modal,
                titlebars: rects('[role="toolbar"]:not([aria-label="Dock"])'),
                buttons: rects(
                    '[role="toolbar"] :is(button, a, input, [role="button"])',
                ),
            }).catch(report);
        };
        const observer = new ResizeObserver(sync);
        const root = document.querySelector("#root")!;
        const observe = () => {
            observer.disconnect();
            observer.observe(root);
            root.querySelectorAll("[data-app-slot]").forEach((slot) =>
                observer.observe(slot),
            );
            document
                .querySelectorAll(overlaySelector)
                .forEach((overlay) => observer.observe(overlay));
            document
                .querySelectorAll("[data-toast-id] .astryx-toast")
                .forEach((toast) => observer.observe(toast));
            sync();
        };
        const mutation = new MutationObserver(observe);
        mutation.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: [
                "data-app-slot",
                "style",
                "aria-expanded",
                "open",
                "class",
                "data-toast-id",
                "data-workspace-overlay",
            ],
        });
        observe();
        media.addEventListener("change", sync);
        document.addEventListener("transitionend", sync, true);
        document.addEventListener("animationend", sync, true);
        return () => {
            observer.disconnect();
            mutation.disconnect();
            media.removeEventListener("change", sync);
            document.removeEventListener("transitionend", sync, true);
            document.removeEventListener("animationend", sync, true);
        };
    }, [snapshot]);
    return (
        <Theme
            theme={neutralTheme}
            mode={snapshot?.preferences.appearance ?? "system"}
        >
            <InternationalizationProvider
                locale="zh-CN"
                messages={{ "zh-CN": chinese }}
            >
                <LayerProvider toast={{ position: "bottomEnd", maxVisible: 3 }}>
                    <ShellErrorToast />
                    {snapshot && !snapshot.user ? (
                        <Login
                            login={(url, username) =>
                                store.command("login", { url, username })
                            }
                        />
                    ) : snapshot ? (
                        <Workspace
                            snapshot={snapshot}
                            errors={errors}
                            toolbars={toolbars}
                            activate={(appId, presentationId, action) => {
                                void post({
                                    kind: "toolbarAction",
                                    appId,
                                    presentationId,
                                    action,
                                }).catch(report);
                            }}
                            retry={(id) => {
                                void post({ kind: "retry", id }).catch(report);
                            }}
                            execute={(name, input) => {
                                return store.command(name, input).then(
                                    () => true,
                                    (error) => {
                                        report(error);
                                        return false;
                                    },
                                );
                            }}
                        />
                    ) : (
                        <Center height="100dvh">
                            <Spinner label="正在载入工作区" />
                        </Center>
                    )}
                </LayerProvider>
            </InternationalizationProvider>
        </Theme>
    );
}
createRoot(document.getElementById("root")!).render(<Shell />);
