import type { KeyboardEvent } from 'react'
import { t, fonts, r } from '../ui'

export type MoneyScope = 'family' | 'personal'

interface Props {
  scope: MoneyScope
  tone?: 'default' | 'paper'
  onSelectFamily: () => void
  onSelectPersonal: () => void
}

const OPTIONS: { id: MoneyScope; label: string }[] = [
  { id: 'family', label: 'Family' },
  { id: 'personal', label: 'Personal' },
]

export const MoneyScopeSwitch = ({
  scope,
  tone = 'default',
  onSelectFamily,
  onSelectPersonal,
}: Props) => {
  const isPaper = tone === 'paper'

  const handleSelect = (next: MoneyScope) => {
    if (next === 'family') {
      onSelectFamily()
      return
    }
    onSelectPersonal()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const index = OPTIONS.findIndex(item => item.id === scope)
    const delta = event.key === 'ArrowRight' ? 1 : -1
    const next = OPTIONS[(index + delta + OPTIONS.length) % OPTIONS.length]
    handleSelect(next.id)
    const buttons = event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')
    buttons[OPTIONS.findIndex(item => item.id === next.id)]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label="Family or Personal"
      onKeyDown={handleKeyDown}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: isPaper ? 'var(--budget-toggle)' : t.surfaceMuted,
        borderRadius: r.pill,
        padding: 3,
        flexShrink: 0,
      }}
    >
      {OPTIONS.map(item => {
        const active = scope === item.id
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => handleSelect(item.id)}
            style={{
              border: 'none',
              background: active
                ? isPaper ? 'var(--budget-panel)' : t.surfaceElev
                : 'transparent',
              color: active
                ? isPaper ? 'var(--budget-text)' : t.text
                : isPaper ? 'var(--budget-dim)' : t.textSec,
              fontWeight: active ? 600 : 400,
              fontSize: 13,
              minHeight: 38,
              padding: '0 14px',
              borderRadius: r.pill,
              cursor: 'pointer',
              fontFamily: fonts.ui,
              boxShadow: active && isPaper ? 'var(--budget-card-shadow)' : 'none',
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
