import { apiRequest } from './client'
import type { NotificationOut, NotificationPreferencesOut } from './types'

export function listNotifications() {
  return apiRequest<NotificationOut[]>('/api/notifications')
}

export function markNotificationRead(id: string) {
  return apiRequest<NotificationOut>(`/api/notifications/${id}/read`, { method: 'POST' })
}

export function markAllNotificationsRead() {
  return apiRequest<{ updated: number }>('/api/notifications/read-all', { method: 'POST' })
}

export function getNotificationPreferences() {
  return apiRequest<NotificationPreferencesOut>('/api/notification-preferences')
}

export function updateNotificationPreferences(
  patch: Partial<Omit<NotificationPreferencesOut, 'user_id'>>,
) {
  return apiRequest<NotificationPreferencesOut>('/api/notification-preferences', {
    method: 'PATCH',
    body: patch,
  })
}
