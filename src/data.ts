import type { Member, CalendarEvent, Task, ShoppingItem, Notification } from './types'

/** @deprecated Mock seeds — live app uses the API. Kept for reference only. */
export const FAMILY_NAME = 'Ayelegun Family'
/** @deprecated */
export const CURRENT_USER_ID = 'kayode'

export const TODAY = (() => {
  const d = new Date()
  return d.toISOString().slice(0, 10)
})()

export const TOMORROW = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
})()

export const MEMBERS: Member[] = []

export const INITIAL_EVENTS: CalendarEvent[] = []
export const INITIAL_TASKS: Task[] = []
export const INITIAL_SHOPPING: ShoppingItem[] = []
export const INITIAL_NOTIFICATIONS: Notification[] = []

export const CATEGORY_ORDER = ['Produce', 'Meat', 'Dairy', 'Bakery', 'Baby', 'Other']

let membersCache: Member[] = []

export function setMembersCache(members: Member[]) {
  membersCache = members
}

export function getMember(id: string): Member {
  const found = membersCache.find(m => m.id === id) ?? MEMBERS.find(m => m.id === id)
  if (found) return found
  return {
    id,
    name: 'Unknown',
    role: 'parent',
    initials: '?',
    color: '#78716C',
    bg: '#F5F5F4',
  }
}

export function formatDate(dateStr: string, today = TODAY, tomorrow = TOMORROW): string {
  if (dateStr === 'today' || dateStr === today) return 'Today'
  if (dateStr === 'tomorrow' || dateStr === tomorrow) return 'Tomorrow'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatDateLong(dateStr: string, today = TODAY, tomorrow = TOMORROW): string {
  if (dateStr === today) return 'Today'
  if (dateStr === tomorrow) return 'Tomorrow'
  const d = new Date(dateStr + 'T00:00:00')
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' })
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  return `${weekday}, ${date}`
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
