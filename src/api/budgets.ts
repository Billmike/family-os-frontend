import { apiRequest } from './client'
import type { BudgetOut, BudgetPeriodListOut, BudgetPeriodOut } from './types'

export interface BudgetLineIn {
  category?: string | null
  amount: number | string
}

export interface BudgetPeriodCreate {
  start_date: string
  end_date: string
  label_month?: string | null
  currency?: string
  budgets?: BudgetLineIn[]
}

export interface BudgetPeriodUpdate {
  start_date?: string
  end_date?: string
  label_month?: string | null
  budgets?: BudgetLineIn[]
}

export function getCurrentBudgetPeriod(familyId: string) {
  return apiRequest<BudgetPeriodOut | null>(
    `/api/families/${familyId}/budget-periods/current`,
  )
}

export function listBudgetPeriods(familyId: string, include = 'current,past,upcoming') {
  return apiRequest<BudgetPeriodListOut>(
    `/api/families/${familyId}/budget-periods?include=${encodeURIComponent(include)}`,
  )
}

export function createBudgetPeriod(familyId: string, data: BudgetPeriodCreate) {
  return apiRequest<BudgetPeriodOut>(`/api/families/${familyId}/budget-periods`, {
    method: 'POST',
    body: data,
  })
}

export function updateBudgetPeriod(periodId: string, data: BudgetPeriodUpdate) {
  return apiRequest<BudgetPeriodOut>(`/api/budget-periods/${periodId}`, {
    method: 'PATCH',
    body: data,
  })
}

export function deleteBudgetPeriod(periodId: string) {
  return apiRequest<void>(`/api/budget-periods/${periodId}`, { method: 'DELETE' })
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
