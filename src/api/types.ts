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

export interface ShoppingItemOut {
  id: string
  shopping_list_id: string
  name: string
  quantity: string | null
  unit: string | null
  category: string | null
  completed_at: string | null
  created_by: string
  completed_by: string | null
  created_at: string
  updated_at: string
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
  | { type: 'event.created'; event: EventOut }
  | { type: 'event.updated'; event: EventOut }
  | { type: 'event.deleted'; event_id: string }
  | { type: 'task.created'; task: TaskOut }
  | { type: 'task.updated'; task: TaskOut }
  | { type: 'task.deleted'; task_id: string }
  | { type: 'notification.created'; notification: NotificationOut }

/** @deprecated Use FamilyWsMessage */
export type ShoppingWsMessage = Extract<FamilyWsMessage, { type: `shopping.${string}` }>
