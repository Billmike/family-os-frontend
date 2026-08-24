import { apiRequest } from './client'
import type { ShoppingSessionOut, ShoppingSpendOut } from './types'

export function getActiveSession(familyId: string) {
  return apiRequest<ShoppingSessionOut | null>(
    `/api/families/${familyId}/shopping-sessions/active`,
  )
}

export function addToBasket(familyId: string, itemId: string) {
  return apiRequest<{ session: ShoppingSessionOut; item: ShoppingSessionOut['items'][number] }>(
    `/api/families/${familyId}/shopping-sessions/active/items`,
    {
      method: 'POST',
      body: { item_id: itemId },
    },
  )
}

export function removeFromBasket(sessionItemId: string) {
  return apiRequest<{
    session_id: string
    item_id: string
    restored_item: import('./types').ShoppingItemOut | null
  }>(`/api/shopping-session-items/${sessionItemId}`, { method: 'DELETE' })
}

export function completeSession(familyId: string, totalCost: number | string) {
  return apiRequest<ShoppingSessionOut>(
    `/api/families/${familyId}/shopping-sessions/active/complete`,
    {
      method: 'POST',
      body: { total_cost: totalCost },
    },
  )
}

export function listSessions(
  familyId: string,
  params?: { limit?: number; offset?: number; month?: string },
) {
  const search = new URLSearchParams()
  if (params?.limit != null) search.set('limit', String(params.limit))
  if (params?.offset != null) search.set('offset', String(params.offset))
  if (params?.month) search.set('month', params.month)
  const qs = search.toString()
  return apiRequest<ShoppingSessionOut[]>(
    `/api/families/${familyId}/shopping-sessions${qs ? `?${qs}` : ''}`,
  )
}

export function getShoppingSpend(familyId: string, months = 12) {
  return apiRequest<ShoppingSpendOut>(
    `/api/families/${familyId}/shopping-spend?months=${months}`,
  )
}

export function getSession(sessionId: string) {
  return apiRequest<ShoppingSessionOut>(`/api/shopping-sessions/${sessionId}`)
}

export function reorderSession(familyId: string, sessionId: string) {
  return apiRequest<ShoppingSessionOut>(
    `/api/families/${familyId}/shopping-sessions/${sessionId}/reorder`,
    { method: 'POST' },
  )
}

export interface SessionItemUpdate {
  name?: string
  quantity?: number | string
  unit?: string | null
  category?: string | null
  location_id?: string | null
}

export function updateSessionItem(sessionItemId: string, data: SessionItemUpdate) {
  return apiRequest<ShoppingSessionOut['items'][number]>(
    `/api/shopping-session-items/${sessionItemId}`,
    {
      method: 'PATCH',
      body: data,
    },
  )
}
