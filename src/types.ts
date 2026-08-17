export type Screen = 'dashboard' | 'calendar' | 'tasks' | 'shopping' | 'notifications' | 'family' | 'settings'

export interface Member {
  id: string
  name: string
  role: 'admin' | 'parent' | 'child'
  initials: string
  color: string
  bg: string
  /** Linked auth user id when present */
  userId?: string | null
}

export interface CalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  startTime: string // HH:MM
  endTime?: string
  memberId: string
  location?: string
  reminder?: string
  repeat?: string
}

export const TASK_CATEGORIES = [
  'Household',
  'Child',
  'Shopping',
  'Personal',
  'Admin',
  'Other',
] as const

export type TaskCategory = (typeof TASK_CATEGORIES)[number]

export interface Task {
  id: string
  title: string
  assigneeId: string
  dueDate: 'today' | 'tomorrow' | string
  priority: 'high' | 'medium' | 'low'
  recurring: boolean
  category: string
  completed: boolean
}

export interface ShoppingItem {
  id: string
  name: string
  category: string
  quantity: number
  unit?: string
  locationId?: string | null
  completed: boolean
  addedById: string
}

export interface ShoppingLocation {
  id: string
  name: string
  sortOrder: number
}

export interface ShoppingSessionItem {
  id: string
  sessionId: string
  name: string
  category: string
  quantity: number
  unit?: string
  locationId?: string | null
  locationName?: string | null
  addedAt: string
  addedById: string
}

export interface ShoppingSession {
  id: string
  status: 'active' | 'completed'
  startedAt: string
  completedAt?: string
  totalCost?: number
  currency: string
  itemCount: number
  items?: ShoppingSessionItem[]
}

export interface Notification {
  id: string
  type: 'calendar' | 'task' | 'shopping' | 'family'
  title: string
  body: string
  timestamp: string
  read: boolean
  targetScreen?: Screen
}

export type BottomSheetType =
  | { type: 'addEvent' }
  | { type: 'addTask' }
  | { type: 'addShoppingItem' }
  | { type: 'completeShopping' }
  | { type: 'eventDetail'; eventId: string }
  | { type: 'inviteMember' }
  | { type: 'taskDetail'; taskId: string }

export interface AppHandlers {
  navigate: (screen: Screen) => void
  openSheet: (sheet: BottomSheetType) => void
  completeTask: (id: string) => void
  addToBasket: (id: string) => void | Promise<boolean>
  removeFromBasket: (sessionItemId: string) => void
  completeShoppingSession: (totalCost: number) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  addTask: (task: Omit<Task, 'id' | 'completed'>) => void
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void
  addShoppingItem: (item: Omit<ShoppingItem, 'id' | 'completed' | 'addedById'>) => void
  deleteTask: (id: string) => void
  deleteEvent: (id: string) => void
}
