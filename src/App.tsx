import { useCallback, useEffect, useRef, useState } from 'react'
import { Home, Calendar, CheckSquare, ShoppingCart, Bell, ArrowLeft, Settings, Repeat } from 'lucide-react'
import type { Screen, CalendarEvent, Task, ShoppingItem, Notification, BottomSheetType, Member } from './types'
import { getMember, formatDate, formatTime } from './data'
import { t, MemberAvatar, BottomSheet, Toast, OfflineBanner, FormField, Input, Select, PrimaryButton, SegmentedControl } from './ui'
import Dashboard from './screens/Dashboard'
import CalendarScreen from './screens/Calendar'
import TasksScreen from './screens/Tasks'
import ShoppingScreen from './screens/Shopping'
import NotificationsScreen from './screens/Notifications'
import FamilyScreen from './screens/Family'
import SettingsScreen from './screens/Settings'
import Onboarding from './screens/Onboarding'
import { SessionProvider, useSession } from './auth/session'
import { ApiError, getAccessToken, wsBase } from './api/client'
import {
  addDays,
  dueDateToIso,
  formatLongDate,
  localDateTimeToIso,
  priorityToApi,
  toCalendarEvent,
  toNotification,
  toShoppingItem,
  toTask,
  todayInTimezone,
} from './api/adapters'
import * as dashboardApi from './api/dashboard'
import * as eventsApi from './api/events'
import * as tasksApi from './api/tasks'
import * as shoppingApi from './api/shopping'
import * as notificationsApi from './api/notifications'
import * as familiesApi from './api/families'
import type { ShoppingWsMessage } from './api/types'
import {
  capturePendingInviteFromUrl,
  clearPendingInviteToken,
  getPendingInviteToken,
} from './invite/pendingInvite'

const BOTTOM_NAV = [
  { screen: 'dashboard' as Screen, icon: Home, label: 'Home' },
  { screen: 'calendar' as Screen, icon: Calendar, label: 'Calendar' },
  { screen: 'tasks' as Screen, icon: CheckSquare, label: 'Tasks' },
  { screen: 'shopping' as Screen, icon: ShoppingCart, label: 'Shopping' },
]

const SCREEN_TITLES: Record<Screen, string> = {
  dashboard: 'FamilyOS',
  calendar: 'Calendar',
  tasks: 'Tasks',
  shopping: 'Shopping',
  notifications: 'Notifications',
  family: 'Your Family',
  settings: 'Settings',
}

export default function App() {
  return (
    <SessionProvider>
      <AppRoot />
    </SessionProvider>
  )
}

function AppRoot() {
  const session = useSession()
  const [setupPending, setSetupPending] = useState(false)
  const [inviteBusy, setInviteBusy] = useState(false)
  const inviteAcceptRef = useRef(false)

  // Synchronous so onboarding initial state sees the token on first paint
  capturePendingInviteFromUrl()

  // Signed-in user already in a family who opens /invite/:token
  useEffect(() => {
    if (session.status !== 'ready') return
    const token = getPendingInviteToken()
    if (!token || inviteAcceptRef.current) return
    inviteAcceptRef.current = true
    setInviteBusy(true)
    void (async () => {
      try {
        const result = await familiesApi.acceptInvitation(token)
        clearPendingInviteToken()
        await session.selectFamily(result.family.id)
      } catch {
        clearPendingInviteToken()
        inviteAcceptRef.current = false
      } finally {
        setInviteBusy(false)
      }
    })()
  }, [session.status, session.selectFamily])

  if (session.status === 'loading' || inviteBusy) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bg, color: t.textSec, fontFamily: 'var(--ds-font)' }}>
        {inviteBusy ? 'Joining family…' : 'Loading…'}
      </div>
    )
  }

  const showOnboarding =
    session.status === 'unauthenticated' ||
    session.status === 'needs_family' ||
    setupPending

  if (showOnboarding) {
    return (
      <Onboarding
        handlers={{
          register: async (email, password, name) => {
            setSetupPending(true)
            await session.register(email, password, name)
          },
          login: async (email, password) => {
            await session.login(email, password)
            setSetupPending(false)
          },
          needsFamily: session.status === 'needs_family' || setupPending,
          userName: session.user?.name,
          onFamilyCreated: async fam => {
            setSetupPending(true)
            await session.setFamilyFromCreate(fam)
          },
          onJoinedFamily: async familyId => {
            await session.selectFamily(familyId)
            setSetupPending(false)
          },
          onEnterApp: () => {
            setSetupPending(false)
          },
        }}
      />
    )
  }

  return <MainApp />
}

function MainApp() {
  const session = useSession()
  const family = session.family!
  const timeZone = family.timezone || 'UTC'
  const members = session.members
  const currentUser = session.currentMember ?? members[0]
  const today = todayInTimezone(timeZone)

  const [screen, setScreen] = useState<Screen>('dashboard')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [shopping, setShopping] = useState<ShoppingItem[]>([])
  const [shoppingListId, setShoppingListId] = useState<string | null>(null)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [dashGreeting, setDashGreeting] = useState(session.user?.name ?? '')
  const [dashDateLabel, setDashDateLabel] = useState(formatLongDate(today))
  const [familyName, setFamilyName] = useState(family.name)
  const [loading, setLoading] = useState(true)
  const [sheet, setSheet] = useState<BottomSheetType | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const unreadCount = notifs.filter(n => !n.read).length

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  function handleError(e: unknown, fallback = 'Something went wrong') {
    const msg = e instanceof ApiError ? e.message : fallback
    showToast(msg, 'error')
  }

  const loadAll = useCallback(async () => {
    const familyId = family.id
    try {
      const from = `${addDays(today, -1)}T00:00:00Z`
      const to = `${addDays(today, 14)}T23:59:59Z`

      const [dash, evs, tsks, lists, ns] = await Promise.all([
        dashboardApi.getDashboard(familyId),
        eventsApi.listEvents(familyId, from, to),
        tasksApi.listTasks(familyId, 'all'),
        shoppingApi.listShoppingLists(familyId),
        notificationsApi.listNotifications(),
      ])

      setFamilyName(dash.family_name)
      setDashGreeting(dash.member_name)
      setDashDateLabel(formatLongDate(dash.date))

      setEvents(evs.map(e => toCalendarEvent(e, timeZone)))
      setTasks(tsks.map(tk => toTask(tk, dash.date, timeZone)))
      setNotifs(ns.map(toNotification))

      const groceries =
        lists.find(l => l.name.toLowerCase() === 'groceries') ?? lists[0] ?? null
      if (groceries) {
        setShoppingListId(groceries.id)
        const items = await shoppingApi.listShoppingItems(groceries.id)
        setShopping(items.map(toShoppingItem))
      } else {
        setShoppingListId(null)
        setShopping([])
      }
    } catch (e) {
      handleError(e, 'Failed to load family data')
    } finally {
      setLoading(false)
    }
  }, [family.id, timeZone, today])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  useEffect(() => {
    const on = () => setIsOffline(false)
    const off = () => setIsOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    const token = getAccessToken()
    if (!token || !family.id) return
    const url = `${wsBase()}/api/ws/families/${family.id}?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(url)
    ws.onmessage = ev => {
      try {
        const msg = JSON.parse(ev.data as string) as ShoppingWsMessage
        if ('deleted' in msg && msg.deleted) {
          setShopping(prev => prev.filter(i => i.id !== msg.item_id))
          return
        }
        if ('item' in msg && msg.item) {
          const ui = toShoppingItem(msg.item)
          setShopping(prev => {
            const idx = prev.findIndex(i => i.id === ui.id)
            if (idx === -1) return [...prev, ui]
            const next = [...prev]
            next[idx] = ui
            return next
          })
        }
      } catch {
        /* ignore */
      }
    }
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('ping')
    }, 30000)
    return () => {
      clearInterval(ping)
      ws.close()
    }
  }, [family.id])

  async function completeTask(id: string) {
    const task = tasks.find(tk => tk.id === id)
    try {
      if (task?.completed) {
        await tasksApi.updateTask(id, { completed_at: null })
        setTasks(ts => ts.map(tk => (tk.id === id ? { ...tk, completed: false } : tk)))
        showToast('Task reopened')
      } else {
        await tasksApi.completeTask(id)
        const all = await tasksApi.listTasks(family.id, 'all')
        setTasks(all.map(tk => toTask(tk, today, timeZone)))
        showToast('Task completed')
      }
    } catch (e) {
      handleError(e)
    }
  }

  async function deleteTask(id: string) {
    try {
      await tasksApi.deleteTask(id)
      setTasks(ts => ts.filter(tk => tk.id !== id))
      showToast('Task deleted')
    } catch (e) {
      handleError(e)
    }
  }

  async function addTask(task: Omit<Task, 'id' | 'completed'>) {
    try {
      const created = await tasksApi.createTask(family.id, {
        title: task.title,
        category: task.category,
        priority: priorityToApi(task.priority),
        assignee_ids: task.assigneeId ? [task.assigneeId] : [],
        due_at: dueDateToIso(task.dueDate, today, timeZone),
        recurrence_rule: task.recurring ? 'weekly' : null,
      })
      setTasks(ts => [toTask(created, today, timeZone), ...ts])
      setSheet(null)
      showToast('Task created')
    } catch (e) {
      handleError(e)
    }
  }

  async function completeShoppingItem(id: string) {
    const item = shopping.find(i => i.id === id)
    if (!item) return
    try {
      const updated = await shoppingApi.updateShoppingItem(id, { completed: !item.completed })
      setShopping(its => its.map(i => (i.id === id ? toShoppingItem(updated) : i)))
    } catch (e) {
      handleError(e)
    }
  }

  async function addShoppingItem(item: Omit<ShoppingItem, 'id' | 'completed' | 'addedById'>) {
    let listId = shoppingListId
    try {
      if (!listId) {
        const lists = await shoppingApi.listShoppingLists(family.id)
        const groceries = lists.find(l => l.name.toLowerCase() === 'groceries') ?? lists[0]
        if (groceries) {
          listId = groceries.id
          setShoppingListId(listId)
        } else {
          const created = await shoppingApi.createShoppingList(family.id, 'Groceries')
          listId = created.id
          setShoppingListId(listId)
        }
      }
      const created = await shoppingApi.createShoppingItem(listId!, {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
      })
      setShopping(its => {
        if (its.some(i => i.id === created.id)) return its
        return [...its, toShoppingItem(created)]
      })
      showToast('Item added')
    } catch (e) {
      handleError(e)
    }
  }

  async function addEvent(event: Omit<CalendarEvent, 'id'>) {
    try {
      const starts = localDateTimeToIso(event.date, event.startTime, timeZone)
      const ends = event.endTime
        ? localDateTimeToIso(event.date, event.endTime, timeZone)
        : null
      const created = await eventsApi.createEvent(family.id, {
        title: event.title,
        location: event.location ?? null,
        starts_at: starts,
        ends_at: ends,
        member_ids: event.memberId ? [event.memberId] : [],
      })
      setEvents(es => [...es, toCalendarEvent(created, timeZone)])
      setSheet(null)
      showToast('Event created')
    } catch (e) {
      handleError(e)
    }
  }

  async function deleteEvent(id: string) {
    try {
      await eventsApi.deleteEvent(id)
      setEvents(es => es.filter(e => e.id !== id))
      setSheet(null)
      showToast('Event deleted')
    } catch (e) {
      handleError(e)
    }
  }

  async function markNotificationRead(id: string) {
    try {
      await notificationsApi.markNotificationRead(id)
      setNotifs(ns => ns.map(n => (n.id === id ? { ...n, read: true } : n)))
    } catch (e) {
      handleError(e)
    }
  }

  async function markAllNotificationsRead() {
    try {
      await notificationsApi.markAllNotificationsRead()
      setNotifs(ns => ns.map(n => ({ ...n, read: true })))
    } catch (e) {
      handleError(e)
    }
  }

  async function renameFamily(name: string) {
    try {
      const updated = await familiesApi.updateFamily(family.id, { name })
      setFamilyName(updated.name)
      await session.refreshFamily()
      showToast('Family name updated')
    } catch (e) {
      handleError(e)
    }
  }

  async function inviteMember(email: string): Promise<{ invite_url: string; invite_token: string } | null> {
    try {
      const inv = await familiesApi.createInvitation(family.id, {
        email: email || undefined,
        role: 'Parent',
      })
      showToast('Invite link ready')
      return { invite_url: inv.invite_url, invite_token: inv.invite_token }
    } catch (e) {
      handleError(e)
      return null
    }
  }

  const isDashboard = screen === 'dashboard'
  const isSubScreen = screen === 'notifications' || screen === 'family' || screen === 'settings'

  function AppHeader() {
    return (
      <header style={{
        minHeight: 'calc(52px + env(safe-area-inset-top, 0px))',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        display: 'flex', alignItems: 'center',
        paddingLeft: 16, paddingRight: 16, gap: 12, flexShrink: 0,
        background: 'rgba(247,246,243,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${t.border}`, position: 'sticky', top: 0, zIndex: 20,
      }}>
        {isSubScreen ? (
          <button onClick={() => setScreen('dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: t.primary, padding: '4px 0', fontFamily: 'var(--ds-font)', flexShrink: 0 }}>
            <ArrowLeft size={18} />
            <span style={{ fontSize: 15 }}>Back</span>
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: t.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Home size={14} color="#fff" />
            </div>
            {isDashboard && (
              <span style={{ fontSize: 15, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{familyName}</span>
            )}
          </div>
        )}
        {!isDashboard && !isSubScreen && (
          <span style={{ fontSize: 17, fontWeight: 600, color: t.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{SCREEN_TITLES[screen]}</span>
        )}
        <div style={{ flex: 1, minWidth: 0 }} />
        <button
          onClick={() => setScreen('notifications')}
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', flexShrink: 0 }}
        >
          <Bell size={20} color={t.textSec} strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16,
              borderRadius: 9999, background: t.error, color: '#fff',
              fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1.5px solid ${t.bg}`, padding: '0 3px',
            }}>{unreadCount}</span>
          )}
        </button>
        <button onClick={() => setScreen('family')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
          {currentUser && <MemberAvatar member={currentUser} size={32} />}
        </button>
      </header>
    )
  }

  function DesktopSidebar() {
    return (
      <aside style={{
        width: 220, background: t.surface, borderRight: `1px solid ${t.border}`,
        display: 'flex', flexDirection: 'column', flexShrink: 0, padding: '16px 0',
        height: '100%',
      }}>
        <div style={{ padding: '4px 16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: t.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Home size={14} color="#fff" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>FamilyOS</span>
        </div>
        {[...BOTTOM_NAV, { screen: 'notifications' as Screen, icon: Bell, label: 'Notifications' }].map(item => {
          const Icon = item.icon
          const active = screen === item.screen
          return (
            <button key={item.screen} onClick={() => setScreen(item.screen)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', border: 'none', background: active ? t.primarySubtle : 'transparent',
              color: active ? t.primary : t.textSec,
              fontSize: 14, fontWeight: active ? 500 : 400,
              cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--ds-font)',
              transition: 'all 0.12s', borderRadius: 0,
            }}>
              <Icon size={18} strokeWidth={active ? 2 : 1.75} />
              {item.label}
              {item.screen === 'notifications' && unreadCount > 0 && (
                <span style={{ marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9999, background: t.error, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unreadCount}</span>
              )}
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setScreen('family')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {currentUser && <MemberAvatar member={currentUser} size={32} />}
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: t.text }}>{currentUser?.name ?? session.user?.name}</p>
            <p style={{ fontSize: 11, color: t.textTer }}>{familyName}</p>
          </div>
          <button onClick={() => setScreen('settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}>
            <Settings size={16} color={t.textTer} />
          </button>
        </div>
      </aside>
    )
  }

  function MobileBottomNav() {
    return (
      <nav style={{
        display: 'flex', borderTop: `1px solid ${t.border}`,
        background: 'rgba(247,246,243,0.95)', backdropFilter: 'blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom)', flexShrink: 0,
      }}>
        {BOTTOM_NAV.map(item => {
          const Icon = item.icon
          const active = screen === item.screen
          return (
            <button key={item.screen} onClick={() => setScreen(item.screen)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '8px 0', border: 'none', background: 'none',
              color: active ? t.primary : t.textTer, cursor: 'pointer', gap: 3,
              fontFamily: 'var(--ds-font)',
            }}>
              <Icon size={22} strokeWidth={active ? 2 : 1.75} color={active ? t.primary : t.textTer} />
              <span style={{ fontSize: 10, fontWeight: active ? 500 : 400 }}>{item.label}</span>
            </button>
          )
        })}
      </nav>
    )
  }

  const handlers = {
    navigate: setScreen,
    openSheet: setSheet,
    completeTask: (id: string) => { void completeTask(id) },
    completeShoppingItem: (id: string) => { void completeShoppingItem(id) },
    markNotificationRead: (id: string) => { void markNotificationRead(id) },
    markAllNotificationsRead: () => { void markAllNotificationsRead() },
    addTask: (task: Omit<Task, 'id' | 'completed'>) => { void addTask(task) },
    addEvent: (event: Omit<CalendarEvent, 'id'>) => { void addEvent(event) },
    addShoppingItem: (item: Omit<ShoppingItem, 'id' | 'completed' | 'addedById'>) => { void addShoppingItem(item) },
    deleteTask: (id: string) => { void deleteTask(id) },
    deleteEvent: (id: string) => { void deleteEvent(id) },
  }

  if (loading) {
    return (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bg, color: t.textSec, fontFamily: 'var(--ds-font)' }}>
        Loading your family…
      </div>
    )
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: t.bg, overflow: 'hidden' }}>
      {isOffline && <OfflineBanner />}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div className="hide-mobile" style={{ alignSelf: 'stretch' }}>
          <DesktopSidebar />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <AppHeader />

          <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {screen === 'dashboard' && (
              <Dashboard
                events={events}
                tasks={tasks}
                shopping={shopping}
                memberName={dashGreeting}
                dateLabel={dashDateLabel}
                today={today}
                {...handlers}
              />
            )}
            {screen === 'calendar' && (
              <CalendarScreen events={events} members={members} today={today} {...handlers} />
            )}
            {screen === 'tasks' && (
              <TasksScreen
                tasks={tasks}
                members={members}
                today={today}
                currentMemberId={currentUser?.id}
                {...handlers}
              />
            )}
            {screen === 'shopping' && (
              <ShoppingScreen shopping={shopping} members={members} {...handlers} />
            )}
            {screen === 'notifications' && (
              <NotificationsScreen notifications={notifs} {...handlers} />
            )}
            {screen === 'family' && (
              <FamilyScreen
                members={members}
                familyName={familyName}
                currentMemberId={currentUser?.id}
                onRename={renameFamily}
                {...handlers}
              />
            )}
            {screen === 'settings' && (
              <SettingsScreen
                navigate={setScreen}
                user={session.user}
                currentMember={currentUser}
                onSignOut={session.logout}
              />
            )}
          </main>

          <div className="hide-desktop">
            <MobileBottomNav />
          </div>
        </div>
      </div>

      {sheet?.type === 'addEvent' && (
        <AddEventSheet
          onClose={() => setSheet(null)}
          onAdd={handlers.addEvent}
          members={members}
          today={today}
          defaultMemberId={currentUser?.id ?? ''}
        />
      )}
      {sheet?.type === 'addTask' && (
        <AddTaskSheet
          onClose={() => setSheet(null)}
          onAdd={handlers.addTask}
          members={members}
          defaultMemberId={currentUser?.id ?? ''}
        />
      )}
      {sheet?.type === 'addShoppingItem' && (
        <AddShoppingSheet onClose={() => setSheet(null)} onAdd={handlers.addShoppingItem} />
      )}
      {sheet?.type === 'eventDetail' && (
        <EventDetailSheet
          event={events.find(e => e.id === sheet.eventId)}
          onClose={() => setSheet(null)}
          onDelete={handlers.deleteEvent}
          today={today}
        />
      )}
      {sheet?.type === 'inviteMember' && (
        <InviteMemberSheet
          familyName={familyName}
          onClose={() => setSheet(null)}
          onInvite={async email => {
            const result = await inviteMember(email)
            if (result && email) setSheet(null)
            return result
          }}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

function AddEventSheet({ onClose, onAdd, members, today, defaultMemberId }: {
  onClose: () => void
  onAdd: (e: Omit<CalendarEvent, 'id'>) => void
  members: Member[]
  today: string
  defaultMemberId: string
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [startTime, setStart] = useState('09:00')
  const [endTime, setEnd] = useState('10:00')
  const [memberId, setMember] = useState(defaultMemberId)
  const [location, setLocation] = useState('')

  const submit = () => {
    if (!title.trim()) return
    onAdd({ title: title.trim(), date, startTime, endTime, memberId, location: location || undefined })
  }

  return (
    <BottomSheet title="New Event" onClose={onClose}>
      <FormField label="Title">
        <Input placeholder="What's happening?" value={title} onChange={setTitle} autoFocus />
      </FormField>
      <FormField label="Date">
        <Input type="date" value={date} onChange={setDate} />
      </FormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <FormField label="Start time">
          <Input type="time" value={startTime} onChange={setStart} />
        </FormField>
        <FormField label="End time">
          <Input type="time" value={endTime} onChange={setEnd} />
        </FormField>
      </div>
      <FormField label="Who">
        <Select value={memberId} onChange={setMember} options={members.map(m => ({ value: m.id, label: m.name }))} />
      </FormField>
      <FormField label="Location (optional)">
        <Input placeholder="Add location" value={location} onChange={setLocation} />
      </FormField>
      <PrimaryButton onClick={submit} fullWidth disabled={!title.trim()}>Create Event</PrimaryButton>
    </BottomSheet>
  )
}

function AddTaskSheet({ onClose, onAdd, members, defaultMemberId }: {
  onClose: () => void
  onAdd: (tk: Omit<Task, 'id' | 'completed'>) => void
  members: Member[]
  defaultMemberId: string
}) {
  const [title, setTitle] = useState('')
  const [assigneeId, setAssignee] = useState(defaultMemberId)
  const [dueDate, setDue] = useState<'today' | 'tomorrow'>('today')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [recurring, setRecurring] = useState(false)

  const submit = () => {
    if (!title.trim()) return
    onAdd({ title: title.trim(), assigneeId, dueDate, priority, recurring, category: 'General' })
  }

  return (
    <BottomSheet title="New Task" onClose={onClose}>
      <FormField label="What needs doing?">
        <Input placeholder="Add a task…" value={title} onChange={setTitle} autoFocus />
      </FormField>
      <FormField label="Assign to">
        <Select value={assigneeId} onChange={setAssignee} options={members.map(m => ({ value: m.id, label: m.name }))} />
      </FormField>
      <FormField label="Due">
        <SegmentedControl options={['today', 'tomorrow']} value={dueDate} onChange={v => setDue(v as 'today' | 'tomorrow')} />
      </FormField>
      <FormField label="Priority">
        <SegmentedControl options={['low', 'medium', 'high']} value={priority} onChange={v => setPriority(v as 'high' | 'medium' | 'low')} />
      </FormField>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '12px 0', borderTop: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Repeat size={16} color={t.textSec} />
          <span style={{ fontSize: 14, color: t.text }}>Recurring task</span>
        </div>
        <button onClick={() => setRecurring(v => !v)} style={{
          width: 44, height: 26, borderRadius: 9999, border: 'none',
          background: recurring ? t.primary : t.border, cursor: 'pointer',
          position: 'relative', transition: 'background 0.2s', padding: 0,
        }}>
          <div style={{ position: 'absolute', top: 3, left: recurring ? 21 : 3, width: 20, height: 20, borderRadius: 9999, background: '#fff', boxShadow: 'var(--ds-shadow-low)', transition: 'left 0.2s' }} />
        </button>
      </div>
      <PrimaryButton onClick={submit} fullWidth disabled={!title.trim()}>Create Task</PrimaryButton>
    </BottomSheet>
  )
}

function AddShoppingSheet({ onClose, onAdd }: {
  onClose: () => void
  onAdd: (i: Omit<ShoppingItem, 'id' | 'completed' | 'addedById'>) => void
}) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState(1)
  const [category, setCat] = useState('Produce')
  const cats = ['Produce', 'Meat', 'Dairy', 'Bakery', 'Baby', 'Other']

  const submit = () => {
    if (!name.trim()) return
    onAdd({ name: name.trim(), quantity: qty, category })
    setName('')
    setQty(1)
  }

  return (
    <BottomSheet title="Add Item" onClose={onClose}>
      <FormField label="Item">
        <Input placeholder="What do you need?" value={name} onChange={setName} autoFocus />
      </FormField>
      <FormField label="Category">
        <Select value={category} onChange={setCat} options={cats.map(c => ({ value: c, label: c }))} />
      </FormField>
      <FormField label="Quantity">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 44, height: 44, borderRadius: 'var(--ds-radius-md)', border: `1px solid ${t.border}`, background: t.surface, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 500 }}>{qty}</span>
          <button onClick={() => setQty(q => q + 1)} style={{ width: 44, height: 44, borderRadius: 'var(--ds-radius-md)', border: `1px solid ${t.border}`, background: t.surface, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
        </div>
      </FormField>
      <PrimaryButton onClick={submit} fullWidth disabled={!name.trim()}>Add Item</PrimaryButton>
      <p style={{ fontSize: 12, color: t.textTer, textAlign: 'center', marginTop: 10 }}>Tap Add to continue adding items</p>
    </BottomSheet>
  )
}

function EventDetailSheet({ event, onClose, onDelete, today }: {
  event: CalendarEvent | undefined
  onClose: () => void
  onDelete: (id: string) => void
  today: string
}) {
  if (!event) return null
  const member = getMember(event.memberId)
  return (
    <BottomSheet title="Event" onClose={onClose}>
      <div style={{ marginBottom: 4, display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
        <div style={{ width: 4, height: 32, borderRadius: 9999, background: member.color, flexShrink: 0, marginTop: 4 }} />
        <span style={{ fontSize: 22, fontWeight: 600, color: t.text, minWidth: 0, wordBreak: 'break-word' }}>{event.title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20, marginBottom: 24 }}>
        <DetailRow icon="📅" label={formatDate(event.date, today, addDays(today, 1))} />
        <DetailRow icon="⏰" label={formatTime(event.startTime) + (event.endTime ? ` – ${formatTime(event.endTime)}` : '')} />
        <DetailRow icon="👤" label={member.name} />
        {event.location && <DetailRow icon="📍" label={event.location} />}
      </div>
      <button
        onClick={() => onDelete(event.id)}
        style={{ width: '100%', padding: '12px', background: 'var(--ds-error-subtle)', color: 'var(--ds-error)', border: 'none', borderRadius: 'var(--ds-radius-md)', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--ds-font)' }}
      >
        Delete Event
      </button>
    </BottomSheet>
  )
}

function DetailRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 15, color: t.text }}>{label}</span>
    </div>
  )
}

function InviteMemberSheet({ familyName, onClose, onInvite }: {
  familyName: string
  onClose: () => void
  onInvite: (email: string) => Promise<{ invite_url: string; invite_token: string } | null>
}) {
  const [email, setEmail] = useState('')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void (async () => {
      setBusy(true)
      const result = await onInvite('')
      if (result) setLink(result.invite_url)
      setBusy(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <BottomSheet title="Invite Family Member" onClose={onClose}>
      <p style={{ fontSize: 14, color: t.textSec, marginBottom: 20, lineHeight: 1.6 }}>
        Share this link so someone can join {familyName}. They will open it, create an account if needed, and join your family.
      </p>
      <FormField label="Invite link">
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, height: 44, padding: '0 12px', borderRadius: 'var(--ds-radius-md)', border: `1px solid ${t.border}`, background: t.surfaceMuted, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            <span style={{ fontSize: 13, color: t.textSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {busy && !link ? 'Generating…' : link || '—'}
            </span>
          </div>
          <button
            onClick={() => {
              if (!link) return
              navigator.clipboard?.writeText(link)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1500)
            }}
            style={{ padding: '0 16px', height: 44, borderRadius: 'var(--ds-radius-md)', border: `1px solid ${t.borderStrong}`, background: t.surface, fontSize: 13, fontWeight: 500, color: t.text, cursor: 'pointer', fontFamily: 'var(--ds-font)', flexShrink: 0 }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </FormField>
      <div style={{ position: 'relative', textAlign: 'center', margin: '16px 0' }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: t.border }} />
        <span style={{ position: 'relative', background: t.surface, padding: '0 12px', fontSize: 12, color: t.textTer }}>optional</span>
      </div>
      <FormField label="Email (optional — delivery not enabled yet)">
        <Input placeholder="name@email.com" value={email} onChange={setEmail} type="email" />
      </FormField>
      <p style={{ fontSize: 12, color: t.textTer, marginTop: -8, marginBottom: 16, lineHeight: 1.5 }}>
        Saving an email stores it for later. Share the invite link above for now.
      </p>
      <PrimaryButton
        onClick={() => {
          void (async () => {
            const result = await onInvite(email)
            if (result) setLink(result.invite_url)
          })()
        }}
        fullWidth
        disabled={!email.includes('@') || busy}
      >
        Create invite with email
      </PrimaryButton>
    </BottomSheet>
  )
}
