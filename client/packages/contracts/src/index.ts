export type Json =
    null | boolean | number | string | Json[] | { [key: string]: Json };
export type Appearance = "system" | "light" | "dark";
export type Wallpaper = "coast" | "dusk" | "forest";

export interface Preferences {
    appearance: Appearance;
    wallpaper: Wallpaper;
    reduceMotion: boolean;
}

export interface AppSummary {
    id: string;
    name: string;
    version: string;
    builtin: boolean;
    permissions: string[];
    status: "stopped" | "starting" | "running" | "failed";
    error?: string;
    pid: number;
    actions: Record<string, { title: string; input: Json; output: Json }>;
}

export interface Workspace {
    mode: "desktop" | "apps" | "overview";
    panes: (string | null)[];
    ratio: number;
    recent: string[];
}

export interface HostSnapshot {
    revision: number;
    workspace: Workspace;
    preferences: Preferences;
    apps: AppSummary[];
    capabilities: HostCapabilities;
}

export type PaneToolbarItem = {
    id: string;
    label: string;
    selected?: boolean;
    choices?: { id: string; label: string; selected?: boolean }[];
};

export type PaneToolbar = {
    presentationId: string;
    items: PaneToolbarItem[];
};

export interface HostCapabilities {
    platform: "macos" | "ios" | "android" | "windows" | "linux" | "web";
    splitView: boolean;
    installApplications: boolean;
    localDevelopment: boolean;
    runtimeIsolation: "process" | "in-process" | "worker" | "remote";
}

export type WorkspaceCommandName =
    | "home"
    | "overview"
    | "open"
    | "restore"
    | "close"
    | "split"
    | "resize"
    | "collapse"
    | "restart";

export interface AppSnapshot<State = Json> {
    appId: string;
    generation: number;
    revision: number;
    state: State;
    preferences: Preferences;
    apps: AppSummary[];
    error: string | null;
    capabilities?: HostCapabilities;
}

export interface Effect {
    id: string;
    kind:
        | "socket.open"
        | "socket.send"
        | "socket.close"
        | "timer.wait"
        | "agent.context"
        | "agent.execute"
        | "apps.call";
    input: Record<string, Json>;
}

export interface Transition<State> {
    state: State;
    result?: Json;
    effects?: Effect[];
}

export interface Command {
    type: string;
    payload: Json;
}

export interface AppDefinition<State> {
    initialState(): State;
    /** Runs once per business process, never when a presentation subscribes. */
    start?(state: State): Transition<State>;
    reduce(state: State, command: Command): Transition<State>;
    actions?: Record<string, (state: State, input: Json) => Transition<State>>;
}

export interface Manifest {
    schemaVersion: 1;
    minimumHostVersion: 1;
    stateVersion: 1;
    id: string;
    name: string;
    version: string;
    permissions: string[];
    networkOrigins: string[];
    actions: Record<string, { title: string; input: Json; output: Json }>;
}
