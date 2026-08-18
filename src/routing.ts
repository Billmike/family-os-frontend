import type { Screen } from './types'

/** Canonical path for each main app screen. */
export const SCREEN_PATHS: Record<Screen, string> = {
  dashboard: '/',
  calendar: '/calendar',
  tasks: '/tasks',
  shopping: '/shopping',
  insights: '/insights',
  notifications: '/notifications',
  family: '/family',
  settings: '/settings',
}

const PATH_TO_SCREEN: Record<string, Screen> = {
  '/': 'dashboard',
  '/calendar': 'calendar',
  '/tasks': 'tasks',
  '/shopping': 'shopping',
  '/insights': 'insights',
  '/notifications': 'notifications',
  '/family': 'family',
  '/settings': 'settings',
}

const LEGACY_GO_SCREENS = new Set<Screen>([
  'calendar',
  'tasks',
  'shopping',
  'notifications',
])

export function screenToPath(screen: Screen): string {
  return SCREEN_PATHS[screen]
}

/** Map pathname to a Screen; unknown paths return null. */
export function pathToScreen(pathname: string): Screen | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  return PATH_TO_SCREEN[normalized] ?? null
}

/**
 * Legacy push deep links used `/?go=tasks` (etc).
 * Returns the target path if a redirect is needed, otherwise null.
 */
export function legacyGoRedirectPath(search: string): string | null {
  const go = new URLSearchParams(search).get('go')
  if (!go || !LEGACY_GO_SCREENS.has(go as Screen)) return null
  return screenToPath(go as Screen)
}
