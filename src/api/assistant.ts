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

export interface AssistantTurnOut {
  assistant_text: string
  proposal: ExpenseProposal | null
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
