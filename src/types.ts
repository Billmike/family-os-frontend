export type Screen = 'dashboard' | 'calendar' | 'tasks' | 'shopping' | 'insights' | 'notifications' | 'family' | 'settings'

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
  description: string | null
  assigneeId: string
  dueDate: 'today' | 'tomorrow' | string
  dueAt: string | null
  priority: 'high' | 'medium' | 'low'
  recurring: boolean
  category: string
  completed: boolean
}

export type TaskUpdatePatch = Partial<
  Pick<Task, 'title' | 'description' | 'dueDate' | 'dueAt' | 'priority' | 'category' | 'assigneeId'>
>

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

export const EXPENSE_CATEGORIES = [
  'Shopping',
  'Transportation',
  'Housing',
  'Utilities',
  'Dining',
  'Health',
  'Childcare',
  'Other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export type ExpenseSourceType = 'manual' | 'shopping_session'

export interface Expense {
  id: string
  amount: number
  currency: string
  category: string
  merchant: string | null
  note: string | null
  occurredAt: string
  sourceType: ExpenseSourceType
  sourceId: string | null
  sourceItemCount: number | null
}

export interface CategorySpend {
  category: string
  total: number
  count: number
}

export interface MonthlySpend {
  month: string
  total: number
  entryCount: number
  average: number
  categories: CategorySpend[]
}

export interface HouseholdSpend {
  currency: string
  currentMonth: string
  yearToDateTotal: number
  months: MonthlySpend[]
}

/** @deprecated Use HouseholdSpend — grocery-only view maps onto the same shape. */
export type ShoppingSpend = HouseholdSpend

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
  | { type: 'addExpense' }
  | { type: 'editExpense'; expense: Expense }
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
  deleteShoppingItem: (id: string) => void
  deleteTask: (id: string) => void
  deleteEvent: (id: string) => void
  updateTask: (id: string, patch: TaskUpdatePatch) => void
  addExpense: (input: ExpenseDraft) => void
  updateExpense: (id: string, input: ExpenseDraft) => void
  deleteExpense: (id: string) => void
}

export interface ExpenseDraft {
  amount: number
  category: string
  merchant: string | null
  note: string | null
  occurredAt: string
}
