const STORAGE_KEY = 'familyos_pending_invite_token'

const INVITE_PATH = /^\/invite\/([^/]+)\/?$/

/** Capture `/invite/:token` from the URL into sessionStorage and normalize to `/`. */
export function capturePendingInviteFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const match = window.location.pathname.match(INVITE_PATH)
  if (!match) return getPendingInviteToken()
  const token = decodeURIComponent(match[1]).trim()
  if (!token) return getPendingInviteToken()
  sessionStorage.setItem(STORAGE_KEY, token)
  const url = new URL(window.location.href)
  url.pathname = '/'
  url.search = ''
  url.hash = ''
  window.history.replaceState({}, '', url.pathname)
  return token
}

export function getPendingInviteToken(): string | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  const token = raw.trim()
  return token || null
}

export function clearPendingInviteToken(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(STORAGE_KEY)
}

/** Prefer path segment when the user pastes a full invite URL. */
export function normalizeInviteTokenInput(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    const url = new URL(trimmed)
    const match = url.pathname.match(INVITE_PATH)
    if (match) return decodeURIComponent(match[1]).trim()
  } catch {
    // not a URL — fall through
  }
  const pathMatch = trimmed.match(INVITE_PATH)
  if (pathMatch) return decodeURIComponent(pathMatch[1]).trim()
  const inviteIdx = trimmed.indexOf('/invite/')
  if (inviteIdx !== -1) {
    const rest = trimmed.slice(inviteIdx + '/invite/'.length).split(/[/?#]/)[0]
    if (rest) return decodeURIComponent(rest).trim()
  }
  return trimmed
}
