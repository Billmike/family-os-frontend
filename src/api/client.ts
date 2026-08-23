import type { ApiErrorBody, TokenPair } from './types'

export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8001'

export function wsBase(): string {
  const base = API_BASE.replace(/\/$/, '')
  if (base.startsWith('https://')) return base.replace(/^https/, 'wss')
  if (base.startsWith('http://')) return base.replace(/^http/, 'ws')
  return base
}

const ACCESS_KEY = 'familyos_access_token'
const REFRESH_KEY = 'familyos_refresh_token'
const FAMILY_KEY = 'familyos_family_id'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function getStoredFamilyId(): string | null {
  return localStorage.getItem(FAMILY_KEY)
}

export function setStoredFamilyId(id: string | null) {
  if (id) localStorage.setItem(FAMILY_KEY, id)
  else localStorage.removeItem(FAMILY_KEY)
}

export function storeTokens(tokens: TokenPair) {
  localStorage.setItem(ACCESS_KEY, tokens.access_token)
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export class ApiError extends Error {
  status: number
  code?: string
  body: ApiErrorBody

  constructor(status: number, body: ApiErrorBody) {
    const detail = body.detail
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map(d => d.msg).join(', ')
          : 'Request failed'
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.body = body
  }
}

type AuthListener = () => void
let onAuthFailure: AuthListener | null = null

export function setAuthFailureHandler(handler: AuthListener | null) {
  onAuthFailure = handler
}

let refreshPromise: Promise<TokenPair | null> | null = null

async function refreshTokens(): Promise<TokenPair | null> {
  const refresh = getRefreshToken()
  if (!refresh) return null
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    })
    if (!res.ok) {
      clearTokens()
      return null
    }
    const tokens = (await res.json()) as TokenPair
    storeTokens(tokens)
    return tokens
  } catch {
    clearTokens()
    return null
  }
}

function ensureRefresh(): Promise<TokenPair | null> {
  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

/** True if JWT is missing `exp`, malformed, or expires within `skewSeconds`. */
export function accessTokenExpired(token: string, skewSeconds = 30): boolean {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return true
    const payload = parts[1]
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
    const claims = JSON.parse(json) as { exp?: unknown }
    if (typeof claims.exp !== 'number') return true
    return claims.exp <= Date.now() / 1000 + skewSeconds
  } catch {
    return true
  }
}

/**
 * Return a usable access token, refreshing via the same single-flight path as REST.
 * On hard refresh failure, invokes the auth-failure handler (logout).
 */
export async function ensureAccessToken(options?: {
  forceRefresh?: boolean
}): Promise<string | null> {
  const forceRefresh = options?.forceRefresh ?? false
  const current = getAccessToken()
  if (!forceRefresh && current && !accessTokenExpired(current)) {
    return current
  }
  const refreshed = await ensureRefresh()
  if (!refreshed) {
    onAuthFailure?.()
    return null
  }
  return getAccessToken()
}

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  auth?: boolean
  /** Skip 401 refresh retry (used by refresh itself) */
  skipRefresh?: boolean
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, auth = true, skipRefresh = false, headers: extraHeaders, ...rest } = options

  const headers: Record<string, string> = {
    ...(extraHeaders as Record<string, string> | undefined),
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (auth) {
    const token = getAccessToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 && auth && !skipRefresh) {
    const refreshed = await ensureRefresh()
    if (refreshed) {
      return apiRequest<T>(path, { ...options, skipRefresh: true })
    }
    onAuthFailure?.()
    let errBody: ApiErrorBody = { detail: 'Session expired' }
    try {
      errBody = (await res.json()) as ApiErrorBody
    } catch {
      /* ignore */
    }
    throw new ApiError(401, errBody)
  }

  if (res.status === 204) {
    return undefined as T
  }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    if (!res.ok) throw new ApiError(res.status, { detail: res.statusText || 'Request failed' })
    return undefined as T
  }

  if (!res.ok) {
    throw new ApiError(res.status, data as ApiErrorBody)
  }

  return data as T
}

async function parseError(res: Response): Promise<ApiError> {
  let errBody: ApiErrorBody = { detail: res.statusText || 'Request failed' }
  try {
    errBody = (await res.json()) as ApiErrorBody
  } catch {
    /* ignore */
  }
  return new ApiError(res.status, errBody)
}

/** Multipart upload — do not set Content-Type (browser sets boundary). */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: { auth?: boolean; skipRefresh?: boolean } = {},
): Promise<T> {
  const { auth = true, skipRefresh = false } = options
  const headers: Record<string, string> = {}
  if (auth) {
    const token = getAccessToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (res.status === 401 && auth && !skipRefresh) {
    const refreshed = await ensureRefresh()
    if (refreshed) {
      return apiUpload<T>(path, formData, { ...options, skipRefresh: true })
    }
    onAuthFailure?.()
    throw await parseError(res)
  }

  if (!res.ok) {
    throw await parseError(res)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return (await res.json()) as T
}

/** Authenticated binary download (e.g. receipt images). */
export async function apiBlob(
  path: string,
  options: { auth?: boolean; skipRefresh?: boolean } = {},
): Promise<Blob> {
  const { auth = true, skipRefresh = false } = options
  const headers: Record<string, string> = {}
  if (auth) {
    const token = getAccessToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, { headers })

  if (res.status === 401 && auth && !skipRefresh) {
    const refreshed = await ensureRefresh()
    if (refreshed) {
      return apiBlob(path, { ...options, skipRefresh: true })
    }
    onAuthFailure?.()
    throw await parseError(res)
  }

  if (!res.ok) {
    throw await parseError(res)
  }

  return res.blob()
}
