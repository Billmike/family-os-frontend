import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { addDays, EVENT_FETCH_AHEAD_DAYS, EVENT_FETCH_BACK_DAYS, toCalendarEvent, toNotification, toShoppingItem, toTask } from '../api/adapters'
import { ensureAccessToken, wsBase } from '../api/client'
import * as eventsApi from '../api/events'
import type { FamilyWsMessage } from '../api/types'
import type { CalendarEvent, Notification, ShoppingItem, Task } from '../types'

const PING_MS = 30_000
const BACKOFF_START_MS = 1_000
const BACKOFF_MAX_MS = 30_000

function upsertById<T extends { id: string }>(prev: T[], item: T): T[] {
  const idx = prev.findIndex(row => row.id === item.id)
  if (idx === -1) return [...prev, item]
  const next = [...prev]
  next[idx] = item
  return next
}

function prependNotification(prev: Notification[], item: Notification): Notification[] {
  if (prev.some(n => n.id === item.id)) {
    return prev.map(n => (n.id === item.id ? item : n))
  }
  return [item, ...prev]
}

export function useFamilyRealtime(opts: {
  familyId: string
  timeZone: string
  today: string
  loadAll: () => Promise<void>
  onMembershipRevoked?: () => void
  setEvents: Dispatch<SetStateAction<CalendarEvent[]>>
  setTasks: Dispatch<SetStateAction<Task[]>>
  setShopping: Dispatch<SetStateAction<ShoppingItem[]>>
  setNotifs: Dispatch<SetStateAction<Notification[]>>
}) {
  const { familyId, timeZone, today, loadAll, onMembershipRevoked, setEvents, setTasks, setShopping, setNotifs } = opts
  const loadAllRef = useRef(loadAll)
  const onMembershipRevokedRef = useRef(onMembershipRevoked)
  const timeZoneRef = useRef(timeZone)
  const todayRef = useRef(today)
  loadAllRef.current = loadAll
  onMembershipRevokedRef.current = onMembershipRevoked
  timeZoneRef.current = timeZone
  todayRef.current = today

  useEffect(() => {
    if (!familyId) return

    let closed = false
    let ws: WebSocket | null = null
    let pingTimer: ReturnType<typeof setInterval> | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let attempt = 0
    let openedOnce = false
    let forceRefreshNext = false
    let connectGeneration = 0

    function clearPing() {
      if (pingTimer) {
        clearInterval(pingTimer)
        pingTimer = null
      }
    }

    function clearReconnect() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    async function refetchEvents() {
      const from = `${addDays(todayRef.current, -EVENT_FETCH_BACK_DAYS)}T00:00:00Z`
      const to = `${addDays(todayRef.current, EVENT_FETCH_AHEAD_DAYS)}T23:59:59Z`
      const evs = await eventsApi.listEvents(familyId, from, to)
      setEvents(evs.map(e => toCalendarEvent(e, timeZoneRef.current)))
    }

    function applyMessage(msg: FamilyWsMessage) {
      if (msg.type === 'notification.created') {
        setNotifs(prev => prependNotification(prev, toNotification(msg.notification)))
        return
      }
      if (msg.type === 'event.deleted') {
        setEvents(prev => prev.filter(e => e.id !== msg.event_id))
        return
      }
      if (msg.type === 'task.deleted') {
        setTasks(prev => prev.filter(t => t.id !== msg.task_id))
        return
      }
      if (msg.type === 'shopping.item.updated' && 'deleted' in msg && msg.deleted) {
        setShopping(prev => prev.filter(i => i.id !== msg.item_id))
        return
      }
      if (msg.type === 'event.created' || msg.type === 'event.updated') {
        if (msg.event.recurrence_rule) {
          void refetchEvents().catch(() => {
            /* keep current calendar until the next catch-up */
          })
          return
        }
        const ui = toCalendarEvent(msg.event, timeZoneRef.current)
        setEvents(prev => upsertById(prev, ui))
        return
      }
      if (msg.type === 'task.created' || msg.type === 'task.updated') {
        const ui = toTask(msg.task, todayRef.current, timeZoneRef.current)
        setTasks(prev => upsertById(prev, ui))
        return
      }
      if (
        msg.type === 'shopping.item.created' ||
        msg.type === 'shopping.item.updated' ||
        msg.type === 'shopping.item.completed'
      ) {
        if (!('item' in msg) || !msg.item) return
        const ui = toShoppingItem(msg.item)
        setShopping(prev => upsertById(prev, ui))
      }
    }

    function scheduleReconnect() {
      if (closed || reconnectTimer) return
      const delay = Math.min(BACKOFF_START_MS * 2 ** attempt, BACKOFF_MAX_MS)
      attempt += 1
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        void connect()
      }, delay)
    }

    async function connect() {
      if (closed) return
      const generation = ++connectGeneration
      const forceRefresh = forceRefreshNext
      forceRefreshNext = false

      const token = await ensureAccessToken({ forceRefresh })
      if (closed || generation !== connectGeneration) return
      if (!token) {
        // Session cleared by auth failure — do not reconnect
        return
      }

      clearPing()
      if (ws) {
        ws.onopen = null
        ws.onmessage = null
        ws.onclose = null
        ws.onerror = null
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close()
        }
      }

      const url = `${wsBase()}/api/ws/families/${familyId}?token=${encodeURIComponent(token)}`
      const socket = new WebSocket(url)
      ws = socket
      let sawOpen = false

      socket.onopen = () => {
        if (closed || ws !== socket) return
        sawOpen = true
        attempt = 0
        forceRefreshNext = false
        pingTimer = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send('ping')
        }, PING_MS)
        if (openedOnce) {
          void loadAllRef.current()
        }
        openedOnce = true
      }

      socket.onmessage = ev => {
        try {
          applyMessage(JSON.parse(ev.data as string) as FamilyWsMessage)
        } catch {
          /* ignore malformed frames */
        }
      }

      socket.onerror = () => {
        /* onclose handles reconnect */
      }

      socket.onclose = (ev) => {
        clearPing()
        if (ws === socket) ws = null
        if (closed) return
        // 4403 = membership revoked (kicked / family deleted / left)
        if (ev.code === 4403) {
          closed = true
          onMembershipRevokedRef.current?.()
          return
        }
        if (!sawOpen) {
          // Handshake failed (e.g. expired/invalid token) — force refresh next connect
          forceRefreshNext = true
        }
        scheduleReconnect()
      }
    }

    function reconnectNow() {
      if (closed) return
      attempt = 0
      clearReconnect()
      if (ws && ws.readyState === WebSocket.OPEN) return
      void connect()
    }

    function onOnline() {
      reconnectNow()
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') reconnectNow()
    }

    void connect()
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      closed = true
      connectGeneration += 1
      clearPing()
      clearReconnect()
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisibility)
      if (ws) {
        ws.onopen = null
        ws.onmessage = null
        ws.onclose = null
        ws.onerror = null
        ws.close()
        ws = null
      }
    }
  }, [familyId, setEvents, setNotifs, setShopping, setTasks])
}
