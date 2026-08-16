import { apiRequest } from './client'
import type {
  AcceptInviteOut,
  FamilyOut,
  InvitationOut,
  MemberOut,
} from './types'

export function createFamily(name: string, timezone?: string) {
  return apiRequest<FamilyOut>('/api/families', {
    method: 'POST',
    body: { name, timezone: timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone },
  })
}

export function listMyFamilies() {
  return apiRequest<FamilyOut[]>('/api/me/families')
}

export function getFamily(familyId: string) {
  return apiRequest<FamilyOut>(`/api/families/${familyId}`)
}

export function updateFamily(familyId: string, patch: { name?: string; timezone?: string }) {
  return apiRequest<FamilyOut>(`/api/families/${familyId}`, {
    method: 'PATCH',
    body: patch,
  })
}

export function leaveFamily(familyId: string) {
  return apiRequest<void>(`/api/families/${familyId}/leave`, { method: 'POST' })
}

export function removeMember(familyId: string, memberId: string) {
  return apiRequest<void>(`/api/families/${familyId}/members/${memberId}`, {
    method: 'DELETE',
  })
}

export function deleteFamily(familyId: string) {
  return apiRequest<void>(`/api/families/${familyId}`, { method: 'DELETE' })
}

export function listMembers(familyId: string) {
  return apiRequest<MemberOut[]>(`/api/families/${familyId}/members`)
}

export function addMember(
  familyId: string,
  data: { name: string; role?: 'Owner' | 'Parent' | 'Child'; avatar_url?: string | null },
) {
  return apiRequest<MemberOut>(`/api/families/${familyId}/members`, {
    method: 'POST',
    body: data,
  })
}

export function createInvitation(
  familyId: string,
  data: { email?: string } = {},
) {
  return apiRequest<InvitationOut>(`/api/families/${familyId}/invitations`, {
    method: 'POST',
    body: data,
  })
}

export function acceptInvitation(token: string) {
  return apiRequest<AcceptInviteOut>(`/api/invitations/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
  })
}
