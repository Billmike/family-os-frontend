export type Screen = 'dashboard' | 'calendar' | 'tasks' | 'shopping' | 'budget' | 'budgetSpend' | 'budgetInsights' | 'budgetActivity' | 'notifications' | 'family' | 'settings'

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

export const BUDGET_GROUPS = [
  'Income',
  'Fixed Expense',
  'Variable Expense',
  'Debt',
  'Savings',
  'Investment',
] as const

export type BudgetGroup = (typeof BUDGET_GROUPS)[number]

export type BudgetDirection = 'inflow' | 'outflow'

export type ExpenseSourceType = 'manual' | 'shopping_session' | 'receipt' | 'budget_line'

export interface BudgetSubcategory {
  id: string
  familyId: string
  group: BudgetGroup | string
  name: string
  sortOrder: number
  role: string | null
  archivedAt: string | null
}

export interface BudgetSubcategoryGroup {
  group: BudgetGroup | string
  direction: BudgetDirection
  subcategories: BudgetSubcategory[]
}

export interface Expense {
  id: string
  amount: number
  currency: string
  subcategoryId: string
  subcategoryName: string
  group: string
  direction: BudgetDirection
  merchant: string | null
  note: string | null
  occurredAt: string
  sourceType: ExpenseSourceType
  sourceId: string | null
  sourceItemCount: number | null
}

export type ReceiptStatus = 'processing' | 'ready' | 'failed' | 'confirmed'

export interface ReceiptItem {
  id: string
  receiptId: string
  position: number
  name: string
  quantity: number | null
  unit: string | null
  unitPrice: number | null
  totalPrice: number
  taxCode: string | null
  isIncluded: boolean
}

export interface Receipt {
  id: string
  familyId: string
  uploadedBy: string
  status: ReceiptStatus
  mimeType: string
  byteSize: number
  originalFilename: string | null
  categoryHint: string | null
  suggestedCategory: string | null
  suggestedSubcategoryId: string | null
  merchant: string | null
  purchasedAt: string | null
  currency: string | null
  subtotal: number | null
  taxTotal: number | null
  total: number | null
  totalsMismatch: boolean
  modelName: string | null
  errorMessage: string | null
  expenseId: string | null
  shoppingSessionId: string | null
  items: ReceiptItem[]
  createdAt: string
  updatedAt: string
}

export type BudgetState = 'ok' | 'warning' | 'over'

export interface BudgetSummary {
  periodId: string
  labelMonth: string
  startDate: string
  endDate: string
  amount: number
  used: number
  remaining: number
  percentUsed: number
  state: BudgetState
}

export interface Budget {
  id: string
  periodId: string
  familyId: string
  subcategoryId: string
  subcategoryName: string
  group: string
  amount: number
  currency: string
  used: number
  remaining: number
  percentUsed: number
  state: BudgetState
  settled: boolean
  settlementExpenseId: string | null
  createdAt: string
  updatedAt: string
}

export interface BudgetGroupBlock {
  group: string
  direction: BudgetDirection
  expected: number
  actual: number
  lines: Budget[]
}

export interface BudgetPeriodSummary {
  incomeExpected: number
  incomeActual: number
  totalExpensesExpected: number
  totalExpensesActual: number
  leftOverExpected: number
  leftOverActual: number
}

export interface BudgetPeriod {
  id: string
  familyId: string
  startDate: string
  endDate: string
  labelMonth: string
  currency: string
  groups: BudgetGroupBlock[]
  summary: BudgetPeriodSummary
  createdAt: string
  updatedAt: string
}

export interface BudgetPeriodDraft {
  periodId: string | null
  startDate: string
  endDate: string
  rows: BudgetRowDraft[]
}

export interface BudgetRowDraft {
  subcategoryId: string
  amount: string
  budgetId: string | null
}

export interface CategorySpend {
  category: string
  subcategoryId: string | null
  group: string | null
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
  budget?: BudgetSummary | null
}

/** @deprecated Use HouseholdSpend — grocery-only view maps onto the same shape. */
export type ShoppingSpend = HouseholdSpend

export interface Notification {
  id: string
  type: 'calendar' | 'task' | 'shopping' | 'family' | 'budget'
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
  | { type: 'editShoppingItem'; itemId: string }
  | { type: 'editBasketItem'; sessionItemId: string }
  | { type: 'completeShopping' }
  | { type: 'addExpense' }
  | { type: 'chooseExpenseEntry' }
  | { type: 'scanReceipt' }
  | { type: 'editExpense'; expense: Expense }
  | { type: 'cycleDates'; mode?: 'current' | 'next' | 'create' | 'copy' }
  | { type: 'cycleList'; highlightRange?: { start: string; end: string } }
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
  updateShoppingItem: (id: string, patch: ShoppingItemPatch) => void
  updateBasketItem: (sessionItemId: string, patch: ShoppingItemPatch) => void
  deleteShoppingItem: (id: string) => void
  deleteTask: (id: string) => void
  deleteEvent: (id: string) => void
  updateTask: (id: string, patch: TaskUpdatePatch) => void
  addExpense: (input: ExpenseDraft) => void
  updateExpense: (id: string, input: ExpenseDraft) => void
  deleteExpense: (id: string) => void
  onReceiptConfirmed: () => void
}

/** Full set of user-editable fields on a shopping list or basket item. */
export interface ShoppingItemDraft {
  name: string
  category: string
  quantity: number
  locationId: string | null
}

export type ShoppingItemPatch = Partial<ShoppingItemDraft>

export interface ExpenseDraft {
  amount: number
  subcategoryId: string
  merchant: string | null
  note: string | null
  occurredAt: string
}

export interface ReceiptItemDraft {
  name: string
  quantity: number | null
  unit: string | null
  unitPrice: number | null
  totalPrice: number
  taxCode: string | null
  isIncluded: boolean
}

export interface ReceiptConfirmDraft {
  subcategoryId: string
  merchant: string | null
  note: string | null
  occurredAt: string
  currency: string
  total: number
  items: ReceiptItemDraft[]
}
