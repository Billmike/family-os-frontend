/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA deep links: serve index.html for navigations to /tasks, /calendar, etc.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api\//, /^\/assets\//],
  }),
)

void self.skipWaiting()
clientsClaim()

const TYPE_TO_URL: Record<string, string> = {
  calendar: '/calendar',
  task: '/tasks',
  shopping: '/shopping',
  family: '/notifications',
}

interface PushPayload {
  title?: string
  body?: string
  type?: string
  url?: string
  notification_id?: string
  entity_type?: string
  entity_id?: string
}

self.addEventListener('push', event => {
  let payload: PushPayload = {}
  try {
    payload = event.data ? (event.data.json() as PushPayload) : {}
  } catch {
    payload = { title: 'FamilyOS', body: event.data?.text() }
  }
  const title = payload.title || 'FamilyOS'
  const url = payload.url || TYPE_TO_URL[payload.type ?? ''] || '/'
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clients) {
        client.postMessage({ type: 'notification.push', notification: payload })
      }
      await self.registration.showNotification(title, {
        body: payload.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { ...payload, url },
      })
    })(),
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = (event.notification.data?.url as string | undefined) || '/'
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = windows.find(client => 'focus' in client) as WindowClient | undefined
      if (existing) {
        await existing.focus()
        if ('navigate' in existing) await existing.navigate(url)
        return
      }
      await self.clients.openWindow(url)
    })(),
  )
})
