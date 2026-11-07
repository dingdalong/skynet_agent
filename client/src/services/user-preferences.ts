const USERNAME_KEY = 'skynet.username'

export function normalizeUsername(value: string): string {
  const name = value.replace(/^[ \t\r\n\v\f]+|[ \t\r\n\v\f]+$/g, '')
  const characters = [...name]
  const invalid = characters.some((character) => {
    const code = character.codePointAt(0)!
    return code < 32 || code === 127 || (code >= 0xd800 && code <= 0xdfff)
  })
  if (!name || characters.length > 32 || invalid) {
    throw new Error('用户名须为 1–32 个字符，不能包含控制字符')
  }
  return name
}

export function readUsername(): string {
  try {
    return normalizeUsername(localStorage.getItem(USERNAME_KEY) ?? '')
  } catch {
    return ''
  }
}

export function saveUsername(username: string): void {
  try {
    if (username) localStorage.setItem(USERNAME_KEY, username)
    else localStorage.removeItem(USERNAME_KEY)
  } catch {
    /* 存储被禁用时，本次连接仍可正常使用。 */
  }
}

export function readSelectedSession(username: string): string {
  try {
    return sessionStorage.getItem(`skynet.session.${username}`) ?? ''
  } catch {
    return ''
  }
}

export function saveSelectedSession(username: string, sessionId: string): void {
  try {
    sessionStorage.setItem(`skynet.session.${username}`, sessionId)
  } catch {
    /* 使用内存选择。 */
  }
}
