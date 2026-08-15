import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import { Check, CheckSquare, X } from 'lucide-react'
import type { Member } from './types'

// ─── Design token shorthands ─────────────────────────────────────────────────

export const t = {
  bg:           'var(--ds-bg)',
  surface:      'var(--ds-surface)',
  surfaceMuted: 'var(--ds-surface-muted)',
  text:         'var(--ds-text-primary)',
  textSec:      'var(--ds-text-secondary)',
  textTer:      'var(--ds-text-tertiary)',
  border:       'var(--ds-border)',
  borderStrong: 'var(--ds-border-strong)',
  primary:      'var(--ds-primary)',
  primaryHover: 'var(--ds-primary-hover)',
  primarySubtle:'var(--ds-primary-subtle)',
  success:      'var(--ds-success)',
  successSub:   'var(--ds-success-subtle)',
  warning:      'var(--ds-warning)',
  warningSub:   'var(--ds-warning-subtle)',
  error:        'var(--ds-error)',
  errorSub:     'var(--ds-error-subtle)',
  info:         'var(--ds-info)',
  infoSub:      'var(--ds-info-subtle)',
} as const

export const r = {
  sm:   'var(--ds-radius-sm)',
  md:   'var(--ds-radius-md)',
  lg:   'var(--ds-radius-lg)',
  xl:   'var(--ds-radius-xl)',
  pill: 'var(--ds-radius-pill)',
}

export const sh = {
  low:  'var(--ds-shadow-low)',
  md:   'var(--ds-shadow-md)',
  high: 'var(--ds-shadow-high)',
}

// ─── MemberAvatar ─────────────────────────────────────────────────────────────

export function MemberAvatar({ member, size = 32 }: { member: Member; size?: number }) {
  return (
    <div title={member.name} style={{
      width: size, height: size, borderRadius: 9999, flexShrink: 0,
      background: member.bg, color: member.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 600, userSelect: 'none',
    }}>
      {member.initials}
    </div>
  )
}

// ─── TaskCheckbox ─────────────────────────────────────────────────────────────

export function TaskCheckbox({ checked, onChange, size = 22 }: {
  checked: boolean; onChange: () => void; size?: number
}) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange() }}
      aria-label={checked ? 'Mark incomplete' : 'Mark complete'}
      style={{
        width: size, height: size, borderRadius: 7, border: 'none', padding: 0,
        background: checked ? t.success : 'transparent',
        outline: `1.5px solid ${checked ? t.success : t.borderStrong}`,
        cursor: 'pointer', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}
    >
      {checked && <Check size={size * 0.6} color="#fff" strokeWidth={2.5} />}
    </button>
  )
}

// ─── ShoppingCheckbox ─────────────────────────────────────────────────────────

export function ShoppingCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange() }}
      style={{
        width: 22, height: 22, borderRadius: 9999, border: 'none', padding: 0,
        background: checked ? t.success : 'transparent',
        outline: `1.5px solid ${checked ? t.success : t.borderStrong}`,
        cursor: 'pointer', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}
    >
      {checked && <Check size={13} color="#fff" strokeWidth={2.5} />}
    </button>
  )
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

export function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      role="switch" aria-checked={on}
      onClick={onChange}
      style={{
        width: 44, height: 26, borderRadius: 9999, border: 'none', padding: 0,
        background: on ? t.primary : t.border, cursor: 'pointer',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: on ? 21 : 3, width: 20, height: 20,
        borderRadius: 9999, background: '#fff',
        boxShadow: sh.low, transition: 'left 0.2s',
      }} />
    </button>
  )
}

// ─── Badge ───────────────────────────────────────────────────────────────────

export function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
      background: bg, color, letterSpacing: '0.02em',
    }}>{label}</span>
  )
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, color: t.textTer,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '10px 16px 6px',
    }}>{children}</p>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({ icon: Icon, title, body, action, onAction }: {
  icon: React.FC<{ size: number; color: string; strokeWidth: number }>
  title: string; body: string; action?: string; onAction?: () => void
}) {
  return (
    <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: r.xl, background: t.primarySubtle, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        <Icon size={26} color={t.primary} strokeWidth={1.5} />
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: t.text }}>{title}</p>
      <p style={{ fontSize: 14, color: t.textSec, lineHeight: 1.6, maxWidth: 240 }}>{body}</p>
      {action && onAction && (
        <button onClick={onAction} style={{
          marginTop: 8, padding: '9px 20px',
          background: t.primary, color: '#fff', border: 'none',
          borderRadius: r.md, fontSize: 14, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'var(--ds-font)',
        }}>{action}</button>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const skelStyle: CSSProperties = {
  background: 'linear-gradient(90deg, #E7E4DF 25%, #F0EDE8 50%, #E7E4DF 75%)',
  backgroundSize: '400px 100%',
  animation: 'shimmer 1.4s ease-in-out infinite',
  borderRadius: 6,
}

export function Skeleton({ w = '100%', h = 14 }: { w?: string | number; h?: number }) {
  return <div style={{ ...skelStyle, width: w, height: h }} />
}

// ─── BottomSheet ─────────────────────────────────────────────────────────────

export function BottomSheet({ title, onClose, children }: {
  title: string; onClose: () => void; children: ReactNode
}) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      role="dialog" aria-modal="true" aria-label={title}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(28,25,23,0.4)', animation: 'fadeIn 0.2s ease' }}
      />
      {/* Sheet */}
      <div ref={sheetRef} style={{
        position: 'relative', background: t.surface,
        borderRadius: '20px 20px 0 0',
        boxShadow: sh.high,
        maxHeight: '90dvh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        animation: 'sheetUp 0.3s cubic-bezier(0.32,0.72,0,1)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 9999, background: t.border }} />
        </div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: t.text }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={20} color={t.textSec} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Toast ───────────────────────────────────────────────────────────────────

export function Toast({ message, type = 'success', onClose }: {
  message: string; type?: 'success' | 'error'; onClose: () => void
}) {
  const iconStyle = { width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
  return (
    <div style={{
      position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 10, zIndex: 300,
      padding: '12px 16px', borderRadius: r.lg,
      background: '#1C1917', boxShadow: sh.high,
      animation: 'toastIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      whiteSpace: 'nowrap',
    }}>
      <div style={{ ...iconStyle, background: type === 'success' ? t.success : t.error }}>
        {type === 'success'
          ? <Check size={13} color="#fff" strokeWidth={2.5} />
          : <X size={13} color="#fff" strokeWidth={2.5} />
        }
      </div>
      <span style={{ fontSize: 14, color: '#fff' }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 4, display: 'flex' }}>
        <X size={15} color="rgba(255,255,255,0.5)" />
      </button>
    </div>
  )
}

// ─── PrimaryButton ────────────────────────────────────────────────────────────

export function PrimaryButton({ onClick, children, fullWidth, disabled }: {
  onClick?: () => void; children: ReactNode; fullWidth?: boolean; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: '12px 20px', background: disabled ? 'var(--ds-disabled-bg)' : t.primary,
      color: disabled ? 'var(--ds-disabled-text)' : '#fff',
      border: 'none', borderRadius: r.md, fontSize: 15, fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'var(--ds-font)',
      width: fullWidth ? '100%' : undefined,
    }}>
      {children}
    </button>
  )
}

// ─── FormField ────────────────────────────────────────────────────────────────

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: t.textSec, marginBottom: 6, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputBase: CSSProperties = {
  width: '100%', height: 44, padding: '0 12px',
  borderRadius: 'var(--ds-radius-md)',
  border: `1px solid var(--ds-border-strong)`,
  background: 'var(--ds-surface)',
  fontSize: 15, fontFamily: 'var(--ds-font)',
  color: 'var(--ds-text-primary)',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

export function Input({ placeholder, value, onChange, autoFocus, type = 'text' }: {
  placeholder?: string; value?: string; onChange?: (v: string) => void;
  autoFocus?: boolean; type?: string
}) {
  return (
    <input
      type={type}
      style={inputBase}
      placeholder={placeholder}
      value={value}
      autoFocus={autoFocus}
      onChange={e => onChange?.(e.target.value)}
      onFocus={e => { e.target.style.borderColor = 'var(--ds-primary)'; e.target.style.boxShadow = '0 0 0 3px var(--ds-focus)' }}
      onBlur={e => { e.target.style.borderColor = 'var(--ds-border-strong)'; e.target.style.boxShadow = 'none' }}
    />
  )
}

export function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <select
      style={{ ...inputBase, cursor: 'pointer', paddingRight: 32, appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ─── FAB ─────────────────────────────────────────────────────────────────────

export function FAB({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} style={{
      position: 'fixed', right: 20,
      bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
      width: 56, height: 56, borderRadius: 9999,
      background: t.primary, border: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: sh.md, cursor: 'pointer', zIndex: 10,
    }}>
      {children}
    </button>
  )
}

// ─── SegmentedControl ─────────────────────────────────────────────────────────

export function SegmentedControl({ options, value, onChange }: {
  options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'inline-flex', background: t.surfaceMuted, borderRadius: r.md, padding: 3, gap: 2 }}>
      {options.map(opt => {
        const active = opt === value
        return (
          <button key={opt} onClick={() => onChange(opt)} style={{
            padding: '7px 16px', border: 'none', borderRadius: 'var(--ds-radius-sm)',
            background: active ? t.surface : 'transparent',
            color: active ? t.text : t.textSec,
            fontSize: 13, fontWeight: active ? 500 : 400,
            cursor: 'pointer', fontFamily: 'var(--ds-font)',
            boxShadow: active ? sh.low : 'none', transition: 'all 0.15s',
          }}>
            {opt}
          </button>
        )
      })}
    </div>
  )
}

// ─── OfflineBanner ────────────────────────────────────────────────────────────

export function OfflineBanner() {
  return (
    <div style={{
      background: t.warningSub, borderBottom: `1px solid ${t.warning}20`,
      padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: 9999, background: t.warning, flexShrink: 0 }} />
      <p style={{ fontSize: 13, color: t.warning }}>
        {"You're offline. Changes will sync when you're back online."}
      </p>
    </div>
  )
}

// ─── Shared: priority color ───────────────────────────────────────────────────

export const priorityColor: Record<string, string> = {
  high: 'var(--ds-error)',
  medium: 'var(--ds-warning)',
  low: 'var(--ds-success)',
}
