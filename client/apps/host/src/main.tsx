import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { Banner, Spinner, Theme } from "@astryxdesign/core";
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
function Shell() {
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [toolbars, setToolbars] = useState<Record<string, PaneToolbar>>({});
    const [error, setError] = useState("");
    useLayoutEffect(() => {
        const fail = (event: Event) =>
            setError((event as CustomEvent<string>).detail);
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
        window.addEventListener("workspace:error", fail);
        window.addEventListener("workspace:errors", surfaces);
        window.addEventListener("workspace:toolbars", controls);
        window.addEventListener("workspace:windowControls", windowControls);
        return () => {
            window.removeEventListener("workspace:error", fail);
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
            void post({
                kind: "layout",
                frames,
                revision: snapshot.revision,
                background,
                chrome: desktop
                    ? tokens.wallpapers[preferences.wallpaper][mode]
                    : [background],
                lightStatus: dark,
                menus: rects('[role="menu"]'),
                titlebars: rects('[role="toolbar"]:not([aria-label="Dock"])'),
                buttons: rects('[role="toolbar"] button'),
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
            sync();
        };
        const mutation = new MutationObserver(observe);
        mutation.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["data-app-slot", "style", "aria-expanded"],
        });
        observe();
        media.addEventListener("change", sync);
        return () => {
            observer.disconnect();
            mutation.disconnect();
            media.removeEventListener("change", sync);
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
                {error && (
                    <Banner
                        status="error"
                        title="工作区操作失败"
                        description={error}
                    />
                )}
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
                            setError("");
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
                            setError("");
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
                    <Spinner label="正在载入工作区" />
                )}
            </InternationalizationProvider>
        </Theme>
    );
}
createRoot(document.getElementById("root")!).render(<Shell />);
