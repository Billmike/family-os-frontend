export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'familyos_theme'
export const THEME_BG_LIGHT = '#F3EDE4'
export const THEME_BG_DARK = '#16140F'

export const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system'

export const getStoredPreference = (): ThemePreference => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemePreference(stored)) return stored
  } catch {
    /* private mode / blocked storage */
  }
  return 'system'
}

export const setStoredPreference = (preference: ThemePreference): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    /* ignore */
  }
}

export const getSystemPrefersDark = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const resolveTheme = (
  preference: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme => {
  if (preference === 'system') return prefersDark ? 'dark' : 'light'
  return preference
}

export const applyResolvedTheme = (resolved: ResolvedTheme): void => {
  const isDark = resolved === 'dark'
  const root = document.documentElement
  root.classList.toggle('dark', isDark)
  root.style.colorScheme = isDark ? 'dark' : 'light'
  root.style.backgroundColor = ''
  root.style.color = ''

  const computedBg = getComputedStyle(root).getPropertyValue('--ds-bg').trim()
  const themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) {
    themeColor.setAttribute('content', computedBg || (isDark ? THEME_BG_DARK : THEME_BG_LIGHT))
  }

  const statusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
  if (statusBar) {
    statusBar.setAttribute('content', isDark ? 'black-translucent' : 'default')
  }
}
