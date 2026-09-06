import { apiRequest } from './client'

export interface AssistantMessageIn {
  role: 'user' | 'assistant'
  content: string
}

export interface ExpenseProposal {
  destination: string | null
  account_id: string | null
  amount: string | null
  subcategory_id: string | null
  category: string | null
  merchant: string | null
  note: string | null
  occurred_on: string | null
  destination_explicit: boolean
  account_id_explicit: boolean
  amount_explicit: boolean
  subcategory_id_explicit: boolean
  category_explicit: boolean
  merchant_explicit: boolean
  note_explicit: boolean
  occurred_on_explicit: boolean
}

export interface TaskProposal {
  title: string | null
  assignee_id: string | null
  due: 'today' | 'tomorrow' | null
  priority: 'low' | 'medium' | 'high' | null
  category: string | null
  recurring: boolean
  title_explicit: boolean
  assignee_id_explicit: boolean
  due_explicit: boolean
  priority_explicit: boolean
  category_explicit: boolean
  recurring_explicit: boolean
}

export interface ExpenseListRow {
  id: string
  occurred_on: string
  merchant: string | null
  amount: string
  category_or_subcategory_label: string | null
  source_type: string
  writable: boolean
}

export interface ExpenseList {
  destination: 'household' | 'personal'
  account_id: string | null
  account_name: string | null
  month: string | null
  period_id: string | null
  period_label: string | null
  count: number
  total: string
  currency: string
  rows: ExpenseListRow[]
}

export interface ExpenseChangeProposal {
  expense_id: string
  destination: 'household' | 'personal'
  account_id: string | null
  amount: string | null
  subcategory_id: string | null
  category: string | null
  merchant: string | null
  note: string | null
  occurred_on: string | null
  amount_explicit: boolean
  subcategory_id_explicit: boolean
  category_explicit: boolean
  merchant_explicit: boolean
  note_explicit: boolean
  occurred_on_explicit: boolean
  destination_explicit: boolean
  account_id_explicit: boolean
  writable: boolean
}

export interface AssistantTurnOut {
  assistant_text: string
  proposal: ExpenseProposal | null
  task_proposal: TaskProposal | null
  expense_list: ExpenseList | null
  change_proposal: ExpenseChangeProposal | null
}

export type AssistantProposalState = 'open' | 'saved' | 'cancelled'

export interface AssistantSavedSummary {
  amount: string
  label: string
}

export type AssistantExpenseSubmit =
  | {
      destination: 'household'
      amount: number
      subcategoryId: string
      merchant: string | null
      note: string | null
      occurredAt: string
    }
  | {
      destination: 'personal'
      amount: number
      accountId: string
      category: string
      merchant: string | null
      note: string | null
      occurredAt: string
    }

export interface AssistantThreadItem {
  role: 'user' | 'assistant'
  content: string
  proposal?: ExpenseProposal | null
  proposalState?: AssistantProposalState
  savedSummary?: AssistantSavedSummary
}

export const toAssistantMessages = (thread: AssistantThreadItem[]): AssistantMessageIn[] =>
  thread.map(item => ({ role: item.role, content: item.content }))

export function proposeTurn(familyId: string, messages: AssistantMessageIn[]) {
  return apiRequest<AssistantTurnOut>(`/api/families/${familyId}/assistant/turns`, {
    method: 'POST',
    body: { messages },
  })
}
