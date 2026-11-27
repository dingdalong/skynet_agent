import type {
    AgentState,
    ChatMessage,
    ChatSession,
    ProjectSelection,
} from "./types";

export function isSending(state: AgentState, target: string): boolean {
    return Object.values(state.connection.pending).some(
        (request) =>
            request.name === "AgentChatReq" && request.target === target,
    );
}

export function latestAssistant(
    session?: ChatSession,
): ChatMessage | undefined {
    return session?.session.messages
        .slice()
        .reverse()
        .find((message) => message.role === 2);
}

export function projectPreferenceKey(state: AgentState): string {
    return JSON.stringify([
        state.configuration.url,
        state.configuration.userId,
    ]);
}

export function draftProject(state: AgentState): ProjectSelection {
    const selection = state.projectPreferences[projectPreferenceKey(state)];
    if (selection?.location === "cloud") {
        const cloudId = selection.cloudId ?? "";
        return {
            location: "cloud",
            id: state.cloudProjects.includes(cloudId) ? cloudId : "",
        };
    }
    if (state.supportsLocal) {
        const localId = selection?.localId ?? "";
        const available = state.local?.workspaces.find(
            (item) => item.workspace_id === localId,
        );
        return { location: "local", id: available?.workspace_id ?? "" };
    }
    const cloudId = selection?.cloudId ?? "";
    return {
        location: "cloud",
        id: state.cloudProjects.includes(cloudId) ? cloudId : "",
    };
}

export function creatingProject(state: AgentState): boolean {
    return Object.values(state.connection.pending).some(
        (request) => request.name === "AgentCloudProjectCreateReq",
    );
}

export function isLocalDirectoryUnavailable(
    state: AgentState,
    session?: ChatSession,
): boolean {
    const target = session?.execution_target;
    if (!target || !state.local || target.device_id !== state.local.deviceId)
        return false;
    return !state.local.workspaces.some(
        (item) =>
            item.workspace_id === target.workspace_id &&
            item.directory === target.directory,
    );
}
