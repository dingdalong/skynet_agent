import type { AgentState, ChatMessage, ChatSession } from "./types";

export function isSending(state: AgentState, target: string): boolean {
    return Object.values(state.connection.pending).some(
        (request) => request.name === "ChatReq" && request.target === target,
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
