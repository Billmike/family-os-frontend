import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import {
  applyResolvedTheme,
  getStoredPreference,
  getSystemPrefersDark,
  resolveTheme,
  setStoredPreference,
  type ResolvedTheme,
  type ThemePreference,
} from './theme'

interface ThemeContextValue {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(getStoredPreference)
  const [prefersDark, setPrefersDark] = useState(getSystemPrefersDark)
  const resolved = resolveTheme(preference, prefersDark)

  useLayoutEffect(() => {
    applyResolvedTheme(resolved)
  }, [resolved])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => setPrefersDark(media.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const setPreference = useCallback((next: ThemePreference) => {
    setStoredPreference(next)
    setPreferenceState(next)
  }, [])

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
