import { type CSSProperties, type InputHTMLAttributes, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, CheckSquare, Baby, Car, ChevronDown, ChevronsDown, ChevronsUp, CreditCard, Equal, Film, Heart, Home, Minus, MoreHorizontal, PiggyBank, Plane, Plus, Repeat, Settings2, ShoppingCart, TrendingUp, User, UtensilsCrossed, Wallet, X, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Member } from './types'
import { TASK_CATEGORIES } from './types'

export type TaskPriority = 'high' | 'medium' | 'low'

// ─── Design token shorthands ─────────────────────────────────────────────────

export const t = {
  bg:           'var(--ds-bg)',
  surface:      'var(--ds-surface)',
  surfaceElev:  'var(--ds-surface-elevated)',
  surfaceMuted: 'var(--ds-surface-muted)',
  bgGlass:      'var(--ds-bg-glass)',
  text:         'var(--ds-text-primary)',
  textSec:      'var(--ds-text-secondary)',
  textTer:      'var(--ds-text-tertiary)',
  border:       'var(--ds-border)',
  borderStrong: 'var(--ds-border-strong)',
  primary:      'var(--ds-primary)',
  primaryHover: 'var(--ds-primary-hover)',
  primarySubtle:'var(--ds-primary-subtle)',
  onPrimary:    'var(--ds-on-primary)',
  attention:    'var(--ds-attention)',
  attentionSub: 'var(--ds-attention-subtle)',
  attentionText:'var(--ds-attention-text)',
  success:      'var(--ds-success)',
  successSub:   'var(--ds-success-subtle)',
  warning:      'var(--ds-warning)',
  warningSub:   'var(--ds-warning-subtle)',
  error:        'var(--ds-error)',
  errorSub:     'var(--ds-error-subtle)',
  info:         'var(--ds-info)',
  infoSub:      'var(--ds-info-subtle)',
  inverse:      'var(--ds-inverse)',
  onInverse:    'var(--ds-on-inverse)',
  overlay:      'var(--ds-overlay)',
  toggleKnob:   'var(--ds-toggle-knob)',
} as const

export const fonts = {
  ui: 'var(--ds-font)',
  display: 'var(--ds-font-display)',
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
        width: 44, height: 44, borderRadius: 7, border: 'none', padding: 0,
        background: 'transparent',
        cursor: 'pointer', flexShrink: 0, margin: '-11px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <span style={{
        width: size, height: size, borderRadius: 6,
        background: checked ? t.success : 'transparent',
        outline: `1.5px solid ${checked ? t.success : t.borderStrong}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {checked && <Check size={size * 0.6} color={t.onPrimary} strokeWidth={2.5} />}
      </span>
    </button>
  )
}

// ─── ShoppingCheckbox ─────────────────────────────────────────────────────────

export function ShoppingCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange() }}
      aria-label={checked ? 'Return to list' : 'Add to basket'}
      style={{
        width: 22, height: 22, minWidth: 22, minHeight: 22, borderRadius: 9999, border: 'none', padding: 0,
        background: checked ? t.success : 'transparent',
        outline: `1.5px solid ${checked ? t.success : t.borderStrong}`,
        cursor: 'pointer', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}
    >
      {checked && <Check size={13} color={t.onPrimary} strokeWidth={2.5} />}
    </button>
  )
}

// ─── QuantityStepper ──────────────────────────────────────────────────────────

/** `sm` keeps a 28px control inside a ~40px hit area; `lg` fills a form row. */
const STEPPER_SIZES = {
  sm: { control: 28, icon: 14, hitPad: 6, radius: r.pill, valueFont: 14, valueWidth: 24 },
  lg: { control: 44, icon: 18, hitPad: 0, radius: r.md, valueFont: 16, valueWidth: 32 },
} as const

export function QuantityStepper({
  value,
  onChange,
  label,
  size = 'sm',
  min = 1,
  fullWidth,
  disabled,
  atMinAction,
}: {
  value: number
  onChange: (quantity: number) => void
  /** Item name, used to build distinct accessible labels for each control. */
  label: string
  size?: 'sm' | 'lg'
  min?: number
  fullWidth?: boolean
  disabled?: boolean
  /**
   * Repurposes minus at `min` — the label matters because the button then does
   * something other than decrement. Without it, minus is blocked at `min`.
   */
  atMinAction?: { label: string; onActivate: () => void }
}) {
  const s = STEPPER_SIZES[size]
  const atMin = value <= min
  const decrementBlocked = disabled || (atMin && !atMinAction)

  const handleDecrement = () => {
    if (disabled) return
    if (atMin) {
      atMinAction?.onActivate()
      return
    }
    onChange(value - 1)
  }

  const handleIncrement = () => {
    if (disabled) return
    onChange(value + 1)
  }

  const controlStyle = (blocked: boolean): CSSProperties => ({
    width: s.control,
    height: s.control,
    borderRadius: s.radius,
    border: `1px solid ${t.border}`,
    background: t.surface,
    color: blocked ? t.textTer : t.textSec,
    opacity: blocked ? 0.45 : 1,
    cursor: blocked ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    flexShrink: 0,
  })

  const hitAreaStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: s.hitPad,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', width: fullWidth ? '100%' : undefined }}>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); handleDecrement() }}
        disabled={decrementBlocked}
        aria-label={
          atMin && atMinAction
            ? atMinAction.label
            : `Decrease quantity of ${label}`
        }
        style={{ ...hitAreaStyle, cursor: decrementBlocked ? 'not-allowed' : 'pointer' }}
      >
        <span style={controlStyle(decrementBlocked)}>
          <Minus size={s.icon} aria-hidden />
        </span>
      </button>
      <span
        aria-live="polite"
        style={{
          fontSize: s.valueFont,
          fontWeight: 600,
          color: t.text,
          minWidth: s.valueWidth,
          flex: fullWidth ? 1 : undefined,
          textAlign: 'center',
        }}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); handleIncrement() }}
        disabled={disabled}
        aria-label={`Increase quantity of ${label}`}
        style={{ ...hitAreaStyle, cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <span style={controlStyle(!!disabled)}>
          <Plus size={s.icon} aria-hidden />
        </span>
      </button>
    </div>
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
        borderRadius: 9999, background: t.toggleKnob,
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
      fontSize: 12, fontWeight: 500, color: t.textSec,
      letterSpacing: '0.01em',
      padding: '12px 16px 6px',
      fontFamily: fonts.ui,
    }}>{children}</p>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({ icon: Icon, title, body, action, onAction }: {
  icon: React.FC<{ size: number; color: string; strokeWidth: number }>
  title: string; body: string; action?: string; onAction?: () => void
}) {
  return (
    <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
      <Icon size={22} color={t.textTer} strokeWidth={1.5} />
      <p style={{ fontSize: 18, fontWeight: 500, color: t.text, fontFamily: fonts.display, marginTop: 8 }}>{title}</p>
      <p style={{ fontSize: 14, color: t.textSec, lineHeight: 1.6, maxWidth: 260 }}>{body}</p>
      {action && onAction && (
        <button onClick={onAction} style={{
          marginTop: 12, padding: '11px 20px', minHeight: 44,
          background: t.primary, color: t.onPrimary, border: 'none',
          borderRadius: r.md, fontSize: 14, fontWeight: 500,
          cursor: 'pointer', fontFamily: fonts.ui,
        }}>{action}</button>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const skelStyle: CSSProperties = {
  background: 'linear-gradient(90deg, var(--ds-skeleton-from) 25%, var(--ds-skeleton-to) 50%, var(--ds-skeleton-from) 75%)',
  backgroundSize: '400px 100%',
  animation: 'shimmer 1.4s ease-in-out infinite',
  borderRadius: 6,
}

export function Skeleton({ w = '100%', h = 14 }: { w?: string | number; h?: number }) {
  return <div style={{ ...skelStyle, width: w, height: h }} />
}

// ─── BottomSheet ─────────────────────────────────────────────────────────────

export function BottomSheet({ title, onClose, children, zIndex = 200, header, ariaLabel, listenEscape = true }: {
  title?: string
  onClose: () => void
  children: ReactNode
  zIndex?: number
  header?: ReactNode
  ariaLabel?: string
  listenEscape?: boolean
}) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!listenEscape) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose, listenEscape])

  return (
    <div
      className="bottom-sheet-root"
      style={{ position: 'fixed', inset: 0, zIndex, display: 'flex', flexDirection: 'column' }}
      role="dialog" aria-modal="true" aria-label={ariaLabel ?? title ?? 'Sheet'}
    >
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: t.overlay, animation: 'fadeIn 0.2s ease' }}
      />
      <div ref={sheetRef} className="bottom-sheet-panel" style={{
        position: 'relative', background: t.surfaceElev,
        borderRadius: '12px 12px 0 0',
        boxShadow: sh.high,
        maxHeight: '90dvh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div className="bottom-sheet-handle" style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 9999, background: t.border }} />
        </div>
        {header ?? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
            <span style={{ fontSize: 20, fontWeight: 500, color: t.text, fontFamily: fonts.display }}>{title}</span>
            <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 10, display: 'flex', minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} color={t.textSec} />
            </button>
          </div>
        )}
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
      padding: '12px 16px', borderRadius: r.md,
      background: t.inverse, boxShadow: sh.high,
      animation: 'toastIn 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
      maxWidth: 'min(92vw, 420px)',
      boxSizing: 'border-box',
    }}>
      <div style={{ ...iconStyle, background: type === 'success' ? t.success : t.error }}>
        {type === 'success'
          ? <Check size={13} color={t.onPrimary} strokeWidth={2.5} />
          : <X size={13} color={t.onPrimary} strokeWidth={2.5} />
        }
      </div>
      <span style={{ fontSize: 14, color: t.onInverse, lineHeight: 1.4, wordBreak: 'break-word' }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 4, display: 'flex', flexShrink: 0 }}>
        <X size={15} color="var(--ds-on-inverse-muted)" />
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
      padding: '12px 20px', minHeight: 44, background: disabled ? 'var(--ds-disabled-bg)' : t.primary,
      color: disabled ? 'var(--ds-disabled-text)' : t.onPrimary,
      border: 'none', borderRadius: r.md, fontSize: 15, fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: fonts.ui,
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
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: t.textSec, marginBottom: 6 }}>
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
  fontSize: 16, fontFamily: 'var(--ds-font)',
  color: 'var(--ds-text-primary)',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

export function Input({ placeholder, value, onChange, autoFocus, type = 'text', inputMode, onBlur, 'aria-label': ariaLabel }: {
  placeholder?: string; value?: string; onChange?: (v: string) => void;
  autoFocus?: boolean; type?: string; inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  onBlur?: (value: string) => void
  'aria-label'?: string
}) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      style={inputBase}
      placeholder={placeholder}
      value={value}
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      onChange={e => onChange?.(e.target.value)}
      onFocus={e => { e.target.style.borderColor = 'var(--ds-primary)'; e.target.style.boxShadow = '0 0 0 3px var(--ds-focus)' }}
      onBlur={e => {
        e.target.style.borderColor = 'var(--ds-border-strong)'
        e.target.style.boxShadow = 'none'
        onBlur?.(e.target.value)
      }}
    />
  )
}

export function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <select
        style={{ ...inputBase, cursor: 'pointer', paddingRight: 32, appearance: 'none' }}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown
        size={16}
        color={t.textTer}
        strokeWidth={2}
        aria-hidden
        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
      />
    </div>
  )
}

// ─── FAB ─────────────────────────────────────────────────────────────────────

export function FAB({ onClick, children, 'aria-label': ariaLabel }: {
  onClick: () => void
  children: ReactNode
  'aria-label'?: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="fab"
      style={{
      position: 'fixed', right: 20,
      width: 56, height: 56, borderRadius: 9999,
      background: t.primary, border: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: sh.md, cursor: 'pointer', zIndex: 10, minWidth: 56, minHeight: 56,
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
    <div role="tablist" style={{ display: 'flex', width: '100%', gap: 0, boxSizing: 'border-box', borderBottom: `1px solid ${t.border}` }}>
      {options.map(opt => {
        const active = opt === value
        return (
          <button key={opt} role="tab" aria-selected={active} onClick={() => onChange(opt)} style={{
            flex: 1, padding: '10px 10px 12px', minHeight: 44, border: 'none', borderRadius: 0,
            background: 'transparent',
            color: active ? t.text : t.textSec,
            fontSize: 14, fontWeight: active ? 500 : 400,
            cursor: 'pointer', fontFamily: fonts.ui,
            boxShadow: 'none',
            borderBottom: active ? `2px solid ${t.primary}` : '2px solid transparent',
            marginBottom: -1,
            whiteSpace: 'nowrap', minWidth: 0,
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

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: 'High priority',
  medium: 'Medium priority',
  low: 'Low priority',
}

export function PriorityIcon({ priority, size = 14 }: {
  priority: TaskPriority
  size?: number
}) {
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [showTip, setShowTip] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const color = priorityColor[priority]
  const label = PRIORITY_LABEL[priority]
  const Icon = priority === 'high' ? ChevronsUp : priority === 'low' ? ChevronsDown : Equal

  useLayoutEffect(() => {
    if (!showTip || !triggerRef.current) {
      setCoords(null)
      return
    }
    const rect = triggerRef.current.getBoundingClientRect()
    setCoords({
      top: rect.bottom + 6,
      left: rect.left + rect.width / 2,
    })
  }, [showTip])

  return (
    <span
      ref={triggerRef}
      role="img"
      aria-label={label}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      onFocus={() => setShowTip(true)}
      onBlur={() => setShowTip(false)}
      tabIndex={0}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        lineHeight: 0,
        outline: 'none',
        cursor: 'default',
      }}
    >
      <Icon size={size} color={color} strokeWidth={2.25} aria-hidden />
      {showTip && coords && createPortal(
        <span
          role="tooltip"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            transform: 'translateX(-50%)',
            padding: '5px 8px',
            borderRadius: r.sm,
            background: t.text,
            color: t.surface,
            fontSize: 11,
            fontWeight: 500,
            fontFamily: 'var(--ds-font)',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            boxShadow: sh.md,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          {label}
        </span>,
        document.body,
      )}
    </span>
  )
}

// ─── Shared: category icons ───────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Household: Home,
  Child: Baby,
  Shopping: ShoppingCart,
  Personal: User,
  Admin: Settings2,
  Other: MoreHorizontal,
}

export function categoryLucideIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? MoreHorizontal
}

export function categoryDisplayName(category: string): string {
  return CATEGORY_ICONS[category] ? category : (category || 'Other')
}

const EXPENSE_CATEGORY_ICONS: Record<string, LucideIcon> = {
  Shopping: ShoppingCart,
  Transportation: Car,
  Housing: Home,
  Utilities: Zap,
  Dining: UtensilsCrossed,
  Health: Heart,
  Childcare: Baby,
  Other: MoreHorizontal,
  // New budget groups (and common subcategory labels)
  Income: Wallet,
  'Fixed Expense': Home,
  'Variable Expense': ShoppingCart,
  Debt: CreditCard,
  Savings: PiggyBank,
  Investment: TrendingUp,
  Groceries: ShoppingCart,
  Transport: Car,
  Entertainment: Film,
  Travel: Plane,
  Subscriptions: Repeat,
}

export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  Shopping: 'var(--ds-primary)',
  Transportation: 'var(--ds-info)',
  Housing: 'var(--ds-warning)',
  Utilities: 'var(--ds-text-secondary)',
  Dining: 'var(--ds-error)',
  Health: 'var(--ds-success)',
  Childcare: 'var(--ds-member-3)',
  Other: 'var(--ds-text-tertiary)',
  Transport: 'var(--ds-info)',
  Entertainment: 'var(--ds-member-5)',
  Travel: 'var(--ds-member-2)',
  Subscriptions: 'var(--ds-text-secondary)',
}

export const BUDGET_GROUP_COLORS: Record<string, string> = {
  Income: '#3A4A32',
  'Fixed Expense': '#4A4540',
  'Variable Expense': '#8B6B4A',
  Debt: '#8B4A3E',
  Savings: '#5B4A5E',
  Investment: '#3A4A32',
  Summary: '#6B6558',
}

export const BUDGET_GROUP_ICONS: Record<string, LucideIcon> = {
  Income: Wallet,
  'Fixed Expense': Home,
  'Variable Expense': ShoppingCart,
  Debt: CreditCard,
  Savings: PiggyBank,
  Investment: TrendingUp,
}

export function expenseCategoryLucideIcon(category: string): LucideIcon {
  return EXPENSE_CATEGORY_ICONS[category] ?? BUDGET_GROUP_ICONS[category] ?? MoreHorizontal
}

export function ExpenseCategoryIcon({ category, size = 14 }: {
  category: string
  size?: number
}) {
  const Icon = expenseCategoryLucideIcon(category)
  return <Icon size={size} strokeWidth={1.75} aria-hidden />
}

export function BudgetGroupIcon({ group, size = 14 }: {
  group: string
  size?: number
}) {
  const Icon = BUDGET_GROUP_ICONS[group] ?? MoreHorizontal
  return <Icon size={size} strokeWidth={1.75} aria-hidden />
}

export function CategoryIcon({ category, size = 14 }: {
  category: string
  size?: number
}) {
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [showTip, setShowTip] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const label = categoryDisplayName(category)
  const Icon = categoryLucideIcon(category)

  useLayoutEffect(() => {
    if (!showTip || !triggerRef.current) {
      setCoords(null)
      return
    }
    const rect = triggerRef.current.getBoundingClientRect()
    setCoords({
      top: rect.bottom + 6,
      left: rect.left + rect.width / 2,
    })
  }, [showTip])

  return (
    <span
      ref={triggerRef}
      role="img"
      aria-label={label}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      onFocus={() => setShowTip(true)}
      onBlur={() => setShowTip(false)}
      tabIndex={0}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        lineHeight: 0,
        outline: 'none',
        cursor: 'default',
      }}
    >
      <Icon size={size} color={t.textTer} strokeWidth={2} aria-hidden />
      {showTip && coords && createPortal(
        <span
          role="tooltip"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            transform: 'translateX(-50%)',
            padding: '5px 8px',
            borderRadius: r.sm,
            background: t.text,
            color: t.surface,
            fontSize: 11,
            fontWeight: 500,
            fontFamily: 'var(--ds-font)',
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            boxShadow: sh.md,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          {label}
        </span>,
        document.body,
      )}
    </span>
  )
}

export function CategorySelect({ value, onChange }: {
  value: string
  onChange: (v: string) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const SelectedIcon = categoryLucideIcon(value)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        style={{
          ...inputBase,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          paddingRight: 36,
          textAlign: 'left',
        }}
      >
        <SelectedIcon size={16} color={t.textSec} strokeWidth={2} aria-hidden />
        <span style={{ flex: 1, fontSize: 16, color: t.text }}>{categoryDisplayName(value)}</span>
        <ChevronDown
          size={16}
          color={t.textTer}
          strokeWidth={2}
          aria-hidden
          style={{
            position: 'absolute',
            right: 12,
            transition: 'transform 0.15s',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Category"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 'calc(100% + 4px)',
            background: t.surface,
            borderRadius: r.md,
            border: `1px solid ${t.border}`,
            boxShadow: sh.md,
            overflow: 'hidden',
            zIndex: 40,
          }}
        >
          {TASK_CATEGORIES.map(cat => {
            const Icon = categoryLucideIcon(cat)
            const selected = cat === value
            return (
              <button
                key={cat}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(cat)
                  setOpen(false)
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  border: 'none',
                  background: selected ? t.primarySubtle : 'transparent',
                  color: t.text,
                  fontSize: 15,
                  fontFamily: 'var(--ds-font)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Icon size={16} color={selected ? t.primary : t.textSec} strokeWidth={2} aria-hidden />
                <span style={{ fontWeight: selected ? 500 : 400 }}>{cat}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
