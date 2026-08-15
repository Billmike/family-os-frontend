import { apiRequest } from './client'
import type { EventOut } from './types'

export function listEvents(familyId: string, from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const q = params.toString()
  return apiRequest<EventOut[]>(`/api/families/${familyId}/events${q ? `?${q}` : ''}`)
}

export interface EventCreate {
  title: string
  description?: string | null
  location?: string | null
  starts_at: string
  ends_at?: string | null
  all_day?: boolean
  recurrence_rule?: string | null
  member_ids?: string[]
  reminder_minutes?: number[]
}

export function createEvent(familyId: string, data: EventCreate) {
  return apiRequest<EventOut>(`/api/families/${familyId}/events`, {
    method: 'POST',
    body: data,
  })
}

export function updateEvent(eventId: string, data: Partial<EventCreate>) {
  return apiRequest<EventOut>(`/api/events/${eventId}`, {
    method: 'PATCH',
    body: data,
  })
}

export function deleteEvent(eventId: string) {
  return apiRequest<void>(`/api/events/${eventId}`, { method: 'DELETE' })
}
