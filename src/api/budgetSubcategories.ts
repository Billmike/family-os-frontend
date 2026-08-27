import { apiRequest } from './client'
import type { BudgetSubcategoryListOut, BudgetSubcategoryOut } from './types'

export interface BudgetSubcategoryCreate {
  group: string
  name: string
  sort_order?: number | null
}

export interface BudgetSubcategoryUpdate {
  group?: string
  name?: string
  sort_order?: number | null
}

export function listBudgetSubcategories(familyId: string) {
  return apiRequest<BudgetSubcategoryListOut>(
    `/api/families/${familyId}/budget-subcategories`,
  )
}

export function createBudgetSubcategory(familyId: string, data: BudgetSubcategoryCreate) {
  return apiRequest<BudgetSubcategoryOut>(`/api/families/${familyId}/budget-subcategories`, {
    method: 'POST',
    body: data,
  })
}

export function updateBudgetSubcategory(subcategoryId: string, data: BudgetSubcategoryUpdate) {
  return apiRequest<BudgetSubcategoryOut>(`/api/budget-subcategories/${subcategoryId}`, {
    method: 'PATCH',
    body: data,
  })
}

export function archiveBudgetSubcategory(subcategoryId: string) {
  return apiRequest<void>(`/api/budget-subcategories/${subcategoryId}`, { method: 'DELETE' })
}
