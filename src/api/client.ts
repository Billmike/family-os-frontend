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
