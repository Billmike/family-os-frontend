import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Check, ChevronLeft, Copy, Bell, Download, Plus, CheckSquare, ShoppingCart, ArrowRight } from 'lucide-react'
import { t, r, sh } from '../ui'
import { ApiError } from '../api/client'
import * as familiesApi from '../api/families'
import type { FamilyOut } from '../api/types'
import { InstallStepsList } from '../lib/pwa/InstallStepsList'
import { usePwaInstall } from '../lib/pwa/usePwaInstall'
import { iosInstallRequired, subscribeThisDevice } from '../lib/push/webPush'
import {
  clearPendingInviteToken,
  getPendingInviteToken,
  normalizeInviteTokenInput,
} from '../invite/pendingInvite'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step =
  | 'welcome'
  | 'login'
  | 'register'
  | 'join'
  | 'family'
  | 'members'
  | 'invite'
  | 'highlights'
  | 'notify'
  | 'install'

const MEMBER_COLORS = [
  { color: '#6366F1', bg: '#EEF2FF', label: 'Indigo' },
  { color: '#0284C7', bg: '#E0F2FE', label: 'Sky' },
  { color: '#059669', bg: '#ECFDF5', label: 'Emerald' },
  { color: '#D97706', bg: '#FEF3C7', label: 'Amber' },
  { color: '#E11D48', bg: '#FFF1F2', label: 'Rose' },
  { color: '#7C3AED', bg: '#F5F3FF', label: 'Violet' },
]

const PROGRESS_STEPS: Step[] = ['family', 'members', 'invite']

interface Child { name: string; id: string }

export interface OnboardingHandlers {
  register: (email: string, password: string, name: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  /** After create family — session becomes ready */
  onFamilyCreated: (family: FamilyOut) => Promise<void>
  /** After accepting invite */
  onJoinedFamily: (familyId: string) => Promise<void>
  /** Enter app (session already ready) */
  onEnterApp: () => void
  needsFamily: boolean
  userName?: string
}

interface Props {
  handlers: OnboardingHandlers
}

// ─── Shared layout ────────────────────────────────────────────────────────────

const shell: CSSProperties = {
  minHeight: '100dvh', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'flex-start',
  background: t.bg, padding: '24px 16px 40px',
  overflowY: 'auto', boxSizing: 'border-box',
}

const card: CSSProperties = {
  width: '100%', maxWidth: 440,
  background: t.surface, borderRadius: r.xl,
  boxShadow: sh.md, border: `1px solid ${t.border}`,
  padding: '24px 20px 24px',
  display: 'flex', flexDirection: 'column', gap: 0,
  marginTop: 'auto', marginBottom: 'auto',
}

const inputStyle: CSSProperties = {
  width: '100%', height: 48, padding: '0 14px',
  borderRadius: 'var(--ds-radius-md)',
  border: `1.5px solid var(--ds-border-strong)`,
  background: t.surface, fontSize: 16,
  fontFamily: 'var(--ds-font)', color: t.text,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

function Input({ placeholder, value, onChange, autoFocus, type = 'text', name, autoComplete, id }: {
  placeholder?: string; value: string; onChange: (v: string) => void;
  autoFocus?: boolean; type?: string; name?: string; autoComplete?: string; id?: string
}) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      autoComplete={autoComplete}
      style={inputStyle}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      autoFocus={autoFocus}
      onFocus={e => { e.target.style.borderColor = 'var(--ds-primary)'; e.target.style.boxShadow = '0 0 0 3px var(--ds-focus)' }}
      onBlur={e => { e.target.style.borderColor = 'var(--ds-border-strong)'; e.target.style.boxShadow = 'none' }}
    />
  )
}

function PrimaryBtn({ onClick, disabled, children, type = 'button' }: {
  onClick?: () => void; disabled?: boolean; children: React.ReactNode; type?: 'button' | 'submit'
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '14px', borderRadius: r.md, border: 'none',
      background: disabled ? 'var(--ds-disabled-bg)' : t.primary,
      color: disabled ? 'var(--ds-disabled-text)' : '#fff',
      fontSize: 16, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'var(--ds-font)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 8, transition: 'background 0.15s',
    }}>
      {children}
    </button>
  )
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      width: '100%', padding: '12px', borderRadius: r.md,
      border: `1px solid ${t.border}`, background: 'transparent',
      fontSize: 15, fontWeight: 400, cursor: 'pointer', color: t.textSec,
      fontFamily: 'var(--ds-font)',
    }}>
      {children}
    </button>
  )
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      alignSelf: 'flex-start',
      background: 'none', border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 4,
      color: t.textSec, fontFamily: 'var(--ds-font)', fontSize: 14,
      padding: '0 0 16px', margin: 0,
    }}>
      <ChevronLeft size={18} /> Back
    </button>
  )
}

function ProgressDots({ current }: { current: Step }) {
  const idx = PROGRESS_STEPS.indexOf(current)
  if (idx === -1) return null
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 28 }}>
      {PROGRESS_STEPS.map((_, i) => (
        <div key={i} style={{
          height: 4, borderRadius: 9999,
          width: i === idx ? 20 : 6,
          background: i <= idx ? t.primary : t.border,
          transition: 'all 0.3s',
        }} />
      ))}
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, fontWeight: 700, color: t.textTer, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{children}</p>
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h1 style={{ fontSize: 26, fontWeight: 700, color: t.text, letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 8 }}>{children}</h1>
}

function Sub({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 14, color: t.textSec, lineHeight: 1.65, marginBottom: 24 }}>{children}</p>
}

function ErrorText({ message }: { message: string | null }) {
  if (!message) return null
  return <p style={{ fontSize: 13, color: 'var(--ds-error)', marginBottom: 12, lineHeight: 1.4 }}>{message}</p>
}

function errMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return 'Something went wrong'
}

// ─── Main Onboarding component ────────────────────────────────────────────────

export default function Onboarding({ handlers }: Props) {
  const pendingAtStart = getPendingInviteToken()
  const [step, setStep] = useState<Step>(() => {
    if (pendingAtStart && handlers.needsFamily) return 'join'
    if (pendingAtStart) return 'welcome'
    return handlers.needsFamily ? 'family' : 'welcome'
  })
  const [familyName, setFamilyName] = useState('')
  const [userName, setUserName] = useState(handlers.userName ?? '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [children, setChildren] = useState<Child[]>([])
  const [childName, setChildName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [joinToken, setJoinToken] = useState(pendingAtStart ?? '')
  const [copied, setCopied] = useState(false)
  const pwa = usePwaInstall()
  const [installBusy, setInstallBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdFamilyId, setCreatedFamilyId] = useState<string | null>(null)
  const [hasPendingInvite, setHasPendingInvite] = useState(Boolean(pendingAtStart))
  const acceptLock = useRef(false)

  const go = (s: Step) => {
    setError(null)
    setStep(s)
  }

  const acceptInviteToken = async (raw: string) => {
    const token = normalizeInviteTokenInput(raw)
    if (!token) {
      setError('Paste an invite token or link to join')
      return false
    }
    if (acceptLock.current) return false
    acceptLock.current = true
    setBusy(true)
    setError(null)
    try {
      const result = await familiesApi.acceptInvitation(token)
      clearPendingInviteToken()
      setHasPendingInvite(false)
      await handlers.onJoinedFamily(result.family.id)
      handlers.onEnterApp()
      return true
    } catch (e) {
      acceptLock.current = false
      setError(errMessage(e))
      return false
    } finally {
      setBusy(false)
    }
  }

  // After login lands on needs_family, continue into family setup or pending invite
  useEffect(() => {
    if (!handlers.needsFamily) return
    if (step !== 'login' && step !== 'welcome' && step !== 'register') return
    const pending = getPendingInviteToken()
    if (pending) {
      setHasPendingInvite(true)
      setJoinToken(pending)
      go('join')
      return
    }
    if (step === 'login') go('family')
  }, [handlers.needsFamily]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-accept when we have a pending deep-link token on the join step
  useEffect(() => {
    if (step !== 'join') return
    if (!handlers.needsFamily) return
    const pending = getPendingInviteToken()
    if (!pending || acceptLock.current) return
    void acceptInviteToken(pending)
  }, [step, handlers.needsFamily]) // eslint-disable-line react-hooks/exhaustive-deps

  const addChild = () => {
    if (!childName.trim()) return
    setChildren(c => [...c, { name: childName.trim(), id: `c${Date.now()}` }])
    setChildName('')
  }

  const copyLink = () => {
    if (!inviteLink) return
    navigator.clipboard?.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const doLogin = async () => {
    setBusy(true)
    setError(null)
    try {
      await handlers.login(email.trim(), password)
      const pending = getPendingInviteToken()
      if (pending) {
        setHasPendingInvite(true)
        setJoinToken(pending)
        // needs_family effect / join auto-accept will finish; if already ready, AppRoot handles it
        go('join')
        return
      }
      handlers.onEnterApp()
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const doRegister = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await handlers.register(email.trim(), password, userName.trim())
      const pending = getPendingInviteToken()
      if (pending) {
        setHasPendingInvite(true)
        setJoinToken(pending)
        const ok = await acceptInviteToken(pending)
        if (!ok) go('join')
        return
      }
      go('family')
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const doCreateFamily = async () => {
    setBusy(true)
    setError(null)
    try {
      const fam = await familiesApi.createFamily(familyName.trim())
      setCreatedFamilyId(fam.id)
      await handlers.onFamilyCreated(fam)
      go('members')
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const doAddChildren = async () => {
    const familyId = createdFamilyId
    if (!familyId) {
      go('invite')
      return
    }
    setBusy(true)
    setError(null)
    try {
      for (const child of children) {
        await familiesApi.addMember(familyId, { name: child.name, role: 'Child' })
      }
      go('invite')
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const ensureInviteLink = async () => {
    const familyId = createdFamilyId
    if (!familyId || inviteLink) return
    try {
      const inv = await familiesApi.createInvitation(familyId, {})
      setInviteLink(inv.invite_url)
      setInviteToken(inv.invite_token)
    } catch {
      /* ignore — user can still email invite */
    }
  }

  const doInviteAndContinue = async () => {
    const familyId = createdFamilyId
    if (!familyId) {
      go('highlights')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (inviteEmail.includes('@')) {
        const inv = await familiesApi.createInvitation(familyId, {
          email: inviteEmail.trim(),
        })
        setInviteLink(inv.invite_url)
        setInviteToken(inv.invite_token)
      } else if (!inviteLink) {
        await ensureInviteLink()
      }
      go('highlights')
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const doJoin = async () => {
    await acceptInviteToken(joinToken.trim() || inviteToken.trim() || getPendingInviteToken() || '')
  }

  // Welcome
  if (step === 'welcome') return (
    <div style={shell}>
      <div style={{ ...card, textAlign: 'center', gap: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <img
            src="/icons/icon-192.png"
            alt=""
            width={64}
            height={64}
            style={{ width: 64, height: 64, borderRadius: 20, boxShadow: sh.md }}
          />
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: t.text, letterSpacing: '-0.025em', lineHeight: 1.2, marginBottom: 10 }}>
          {hasPendingInvite ? <>You&apos;re invited</> : <>Welcome to<br />FamilyOS</>}
        </h1>
        <p style={{ fontSize: 15, color: t.textSec, lineHeight: 1.65, marginBottom: 32, maxWidth: 320, margin: '0 auto 32px' }}>
          {hasPendingInvite
            ? 'Create an account or sign in to join the family. Your invite is ready.'
            : 'The calm, organised way to manage your household together.'}
        </p>
        <PrimaryBtn onClick={() => go('register')}>
          {hasPendingInvite ? 'Join with a new account' : 'Get started'} <ArrowRight size={18} />
        </PrimaryBtn>
        <button
          onClick={() => go('login')}
          style={{ marginTop: 14, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: t.textTer, fontFamily: 'var(--ds-font)' }}
        >
          I already have an account
        </button>
        {!hasPendingInvite && (
          <button
            onClick={() => go('join')}
            style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: t.textTer, fontFamily: 'var(--ds-font)' }}
          >
            I have an invite link
          </button>
        )}
      </div>
    </div>
  )

  // Login
  if (step === 'login') return (
    <div style={shell}>
      <form
        style={{ ...card }}
        onSubmit={e => {
          e.preventDefault()
          if (busy || !email.includes('@') || password.length < 8) return
          void doLogin()
        }}
      >
        <BackBtn onClick={() => go('welcome')} />
        <Eyebrow>Sign in</Eyebrow>
        <Heading>Welcome back</Heading>
        <Sub>
          {hasPendingInvite
            ? 'Sign in to accept your family invitation.'
            : 'Sign in to continue to your family.'}
        </Sub>
        <ErrorText message={error} />
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="login-email" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSec, marginBottom: 6 }}>Email</label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="you@email.com"
            value={email}
            onChange={setEmail}
            autoFocus
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="login-password" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSec, marginBottom: 6 }}>Password</label>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
          />
        </div>
        <PrimaryBtn type="submit" disabled={busy || !email.includes('@') || password.length < 8}>
          {busy ? 'Signing in…' : 'Sign in'}
        </PrimaryBtn>
        {!hasPendingInvite && (
          <p style={{ fontSize: 12, color: t.textTer, marginTop: 14, textAlign: 'center', lineHeight: 1.5 }}>
            Have an invite? Sign in first, then join from the family setup screen.
          </p>
        )}
      </form>
    </div>
  )

  // Register
  if (step === 'register') return (
    <div style={shell}>
      <form
        style={{ ...card }}
        onSubmit={e => {
          e.preventDefault()
          if (busy || !userName.trim() || !email.includes('@') || password.length < 8) return
          void doRegister()
        }}
      >
        <BackBtn onClick={() => go('welcome')} />
        <Eyebrow>Create account</Eyebrow>
        <Heading>Create your account</Heading>
        <Sub>
          {hasPendingInvite
            ? 'Create an account to accept your family invitation.'
            : "You'll use this to sign in and manage your family."}
        </Sub>
        <ErrorText message={error} />
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="register-name" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSec, marginBottom: 6 }}>Your name</label>
          <Input
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="e.g. Kayode"
            value={userName}
            onChange={setUserName}
            autoFocus
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="register-email" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSec, marginBottom: 6 }}>Email</label>
          <Input
            id="register-email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="you@email.com"
            value={email}
            onChange={setEmail}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="register-password" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSec, marginBottom: 6 }}>Password</label>
          <Input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={setPassword}
          />
        </div>
        <PrimaryBtn
          type="submit"
          disabled={busy || !userName.trim() || !email.includes('@') || password.length < 8}
        >
          {busy ? 'Creating…' : 'Continue'} <ArrowRight size={18} />
        </PrimaryBtn>
      </form>
    </div>
  )

  // Join with token (after login or from welcome)
  if (step === 'join') return (
    <div style={shell}>
      <div style={{ ...card }}>
        <BackBtn onClick={() => go(getAccessHint() ? 'login' : 'welcome')} />
        <Eyebrow>Join family</Eyebrow>
        <Heading>{busy && hasPendingInvite ? 'Joining…' : 'Have an invite?'}</Heading>
        <Sub>
          {hasPendingInvite
            ? 'Accepting your invitation. If this stalls, paste the invite link below and try again.'
            : 'Paste the invite link or token to join a family.'}
        </Sub>
        <ErrorText message={error} />
        <div style={{ marginBottom: 20 }}>
          <Input
            placeholder="Invite link or token"
            value={joinToken}
            onChange={setJoinToken}
            autoFocus
          />
        </div>
        <PrimaryBtn onClick={() => void doJoin()} disabled={busy || !joinToken.trim()}>
          {busy ? 'Joining…' : 'Join family'}
        </PrimaryBtn>
        <p style={{ fontSize: 12, color: t.textTer, marginTop: 12, lineHeight: 1.5 }}>
          You must be signed in to accept an invite. Sign in first if you have not already.
        </p>
      </div>
    </div>
  )

  // Create Family
  if (step === 'family') return (
    <div style={shell}>
      <div style={{ ...card }}>
        {!handlers.needsFamily && <BackBtn onClick={() => go('register')} />}
        <ProgressDots current="family" />
        <Eyebrow>Step 1 of 3</Eyebrow>
        <Heading>{"What's your family called?"}</Heading>
        <Sub>This is how your household will appear in FamilyOS. You can change it later.</Sub>
        <ErrorText message={error} />
        <div style={{ marginBottom: 24 }}>
          <Input
            placeholder="e.g. The Ayelegun Family"
            value={familyName}
            onChange={setFamilyName}
            autoFocus
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {['The Ayelegun Family', 'Ayelegun Household', 'Team Ayelegun'].map(s => (
            <button key={s} onClick={() => setFamilyName(s)} style={{
              padding: '5px 12px', borderRadius: r.pill, border: `1px solid ${t.border}`,
              background: familyName === s ? t.primarySubtle : t.surface,
              color: familyName === s ? t.primary : t.textSec,
              fontSize: 13, cursor: 'pointer', fontFamily: 'var(--ds-font)',
            }}>{s}</button>
          ))}
        </div>
        <PrimaryBtn onClick={() => void doCreateFamily()} disabled={busy || !familyName.trim()}>
          {busy ? 'Creating…' : 'Continue'} <ArrowRight size={18} />
        </PrimaryBtn>
        <div style={{ marginTop: 10 }}>
          <GhostBtn onClick={() => go('join')}>I have an invite instead</GhostBtn>
        </div>
      </div>
    </div>
  )

  // Add Family Members
  if (step === 'members') return (
    <div style={shell}>
      <div style={{ ...card }}>
        <ProgressDots current="members" />
        <Eyebrow>Step 2 of 3</Eyebrow>
        <Heading>{"Who else is in your family?"}</Heading>
        <Sub>Add children or other household members. You can invite adults separately.</Sub>
        <ErrorText message={error} />

        {children.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {children.map(child => (
              <div key={child.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: r.md, background: t.surfaceMuted, border: `1px solid ${t.border}`,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 9999, background: MEMBER_COLORS[2].bg, color: MEMBER_COLORS[2].color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600 }}>
                  {child.name[0].toUpperCase()}
                </div>
                <span style={{ flex: 1, fontSize: 15, color: t.text }}>{child.name}</span>
                <button
                  onClick={() => setChildren(c => c.filter(ch => ch.id !== child.id))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: t.textTer, fontSize: 18, lineHeight: 1 }}
                >×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <Input placeholder="Child's name" value={childName} onChange={setChildName} />
          <button
            onClick={addChild}
            disabled={!childName.trim()}
            style={{
              width: 48, height: 48, borderRadius: r.md, border: 'none',
              background: childName.trim() ? t.primary : t.surfaceMuted,
              color: childName.trim() ? '#fff' : t.textTer,
              cursor: childName.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <Plus size={20} />
          </button>
        </div>

        <PrimaryBtn onClick={() => void doAddChildren()} disabled={busy}>
          {busy ? 'Saving…' : 'Continue'} <ArrowRight size={18} />
        </PrimaryBtn>
        <div style={{ marginTop: 10 }}>
          <GhostBtn onClick={() => { void ensureInviteLink(); go('invite') }}>Skip for now</GhostBtn>
        </div>
      </div>
    </div>
  )

  // Invite Partner
  if (step === 'invite') {
    if (!inviteLink && createdFamilyId) void ensureInviteLink()
    return (
      <div style={shell}>
        <div style={{ ...card }}>
          <ProgressDots current="invite" />
          <Eyebrow>Step 3 of 3</Eyebrow>
          <Heading>Invite your partner</Heading>
          <Sub>Copy and share this link. Email delivery is not enabled yet — the link is the invite.</Sub>
          <ErrorText message={error} />

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSec, marginBottom: 6, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Invite link</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, height: 48, padding: '0 12px', borderRadius: r.md, border: `1px solid ${t.border}`, background: t.surfaceMuted, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                <span style={{ fontSize: 13, color: t.textSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inviteLink || 'Generating link…'}
                </span>
              </div>
              <button
                onClick={copyLink}
                disabled={!inviteLink}
                style={{
                  width: 48, height: 48, borderRadius: r.md, flexShrink: 0,
                  border: `1px solid ${t.border}`, background: copied ? t.successSub : t.surface,
                  cursor: inviteLink ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
              >
                {copied ? <Check size={18} color={t.success} /> : <Copy size={18} color={t.textSec} />}
              </button>
            </div>
            {copied && <p style={{ fontSize: 12, color: t.success, marginTop: 6 }}>Link copied to clipboard</p>}
          </div>

          <div style={{ position: 'relative', textAlign: 'center', margin: '8px 0 16px' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: t.border }} />
            <span style={{ position: 'relative', background: t.surface, padding: '0 12px', fontSize: 12, color: t.textTer }}>optional</span>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSec, marginBottom: 6 }}>
              Email (saved for later — not sent yet)
            </label>
            <Input placeholder="partner@email.com" value={inviteEmail} onChange={setInviteEmail} type="email" />
          </div>
          <p style={{ fontSize: 12, color: t.textTer, marginBottom: 24, lineHeight: 1.5 }}>
            Share the invite link above. We&apos;ll use the email when delivery is turned on.
          </p>

          <PrimaryBtn onClick={() => void doInviteAndContinue()} disabled={busy}>
            {busy ? 'Saving…' : 'Continue'} <ArrowRight size={18} />
          </PrimaryBtn>
          <div style={{ marginTop: 10 }}>
            <GhostBtn onClick={() => go('highlights')}>Skip for now</GhostBtn>
          </div>
        </div>
      </div>
    )
  }

  // Feature highlights
  if (step === 'highlights') return (
    <div style={shell}>
      <div style={{ ...card }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: t.text, letterSpacing: '-0.02em', marginBottom: 8 }}>
            {"You're all set,"}
            <br />{userName || handlers.userName || 'there'}!
          </h1>
          <p style={{ fontSize: 14, color: t.textSec, lineHeight: 1.6 }}>
            {familyName || 'Your family'} is ready to go. Here is what you can do first.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {[
            { icon: <CheckSquare size={20} color="#6366F1" strokeWidth={1.75} />, bg: '#EEF2FF', title: 'Add your first task', body: 'Assign chores, errands, and reminders to family members.' },
            { icon: <Plus size={20} color="#059669" strokeWidth={1.75} />, bg: '#ECFDF5', title: 'Create a calendar event', body: 'Keep everyone on the same schedule.' },
            { icon: <ShoppingCart size={20} color="#D97706" strokeWidth={1.75} />, bg: '#FEF3C7', title: 'Start a shopping list', body: 'Add items and check them off as you shop.' },
          ].map(f => (
            <div key={f.title} style={{ display: 'flex', gap: 14, padding: '14px', borderRadius: r.lg, border: `1px solid ${t.border}`, background: t.surface }}>
              <div style={{ width: 40, height: 40, borderRadius: r.md, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {f.icon}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 3 }}>{f.title}</p>
                <p style={{ fontSize: 13, color: t.textSec, lineHeight: 1.5 }}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>

        <PrimaryBtn onClick={() => go('notify')}>
          {"Let's go"} <ArrowRight size={18} />
        </PrimaryBtn>
      </div>
    </div>
  )

  // Enable Notifications
  if (step === 'notify') return (
    <div style={shell}>
      <div style={{ ...card, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: t.primarySubtle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={32} color={t.primary} strokeWidth={1.5} />
          </div>
        </div>
        <Heading>Stay in the loop</Heading>
        <Sub>{"Get notified when a family member assigns a task, adds a shopping item, or creates an event. You can adjust this any time in Settings."}</Sub>

        <div style={{ background: t.surfaceMuted, borderRadius: r.lg, border: `1px solid ${t.border}`, padding: '16px', marginBottom: 24, textAlign: 'left' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: t.textSec, marginBottom: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{"You'll be notified for"}</p>
          {['Events and reminders', 'Task assigned to you', 'Task due soon', 'Items added or bought', 'Someone joins the family'].map((item, i) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i > 0 ? `1px solid ${t.border}` : 'none' }}>
              <div style={{ width: 18, height: 18, borderRadius: 5, background: t.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={11} color="#fff" strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 14, color: t.text }}>{item}</span>
            </div>
          ))}
        </div>

        {iosInstallRequired() && (
          <p style={{ fontSize: 13, color: t.textSec, lineHeight: 1.5, marginBottom: 16, textAlign: 'left' }}>
            On iPhone and iPad, install FamilyOS to your Home Screen first, then enable notifications from Settings.
          </p>
        )}

        <PrimaryBtn
          disabled={busy}
          onClick={() => {
            void (async () => {
              setBusy(true)
              setError(null)
              try {
                if (!iosInstallRequired()) {
                  await subscribeThisDevice()
                }
              } catch {
                /* permission denied / unavailable — continue onboarding */
              } finally {
                setBusy(false)
                go('install')
              }
            })()
          }}
        >
          <Bell size={18} /> Allow notifications
        </PrimaryBtn>
        <div style={{ marginTop: 10 }}>
          <GhostBtn onClick={() => go('install')}>Not now</GhostBtn>
        </div>
      </div>
    </div>
  )

  // Install PWA
  if (step === 'install') {
    const installed = pwa.mode === 'installed'
    const showIosSteps = pwa.mode === 'ios'
    const showManualSteps = pwa.mode === 'manual'
    const canNativePrompt = pwa.mode === 'prompt'

    const onInstallClick = async () => {
      if (!canNativePrompt) return
      setInstallBusy(true)
      try {
        await pwa.promptInstall()
      } finally {
        setInstallBusy(false)
      }
    }

    return (
      <div style={shell}>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <img
              src="/icons/icon-192.png"
              alt=""
              width={72}
              height={72}
              style={{ width: 72, height: 72, borderRadius: 22, boxShadow: sh.md }}
            />
          </div>
          <Heading>{installed ? "You're all set" : 'Add to your home screen'}</Heading>
          <Sub>
            {installed
              ? 'FamilyOS is installed. Open it anytime from your home screen.'
              : 'Install FamilyOS for the best experience — it works like a native app, even offline.'}
          </Sub>

          {(showIosSteps || showManualSteps) && (
            <div style={{ marginBottom: 24 }}>
              <InstallStepsList variant={showIosSteps ? 'ios' : 'manual'} />
            </div>
          )}

          {installed ? (
            <PrimaryBtn onClick={() => handlers.onEnterApp()}>
              Continue to FamilyOS
            </PrimaryBtn>
          ) : canNativePrompt ? (
            <>
              <PrimaryBtn onClick={() => void onInstallClick()} disabled={installBusy}>
                <Download size={18} /> {installBusy ? 'Installing…' : 'Install FamilyOS'}
              </PrimaryBtn>
              <div style={{ marginTop: 10 }}>
                <GhostBtn onClick={() => handlers.onEnterApp()}>Take me to the app</GhostBtn>
              </div>
            </>
          ) : (
            <>
              <PrimaryBtn onClick={() => handlers.onEnterApp()}>
                Got it — take me to the app
              </PrimaryBtn>
              <div style={{ marginTop: 10 }}>
                <GhostBtn onClick={() => handlers.onEnterApp()}>Skip for now</GhostBtn>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return null
}

function getAccessHint(): boolean {
  try {
    return Boolean(localStorage.getItem('familyos_access_token'))
  } catch {
    return false
  }
}
