import { apiRequest } from './client'
import type { DashboardOut } from './types'

export function getDashboard(familyId: string) {
  return apiRequest<DashboardOut>(`/api/families/${familyId}/dashboard`)
}
