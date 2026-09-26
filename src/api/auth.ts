import { apiRequest } from './client'
import type { TokenPair, UserOut } from './types'

export function register(email: string, password: string, name: string) {
  return apiRequest<TokenPair>('/api/auth/register', {
    method: 'POST',
    auth: false,
    body: { email, password, name },
  })
}

export function login(email: string, password: string) {
  return apiRequest<TokenPair>('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  })
}

export function forgotPassword(email: string) {
  return apiRequest<Record<string, never>>('/api/auth/forgot-password', {
    method: 'POST',
    auth: false,
    body: { email },
  })
}

export function resetPassword(token: string, password: string) {
  return apiRequest<TokenPair>('/api/auth/reset-password', {
    method: 'POST',
    auth: false,
    body: { token, password },
  })
}

export function getMe() {
  return apiRequest<UserOut>('/api/auth/me')
}
