export type BinaryFrame = ArrayBuffer | ArrayBufferView

export interface BinaryChannel {
  open(onMessage: (frame: BinaryFrame) => void, onClose: (error: Error) => void): Promise<void>
  send(frame: Uint8Array): void
  close(): void
}

function validateUrl(value: string): string {
  const url = new URL(value)
  if (!['ws:', 'wss:'].includes(url.protocol)) {
    throw new Error('Agent WebSocket 只支持 ws:// 或 wss:// 地址')
  }
  if (
    url.protocol === 'ws:' &&
    !['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)
  ) {
    throw new Error('非回环 Agent WebSocket 必须使用 wss://')
  }
  return value
}

export class WebSocketChannel implements BinaryChannel {
  private current: { socket: WebSocket; reject: (error: Error) => void } | null = null
  private readonly url: string

  constructor(url = import.meta.env.VITE_AGENT_WS_URL ?? 'ws://127.0.0.1:18787/agent') {
    this.url = validateUrl(url)
  }

  open(onMessage: (frame: BinaryFrame) => void, onClose: (error: Error) => void): Promise<void> {
    this.close()
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url)
      socket.binaryType = 'arraybuffer'
      const session = { socket, reject }
      this.current = session
      const fail = (error: Error) => {
        if (this.current !== session) return
        this.current = null
        reject(error)
        socket.close()
        onClose(error)
      }
      socket.addEventListener('open', () => {
        if (this.current === session) resolve()
      })
      socket.addEventListener('message', (event) => {
        if (this.current !== session) return
        if (!(event.data instanceof ArrayBuffer) && !ArrayBuffer.isView(event.data)) {
          fail(new Error('服务端消息不是二进制 Protobuf'))
          return
        }
        onMessage(event.data)
      })
      socket.addEventListener('error', () => fail(new Error('Agent 连接发生错误')))
      socket.addEventListener('close', () => fail(new Error('与 Agent 的连接已断开')))
    })
  }

  send(frame: Uint8Array): void {
    if (this.current?.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Agent 尚未连接')
    }
    this.current.socket.send(frame)
  }

  close(): void {
    const current = this.current
    this.current = null
    if (current) {
      current.reject(new Error('Agent 连接已关闭'))
      current.socket.close()
    }
  }
}
