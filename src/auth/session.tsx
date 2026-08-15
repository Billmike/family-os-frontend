import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as authApi from '../api/auth'
import * as familiesApi from '../api/families'
import {
  clearTokens,
  getAccessToken,
  getStoredFamilyId,
  setAuthFailureHandler,
  setStoredFamilyId,
  storeTokens,
} from '../api/client'
import { toUiMember } from '../api/adapters'
import type { FamilyOut, MemberOut, TokenPair, UserOut } from '../api/types'
import type { Member } from '../types'
import { setMembersCache } from '../data'
import { resubscribeIfGranted, unsubscribeThisDevice } from '../lib/push/webPush'

export type SessionStatus = 'loading' | 'unauthenticated' | 'needs_family' | 'ready'

interface SessionContextValue {
  status: SessionStatus
  user: UserOut | null
  family: FamilyOut | null
  families: FamilyOut[]
  members: Member[]
  rawMembers: MemberOut[]
  currentMember: Member | null
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  selectFamily: (familyId: string) => Promise<void>
  refreshFamily: () => Promise<void>
  setFamilyFromCreate: (family: FamilyOut) => Promise<void>
  clearError: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

async function loadSessionState(): Promise<{
  user: UserOut
  families: FamilyOut[]
  family: FamilyOut | null
  rawMembers: MemberOut[]
}> {
  const user = await authApi.getMe()
  const families = await familiesApi.listMyFamilies()
  const stored = getStoredFamilyId()
  const family =
    families.find(f => f.id === stored) ?? families[0] ?? null
  if (family) setStoredFamilyId(family.id)
  else setStoredFamilyId(null)
  const rawMembers = family ? await familiesApi.listMembers(family.id) : []
  return { user, families, family, rawMembers }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [user, setUser] = useState<UserOut | null>(null)
  const [families, setFamilies] = useState<FamilyOut[]>([])
  const [family, setFamily] = useState<FamilyOut | null>(null)
  const [rawMembers, setRawMembers] = useState<MemberOut[]>([])
  const [error, setError] = useState<string | null>(null)

  const members = useMemo(() => rawMembers.map(toUiMember), [rawMembers])

  const currentMember = useMemo(() => {
    if (!user) return null
    const raw = rawMembers.find(m => m.user_id === user.id)
    return raw ? toUiMember(raw) : members[0] ?? null
  }, [user, rawMembers, members])

  useEffect(() => {
    setMembersCache(members)
  }, [members])

  const applyLoaded = useCallback(
    (data: Awaited<ReturnType<typeof loadSessionState>>) => {
      setUser(data.user)
      setFamilies(data.families)
      setFamily(data.family)
      setRawMembers(data.rawMembers)
      setStatus(data.family ? 'ready' : 'needs_family')
    },
    [],
  )

  const bootstrap = useCallback(async () => {
    if (!getAccessToken()) {
      setStatus('unauthenticated')
      return
    }
    try {
      const data = await loadSessionState()
      applyLoaded(data)
      void resubscribeIfGranted()
    } catch {
      clearTokens()
      setUser(null)
      setFamily(null)
      setFamilies([])
      setRawMembers([])
      setStatus('unauthenticated')
    }
  }, [applyLoaded])

  useEffect(() => {
    setAuthFailureHandler(() => {
      void unsubscribeThisDevice()
      clearTokens()
      setStoredFamilyId(null)
      setUser(null)
      setFamily(null)
      setFamilies([])
      setRawMembers([])
      setStatus('unauthenticated')
    })
    void bootstrap()
    return () => setAuthFailureHandler(null)
  }, [bootstrap])

  const afterAuth = useCallback(
    async (tokens: TokenPair) => {
      storeTokens(tokens)
      const data = await loadSessionState()
      applyLoaded(data)
      void resubscribeIfGranted()
    },
    [applyLoaded],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null)
      const tokens = await authApi.login(email, password)
      await afterAuth(tokens)
    },
    [afterAuth],
  )

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      setError(null)
      const tokens = await authApi.register(email, password, name)
      await afterAuth(tokens)
    },
    [afterAuth],
  )

  const logout = useCallback(() => {
    void unsubscribeThisDevice().finally(() => {
      clearTokens()
      setStoredFamilyId(null)
      setUser(null)
      setFamily(null)
      setFamilies([])
      setRawMembers([])
      setStatus('unauthenticated')
    })
  }, [])

  const selectFamily = useCallback(async (familyId: string) => {
    setStoredFamilyId(familyId)
    const fam = await familiesApi.getFamily(familyId)
    const mems = await familiesApi.listMembers(familyId)
    setFamily(fam)
    setRawMembers(mems)
    setFamilies(prev => {
      const exists = prev.some(f => f.id === fam.id)
      return exists ? prev.map(f => (f.id === fam.id ? fam : f)) : [...prev, fam]
    })
    setStatus('ready')
  }, [])

  const refreshFamily = useCallback(async () => {
    if (!family) return
    const fam = await familiesApi.getFamily(family.id)
    const mems = await familiesApi.listMembers(family.id)
    setFamily(fam)
    setRawMembers(mems)
  }, [family])

  const setFamilyFromCreate = useCallback(async (fam: FamilyOut) => {
    setStoredFamilyId(fam.id)
    const mems = await familiesApi.listMembers(fam.id)
    setFamily(fam)
    setRawMembers(mems)
    setFamilies(prev => {
      const exists = prev.some(f => f.id === fam.id)
      return exists ? prev.map(f => (f.id === fam.id ? fam : f)) : [...prev, fam]
    })
    setStatus('ready')
  }, [])

  const value: SessionContextValue = {
    status,
    user,
    family,
    families,
    members,
    rawMembers,
    currentMember,
    error,
    login,
    register,
    logout,
    selectFamily,
    refreshFamily,
    setFamilyFromCreate,
    clearError: () => setError(null),
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
