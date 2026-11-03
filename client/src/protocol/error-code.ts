export const errorCode = {
  succ: 1,
  fail: 2,
  server_busy: 4,
  invalid_param: 12,
  call_fail: 17,
} as const

type ErrorInfoLike = {
  message?: string | null
}

export function formatResponseError(
  ret: number | null | undefined,
  error: ErrorInfoLike | null | undefined,
  fallback: string,
): string {
  const detail = error?.message?.trim() || fallback
  return `错误码 ${ret ?? 0}：${detail}`
}
