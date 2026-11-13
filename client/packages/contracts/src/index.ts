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
}

export interface AppSnapshot<State = Json> {
    appId: string;
    generation: number;
    revision: number;
    state: State;
    preferences: Preferences;
    apps: AppSummary[];
    error: string | null;
}

export interface Effect {
    id: string;
    kind: "socket.open" | "socket.send" | "socket.close" | "apps.call";
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
