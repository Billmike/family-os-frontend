export const PHONE_SHORT_SIDE_PX = 768

export const isPhoneAssistantViewport = (): boolean => {
  if (typeof window === 'undefined') return false
  return Math.min(window.innerWidth, window.innerHeight) < PHONE_SHORT_SIDE_PX
}

export const ASSISTANT_HISTORY_FLAG = 'familyosAssistant' as const

let phoneAssistantHistoryOwned = false

export const claimAssistantHistory = (): boolean => {
  if (phoneAssistantHistoryOwned) return false
  phoneAssistantHistoryOwned = true
  return true
}

export const releaseAssistantHistory = (): boolean => {
  if (!phoneAssistantHistoryOwned) return false
  phoneAssistantHistoryOwned = false
  return true
}

export const withAssistantHistoryState = (state: unknown): Record<string, unknown> => ({
  ...(typeof state === 'object' && state !== null ? state as Record<string, unknown> : {}),
  [ASSISTANT_HISTORY_FLAG]: true,
})
