export const MAX_MESSAGE_ID = 0xffffffff

export function isValidMessageId(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_MESSAGE_ID
  )
}

export function isValidWireMessageId(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_MESSAGE_ID
  )
}

export function nextMessageId(current: number): number | null {
  if (!isValidMessageId(current)) {
    throw new Error('当前 message_id 必须是 1 到 4294967295 之间的整数')
  }
  return current === MAX_MESSAGE_ID ? null : current + 1
}
