import type { Screen } from './types'

export const LOGIN_PATH = '/login'

const YEAR_MONTH = /^\d{4}-\d{2}$/

/** Canonical path for each main app screen. */
export const SCREEN_PATHS: Record<Screen, string> = {
  dashboard: '/',
  calendar: '/calendar',
  tasks: '/tasks',
  shopping: '/shopping',
  budget: '/budget/plan',
  budgetSpend: '/budget',
  budgetInsights: '/budget/insights',
  budgetActivity: '/budget/activity',
  notifications: '/notifications',
  family: '/family',
  settings: '/settings',
}

const PATH_TO_SCREEN: Record<string, Screen> = {
  '/': 'dashboard',
  '/calendar': 'calendar',
  '/tasks': 'tasks',
  '/shopping': 'shopping',
  '/budget': 'budgetSpend',
  '/budget/plan': 'budget',
  '/budget/insights': 'budgetInsights',
  '/budget/activity': 'budgetActivity',
  '/notifications': 'notifications',
  '/family': 'family',
  '/settings': 'settings',
}

/** Paths from earlier releases that still need to resolve for bookmarks and push links. */
const LEGACY_PATH_REDIRECTS: Record<string, string> = {
  '/expenses': SCREEN_PATHS.budgetSpend,
  '/expenses/activity': SCREEN_PATHS.budgetActivity,
  '/insights': SCREEN_PATHS.budgetInsights,
  '/budget/spend': SCREEN_PATHS.budgetSpend,
}

export function parseYearMonth(value: string | null | undefined): string | null {
  if (!value || !YEAR_MONTH.test(value)) return null
  return value
}

const PERIOD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parsePeriodId(value: string | null | undefined): string | null {
  if (!value || !PERIOD_ID.test(value)) return null
  return value
}

export function budgetActivityPath(periodId?: string | null): string {
  const path = SCREEN_PATHS.budgetActivity
  const parsed = parsePeriodId(periodId)
  if (!parsed) return path
  return `${path}?period=${parsed}`
}

export function isBudgetSection(screen: Screen): boolean {
  return (
    screen === 'budget'
    || screen === 'budgetSpend'
    || screen === 'budgetInsights'
    || screen === 'budgetActivity'
  )
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

export function normalizePathname(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

/** Map pathname to a Screen; unknown paths return null. */
export function pathToScreen(pathname: string): Screen | null {
  return PATH_TO_SCREEN[normalizePathname(pathname)] ?? null
}

export function isLoginPath(pathname: string): boolean {
  return normalizePathname(pathname) === LOGIN_PATH
}

/** Returns the current path for a retired route, otherwise null. */
export function legacyPathRedirect(pathname: string): string | null {
  return LEGACY_PATH_REDIRECTS[normalizePathname(pathname)] ?? null
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
