import { apiRequest } from './client'
import type { BudgetListOut, BudgetOut } from './types'

export interface BudgetCreate {
  category?: string | null
  amount: number | string
  currency?: string
}

export function getBudgets(familyId: string, month?: string) {
  const query = month ? `?month=${encodeURIComponent(month)}` : ''
  return apiRequest<BudgetListOut>(`/api/families/${familyId}/budgets${query}`)
}

export function createBudget(familyId: string, data: BudgetCreate) {
  return apiRequest<BudgetOut>(`/api/families/${familyId}/budgets`, {
    method: 'POST',
    body: data,
  })
}

export function updateBudget(budgetId: string, amount: number | string) {
  return apiRequest<BudgetOut>(`/api/budgets/${budgetId}`, {
    method: 'PATCH',
    body: { amount },
  })
}

export function deleteBudget(budgetId: string) {
  return apiRequest<void>(`/api/budgets/${budgetId}`, { method: 'DELETE' })
}
