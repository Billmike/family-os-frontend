import { apiRequest } from './client'
import type { ShoppingLocationOut } from './types'

export function listShoppingLocations(familyId: string) {
  return apiRequest<ShoppingLocationOut[]>(`/api/families/${familyId}/shopping-locations`)
}

export function createShoppingLocation(familyId: string, name: string) {
  return apiRequest<ShoppingLocationOut>(`/api/families/${familyId}/shopping-locations`, {
    method: 'POST',
    body: { name },
  })
}

export function updateShoppingLocation(
  locationId: string,
  data: { name?: string; sort_order?: number },
) {
  return apiRequest<ShoppingLocationOut>(`/api/shopping-locations/${locationId}`, {
    method: 'PATCH',
    body: data,
  })
}

export function deleteShoppingLocation(locationId: string) {
  return apiRequest<void>(`/api/shopping-locations/${locationId}`, { method: 'DELETE' })
}
