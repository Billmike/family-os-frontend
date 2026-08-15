import { apiRequest } from './client'
import type {
  NotificationOut,
  NotificationPreferencesOut,
  PushSubscriptionOut,
  VapidPublicKeyOut,
} from './types'

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

export function getVapidPublicKey() {
  return apiRequest<VapidPublicKeyOut>('/api/push/vapid-public-key')
}

export function subscribePush(data: {
  endpoint: string
  p256dh: string
  auth: string
  user_agent?: string
}) {
  return apiRequest<PushSubscriptionOut>('/api/push/subscribe', {
    method: 'POST',
    body: data,
  })
}

export function unsubscribePush(subscriptionId: string) {
  return apiRequest<void>(`/api/push/subscribe/${subscriptionId}`, { method: 'DELETE' })
}

export function sendTestPush() {
  return apiRequest<{ sent: number; subscriptions: number; error: string | null }>('/api/push/test', {
    method: 'POST',
  })
}
