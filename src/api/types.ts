/** API DTOs matching backend/FRONTEND_API.md */

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface UserOut {
  id: string
  email: string
  name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type ApiRole = 'Owner' | 'Parent' | 'Child'

export interface FamilyOut {
  id: string
  name: string
  timezone: string
  created_at: string
  updated_at: string
}

export interface MemberOut {
  id: string
  family_id: string
  user_id: string | null
  name: string
  role: ApiRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface InvitationOut {
  id: string
  family_id: string
  email: string | null
  expires_at: string
  invite_token: string
  invite_url: string
}

export interface AcceptInviteOut {
  family: FamilyOut
  member: MemberOut
}

export interface EventOut {
  id: string
  family_id: string
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string | null
  all_day: boolean
  recurrence_rule: string | null
  created_by: string
  member_ids: string[]
  reminder_minutes: number[]
  created_at: string
  updated_at: string
  occurrence_starts_at: string | null
}

export interface TaskOut {
  id: string
  family_id: string
  title: string
  description: string | null
  due_at: string | null
  priority: string
  category: string | null
  recurrence_rule: string | null
  completed_at: string | null
  created_by: string
  assignee_ids: string[]
  created_at: string
  updated_at: string
}

export interface ShoppingListOut {
  id: string
  family_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface ShoppingLocationOut {
  id: string
  family_id: string
  name: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ShoppingItemOut {
  id: string
  shopping_list_id: string
  name: string
  quantity: string | null
  unit: string | null
  category: string | null
  location_id: string | null
  completed_at: string | null
  created_by: string
  completed_by: string | null
  created_at: string
  updated_at: string
}

export interface ShoppingSessionItemOut {
  id: string
  session_id: string
  name: string
  quantity: string | null
  unit: string | null
  category: string | null
  location_id: string | null
  location_name: string | null
  added_at: string
  added_by: string
}

export interface ShoppingSessionOut {
  id: string
  family_id: string
  status: 'active' | 'completed'
  started_at: string
  started_by: string
  completed_at: string | null
  completed_by: string | null
  total_cost: string | null
  currency: string
  created_at: string
  updated_at: string
  item_count: number
  items: ShoppingSessionItemOut[]
}

export interface MonthlySpendOut {
  month: string
  total: string
  trip_count: number
  average: string
}

export interface ShoppingSpendOut {
  currency: string
  current_month: string
  year_to_date_total: string
  months: MonthlySpendOut[]
}

export interface CategorySpendOut {
  category: string
  total: string
  count: number
}

export interface MonthlyHouseholdSpendOut {
  month: string
  total: string
  entry_count: number
  average: string
  categories: CategorySpendOut[]
}

export interface HouseholdSpendOut {
  currency: string
  current_month: string
  year_to_date_total: string
  months: MonthlyHouseholdSpendOut[]
  budget?: BudgetSummaryOut | null
}

export type BudgetState = 'ok' | 'warning' | 'over'

export interface BudgetSummaryOut {
  period_id: string
  label_month: string
  start_date: string
  end_date: string
  amount: string
  used: string
  remaining: string
  percent_used: number
  state: BudgetState
}

export interface BudgetOut {
  id: string
  period_id: string
  family_id: string
  category: string | null
  amount: string
  currency: string
  used: string
  remaining: string
  percent_used: number
  state: BudgetState
  created_at: string
  updated_at: string
}

export interface BudgetPeriodOut {
  id: string
  family_id: string
  start_date: string
  end_date: string
  label_month: string
  currency: string
  overall: BudgetOut | null
  categories: BudgetOut[]
  created_at: string
  updated_at: string
}

export interface BudgetPeriodListOut {
  periods: BudgetPeriodOut[]
}

export interface ExpenseOut {
  id: string
  family_id: string
  amount: string
  currency: string
  category: string
  merchant: string | null
  note: string | null
  occurred_at: string
  created_by: string
  source_type: 'manual' | 'shopping_session' | 'receipt'
  source_id: string | null
  source_item_count: number | null
  created_at: string
  updated_at: string
}

export type ReceiptStatus = 'processing' | 'ready' | 'failed' | 'confirmed'

export interface ReceiptItemOut {
  id: string
  receipt_id: string
  position: number
  name: string
  quantity: string | null
  unit: string | null
  unit_price: string | null
  total_price: string
  tax_code: string | null
  is_included: boolean
  created_at: string
  updated_at: string
}

export interface ReceiptOut {
  id: string
  family_id: string
  uploaded_by: string
  status: ReceiptStatus
  mime_type: string
  byte_size: number
  original_filename: string | null
  category_hint: string | null
  suggested_category: string | null
  merchant: string | null
  purchased_at: string | null
  currency: string | null
  subtotal: string | null
  tax_total: string | null
  total: string | null
  totals_mismatch: boolean
  model_name: string | null
  error_message: string | null
  expense_id: string | null
  shopping_session_id: string | null
  items: ReceiptItemOut[]
  created_at: string
  updated_at: string
}

export interface ReceiptItemConfirm {
  name: string
  quantity?: number | string | null
  unit?: string | null
  unit_price?: number | string | null
  total_price: number | string
  tax_code?: string | null
  is_included?: boolean
}

export interface ReceiptConfirm {
  category: string
  merchant?: string | null
  note?: string | null
  occurred_at?: string | null
  currency?: string
  total: number | string
  items: ReceiptItemConfirm[]
}

export interface NotificationOut {
  id: string
  family_id: string
  user_id: string
  type: string
  title: string
  body: string
  entity_type: string | null
  entity_id: string | null
  read_at: string | null
  created_at: string
}

export interface NotificationPreferencesOut {
  user_id: string
  calendar_reminders: boolean
  task_assignments: boolean
  task_due_soon: boolean
  shopping_activity: boolean
  family_activity: boolean
  budget_alerts: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
}

export interface VapidPublicKeyOut {
  public_key: string | null
}

export interface PushSubscriptionOut {
  id: string
  endpoint: string
  user_agent: string | null
  created_at: string
  last_used_at: string | null
}

export interface DashboardOut {
  family_id: string
  family_name: string
  timezone: string
  member_name: string
  date: string
  today_events: EventOut[]
  open_tasks: TaskOut[]
  shopping_preview: ShoppingItemOut[]
  upcoming_events: EventOut[]
}

export interface ApiErrorBody {
  detail: string | Array<{ loc: unknown[]; msg: string; type: string }>
  code?: string
}

export type FamilyWsMessage =
  | { type: 'shopping.item.created'; item: ShoppingItemOut }
  | { type: 'shopping.item.updated'; item: ShoppingItemOut }
  | { type: 'shopping.item.completed'; item: ShoppingItemOut }
  | { type: 'shopping.item.updated'; item_id: string; deleted: true }
  | { type: 'shopping.session.started'; session: ShoppingSessionOut }
  | { type: 'shopping.session.item.added'; session: ShoppingSessionOut; item: ShoppingSessionItemOut; removed_item_id: string }
  | { type: 'shopping.session.item.updated'; session_id: string; item: ShoppingSessionItemOut }
  | { type: 'shopping.session.item.removed'; session_id: string; item_id: string; restored_item?: ShoppingItemOut }
  | { type: 'shopping.session.completed'; session: ShoppingSessionOut }
  | { type: 'expense.created'; expense: ExpenseOut }
  | { type: 'expense.updated'; expense: ExpenseOut }
  | { type: 'expense.deleted'; expense_id: string }
  | { type: 'budget.updated'; period: BudgetPeriodOut }
  | { type: 'budget.deleted'; period_id?: string; budget_id?: string }
  | { type: 'receipt.ready'; receipt: ReceiptOut }
  | { type: 'receipt.failed'; receipt: ReceiptOut }
  | { type: 'receipt.deleted'; receipt_id: string }
  | { type: 'event.created'; event: EventOut }
  | { type: 'event.updated'; event: EventOut }
  | { type: 'event.deleted'; event_id: string }
  | { type: 'task.created'; task: TaskOut }
  | { type: 'task.updated'; task: TaskOut }
  | { type: 'task.deleted'; task_id: string }
  | { type: 'notification.created'; notification: NotificationOut }

/** @deprecated Use FamilyWsMessage */
export type ShoppingWsMessage = Extract<FamilyWsMessage, { type: `shopping.${string}` }>
