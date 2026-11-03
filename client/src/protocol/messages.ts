import type { skynet } from './generated/agent_gateway.js'

export interface RequestPayloads {
  LoginReq: skynet.agent.v1.LoginReq.$Properties
  SessionCreateReq: skynet.agent.v1.SessionCreateReq.$Properties
  SessionSelectReq: skynet.agent.v1.SessionSelectReq.$Properties
  MessageSendReq: skynet.agent.v1.MessageSendReq.$Properties
  MessageCancelReq: skynet.agent.v1.MessageCancelReq.$Properties
}

export interface ServerMessagePayloads {
  LoginRes: skynet.agent.v1.LoginRes.$Properties
  SessionCreateRes: skynet.agent.v1.SessionCreateRes.$Properties
  SessionSelectRes: skynet.agent.v1.SessionSelectRes.$Properties
  MessageSendRes: skynet.agent.v1.MessageSendRes.$Properties
  MessageCancelRes: skynet.agent.v1.MessageCancelRes.$Properties
}

export type ServerMessage = {
  [Name in keyof ServerMessagePayloads]: {
    name: Name
    messageId: number
    payload: ServerMessagePayloads[Name]
  }
}[keyof ServerMessagePayloads]
