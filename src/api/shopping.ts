import { apiRequest } from './client'
import type { ShoppingItemOut, ShoppingListOut } from './types'

export function listShoppingLists(familyId: string) {
  return apiRequest<ShoppingListOut[]>(`/api/families/${familyId}/shopping-lists`)
}

export function createShoppingList(familyId: string, name: string) {
  return apiRequest<ShoppingListOut>(`/api/families/${familyId}/shopping-lists`, {
    method: 'POST',
    body: { name },
  })
}

export function listShoppingItems(listId: string) {
  return apiRequest<ShoppingItemOut[]>(`/api/shopping-lists/${listId}/items`)
}

export interface ShoppingItemCreate {
  name: string
  quantity?: number | string
  unit?: string | null
  category?: string | null
}

export function createShoppingItem(listId: string, data: ShoppingItemCreate) {
  return apiRequest<ShoppingItemOut>(`/api/shopping-lists/${listId}/items`, {
    method: 'POST',
    body: data,
  })
}

export function updateShoppingItem(
  itemId: string,
  data: Partial<ShoppingItemCreate> & { completed?: boolean },
) {
  return apiRequest<ShoppingItemOut>(`/api/shopping-items/${itemId}`, {
    method: 'PATCH',
    body: data,
  })
}

export function deleteShoppingItem(itemId: string) {
  return apiRequest<void>(`/api/shopping-items/${itemId}`, { method: 'DELETE' })
}
