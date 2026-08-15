import { apiRequest } from './client'
import type { TaskOut } from './types'

export type TaskFilter = 'all' | 'mine' | 'completed' | 'open'

export function listTasks(familyId: string, filter: TaskFilter = 'all') {
  return apiRequest<TaskOut[]>(`/api/families/${familyId}/tasks?filter=${filter}`)
}

export interface TaskCreate {
  title: string
  description?: string | null
  due_at?: string | null
  priority?: string
  category?: string | null
  recurrence_rule?: string | null
  assignee_ids?: string[]
}

export function createTask(familyId: string, data: TaskCreate) {
  return apiRequest<TaskOut>(`/api/families/${familyId}/tasks`, {
    method: 'POST',
    body: data,
  })
}

export function updateTask(taskId: string, data: Partial<TaskCreate> & { completed_at?: string | null }) {
  return apiRequest<TaskOut>(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: data,
  })
}

export function completeTask(taskId: string) {
  return apiRequest<TaskOut>(`/api/tasks/${taskId}/complete`, { method: 'POST' })
}

export function deleteTask(taskId: string) {
  return apiRequest<void>(`/api/tasks/${taskId}`, { method: 'DELETE' })
}
