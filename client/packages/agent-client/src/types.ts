export interface ErrorInfo {
    message: string;
    retryable: boolean;
}
export interface ReasoningBlock {
    id: string;
    run_id: string;
    model_id: string;
    text: string;
    status: string;
}
export interface ToolCall {
    id: string;
    name: string;
    arguments: string;
    status: string;
    permission_reason: string;
    permission_mode: string;
    output: string;
    exit_code?: number;
    truncated: boolean;
    changed_files: string[];
    error: string;
    process_id: string;
    run_id: string;
    working_directory: string;
    reasoning: ReasoningBlock[];
}
export interface ChatMessage {
    id: string;
    role: number;
    content: string;
    created_at: number;
    status: number;
    run_id: string;
    error: ErrorInfo | null;
    ret: number;
    tool_calls: ToolCall[];
    reasoning: ReasoningBlock[];
}
export interface ChatSession {
    recovery_notice?: string;
    read_only?: boolean;
    needs_workspace?: boolean;
    session: {
        id: string;
        title: string;
        updated_at: number;
        revision: number;
        messages: ChatMessage[];
        run_id: string;
        cancelling: boolean;
    };
    model_id: string;
    permission_model_id: string;
    execution_target: {
        device_id: string;
        workspace_id: string;
        directory: string;
        platform: string;
    } | null;
}
export interface ModelOption {
    id: string;
    name: string;
    model: string;
}
export interface AgentSnapshot {
    user_id: string;
    username: string;
    chat_sessions: ChatSession[];
    models: ModelOption[];
    default_model_id: string;
    permission_model_id: string;
    desktops?: DesktopDevice[];
}
export interface ExecutionTarget {
    device_id: string;
    workspace_id: string;
    directory: string;
    platform: string;
}
export interface DesktopDevice {
    id: string;
    name: string;
    online: boolean;
    remote_enabled: boolean;
}
export interface LocalContext {
    canExecute?: boolean;
    deviceId: string;
    name: string;
    authorizationId: string;
    remoteEnabled: boolean;
    workspaces: ExecutionTarget[];
}
export interface PendingRequest {
    name: string;
    target: string;
    draftVersion: number;
    text: string;
    age: number;
}
export interface AgentState {
    version: 1;
    sequence: number;
    configuration: {
        url: string;
        username: string;
        userId: string;
        enabled: boolean;
    };
    connection: {
        status:
            | "offline"
            | "unavailable"
            | "connecting"
            | "restoring"
            | "online"
            | "retrying"
            | "error";
        epoch: number;
        id: string;
        key: string;
        attempt: number;
        nextId: number;
        opening: string;
        clock: string;
        clockMode: "watch" | "reconnect";
        pending: Record<string, PendingRequest>;
    };
    sessions: Record<string, ChatSession>;
    models: ModelOption[];
    defaultModelId: string;
    selectedId: string;
    drafts: Record<string, string>;
    draftVersion: number;
    buffered: import("./protocol").Packet[];
    syncing: boolean;
    error: string;
    notice: string;
    supportsLocal: boolean;
    local: LocalContext | null;
    localRequest: string;
    localEffects: Record<string, { epoch: number; requestId: string }>;
    draftTarget: ExecutionTarget | null;
    desktops: DesktopDevice[];
}
