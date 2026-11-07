import type { skynet } from './generated/agent_gateway.js'

export interface RequestPayloads {
  LoginReq: skynet.agent.v1.LoginReq.$Properties
  UserSnapshotReq: skynet.agent.v1.UserSnapshotReq.$Properties
  SessionCreateReq: skynet.agent.v1.SessionCreateReq.$Properties
  MessageSendReq: skynet.agent.v1.MessageSendReq.$Properties
  MessageCancelReq: skynet.agent.v1.MessageCancelReq.$Properties
}

export interface ServerMessagePayloads {
  LoginRes: skynet.agent.v1.LoginRes.$Properties
  UserSnapshotRes: skynet.agent.v1.UserSnapshotRes.$Properties
  SessionCreateRes: skynet.agent.v1.SessionCreateRes.$Properties
  MessageSendRes: skynet.agent.v1.MessageSendRes.$Properties
  MessageCancelRes: skynet.agent.v1.MessageCancelRes.$Properties
  SessionUpdatedNtf: skynet.agent.v1.SessionUpdatedNtf.$Properties
  MessageDeltaNtf: skynet.agent.v1.MessageDeltaNtf.$Properties
}

export type ServerMessage = {
  [Name in keyof ServerMessagePayloads]: {
    name: Name
    messageId: number
    payload: ServerMessagePayloads[Name]
  }
}[keyof ServerMessagePayloads]
