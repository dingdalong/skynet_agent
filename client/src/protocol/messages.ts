import type { skynet } from './generated/agent_gateway.js'

export interface RequestPayloads {
  SessionExecutionSetReq: skynet.agent.v1.SessionExecutionSetReq.$Properties
  SessionModelSetReq: skynet.agent.v1.SessionModelSetReq.$Properties
  LoginReq: skynet.agent.v1.LoginReq.$Properties
  UserSnapshotReq: skynet.agent.v1.UserSnapshotReq.$Properties
  ChatReq: skynet.agent.v1.ChatReq.$Properties
  MessageCancelReq: skynet.agent.v1.MessageCancelReq.$Properties
}

export interface ServerMessagePayloads {
  SessionExecutionSetRes: skynet.agent.v1.SessionExecutionSetRes.$Properties
  DesktopUpdatedNtf: skynet.agent.v1.DesktopUpdatedNtf.$Properties
  SessionModelSetRes: skynet.agent.v1.SessionModelSetRes.$Properties
  ReasoningDeltaNtf: skynet.agent.v1.ReasoningDeltaNtf.$Properties
  LoginRes: skynet.agent.v1.LoginRes.$Properties
  UserSnapshotRes: skynet.agent.v1.UserSnapshotRes.$Properties
  ChatRes: skynet.agent.v1.ChatRes.$Properties
  MessageCancelRes: skynet.agent.v1.MessageCancelRes.$Properties
  SessionUpdatedNtf: skynet.agent.v1.SessionUpdatedNtf.$Properties
  MessageDeltaNtf: skynet.agent.v1.MessageDeltaNtf.$Properties
  ToolUpdatedNtf: skynet.agent.v1.ToolUpdatedNtf.$Properties
}

export type ServerMessage = {
  [Name in keyof ServerMessagePayloads]: {
    name: Name
    messageId: number
    payload: ServerMessagePayloads[Name]
  }
}[keyof ServerMessagePayloads]
