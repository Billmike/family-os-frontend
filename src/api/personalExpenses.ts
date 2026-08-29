import { apiRequest } from './client'
import type { PersonalExpenseOut } from './types'

export interface PersonalExpenseCreate {
  amount: number | string
  category: string
  merchant?: string | null
  note?: string | null
  occurred_at?: string | null
  currency?: string
}

export function listPersonalExpenses(
  accountId: string,
  month: string,
  signal?: AbortSignal,
) {
  return apiRequest<PersonalExpenseOut[]>(
    `/api/me/expense-accounts/${accountId}/expenses?month=${encodeURIComponent(month)}`,
    { signal },
  )
}

export function createPersonalExpense(accountId: string, data: PersonalExpenseCreate) {
  return apiRequest<PersonalExpenseOut>(`/api/me/expense-accounts/${accountId}/expenses`, {
    method: 'POST',
    body: data,
  })
}

export function updatePersonalExpense(expenseId: string, data: Partial<PersonalExpenseCreate>) {
  return apiRequest<PersonalExpenseOut>(`/api/personal-expenses/${expenseId}`, {
    method: 'PATCH',
    body: data,
  })
}

export function deletePersonalExpense(expenseId: string) {
  return apiRequest<void>(`/api/personal-expenses/${expenseId}`, { method: 'DELETE' })
}
