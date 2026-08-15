import { API_BASE, getAccessToken } from '../../api/client'
import * as notificationsApi from '../../api/notifications'
import { isIos, isStandalone } from '../pwa/install'

const SUB_ID_KEY = 'familyos_push_subscription_id'

export type PushSubscribeResult =
  | 'subscribed'
  | 'unsupported'
  | 'ios_install_required'
  | 'denied'
  | 'unavailable'

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

export function iosInstallRequired(): boolean {
  return isIos() && !isStandalone()
}

export function getStoredSubscriptionId(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(SUB_ID_KEY)
}

export function isPushEnabledOnThisDevice(): boolean {
  if (!isPushSupported()) return false
  return Notification.permission === 'granted' && getStoredSubscriptionId() != null
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export async function subscribeThisDevice(): Promise<PushSubscribeResult> {
  if (iosInstallRequired()) return 'ios_install_required'
  if (!isPushSupported()) return 'unsupported'

  const { public_key } = await notificationsApi.getVapidPublicKey()
  if (!public_key) return 'unavailable'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(public_key),
    }))

  const json = subscription.toJSON()
  const endpoint = json.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!endpoint || !p256dh || !auth) return 'unavailable'

  const saved = await notificationsApi.subscribePush({
    endpoint,
    p256dh,
    auth,
    user_agent: navigator.userAgent,
  })
  localStorage.setItem(SUB_ID_KEY, saved.id)
  return 'subscribed'
}

export async function resubscribeIfGranted(): Promise<void> {
  if (iosInstallRequired() || !isPushSupported()) return
  if (Notification.permission !== 'granted') return
  try {
    await subscribeThisDevice()
  } catch {
    /* ignore rotation / network failures */
  }
}

export async function unsubscribeThisDevice(): Promise<void> {
  const id = typeof localStorage !== 'undefined' ? localStorage.getItem(SUB_ID_KEY) : null
  const token = getAccessToken()
  if (typeof localStorage !== 'undefined') localStorage.removeItem(SUB_ID_KEY)

  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      await sub?.unsubscribe()
    }
  } catch {
    /* ignore */
  }

  if (!id || !token) return
  try {
    await fetch(`${API_BASE}/api/push/subscribe/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    /* best-effort */
  }
}
