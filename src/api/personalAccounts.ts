import { apiRequest } from './client'
import type { PersonalAccountListOut, PersonalAccountOut } from './types'

export interface PersonalAccountCreate {
  name: string
  currency?: string
  timezone?: string | null
}

export function listAccounts(signal?: AbortSignal) {
  return apiRequest<PersonalAccountListOut>('/api/me/expense-accounts', { signal })
}

export function createAccount(data: PersonalAccountCreate) {
  return apiRequest<PersonalAccountOut>('/api/me/expense-accounts', {
    method: 'POST',
    body: data,
  })
}

export function updateAccount(accountId: string, data: Partial<PersonalAccountCreate>) {
  return apiRequest<PersonalAccountOut>(`/api/me/expense-accounts/${accountId}`, {
    method: 'PATCH',
    body: data,
  })
}

export function deleteAccount(accountId: string) {
  return apiRequest<void>(`/api/me/expense-accounts/${accountId}`, { method: 'DELETE' })
}
