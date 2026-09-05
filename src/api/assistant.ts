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

export function proposeTurn(familyId: string, messages: AssistantMessageIn[]) {
  return apiRequest<AssistantTurnOut>(`/api/families/${familyId}/assistant/turns`, {
    method: 'POST',
    body: { messages },
  })
}
