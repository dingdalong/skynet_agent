import type { ChatMessage, ReasoningBlock } from '../types/chat'

export function appendReasoning(
  message: ChatMessage,
  toolId: string,
  delta: ReasoningBlock,
): boolean {
  const target = toolId ? message.toolCalls?.find((tool) => tool.id === toolId) : message
  if (!target) return false
  target.reasoning ??= []
  const previous = target.reasoning.find((block) => block.id === delta.id)
  if (previous) {
    previous.text += delta.text
    previous.status = delta.status
  } else target.reasoning.push({ ...delta })
  return true
}
