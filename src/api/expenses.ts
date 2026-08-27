import { apiRequest } from './client'
import type { ExpenseOut, HouseholdSpendOut } from './types'

export interface ExpenseCreate {
  amount: number | string
  subcategory_id: string
  merchant?: string | null
  note?: string | null
  occurred_at?: string | null
  currency?: string
}

export function createExpense(familyId: string, data: ExpenseCreate) {
  return apiRequest<ExpenseOut>(`/api/families/${familyId}/expenses`, {
    method: 'POST',
    body: data,
  })
}

export function listExpenses(familyId: string, month: string) {
  return apiRequest<ExpenseOut[]>(
    `/api/families/${familyId}/expenses?month=${encodeURIComponent(month)}`,
  )
}

export function getSpend(familyId: string, months = 12) {
  return apiRequest<HouseholdSpendOut>(
    `/api/families/${familyId}/spend?months=${months}`,
  )
}

export function updateExpense(expenseId: string, data: Partial<ExpenseCreate>) {
  return apiRequest<ExpenseOut>(`/api/expenses/${expenseId}`, {
    method: 'PATCH',
    body: data,
  })
}

export function deleteExpense(expenseId: string) {
  return apiRequest<void>(`/api/expenses/${expenseId}`, { method: 'DELETE' })
}
