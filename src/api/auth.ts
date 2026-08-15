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

export function getMe() {
  return apiRequest<UserOut>('/api/auth/me')
}
