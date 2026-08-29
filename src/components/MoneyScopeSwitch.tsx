import { t, r } from '../ui'

export type MoneyScope = 'family' | 'personal'

interface Props {
  scope: MoneyScope
  onSelectFamily: () => void
  onSelectPersonal: () => void
}

const OPTIONS: { id: MoneyScope; label: string }[] = [
  { id: 'family', label: 'Family' },
  { id: 'personal', label: 'Personal' },
]

export const MoneyScopeSwitch = ({
  scope,
  onSelectFamily,
  onSelectPersonal,
}: Props) => {
  const handleSelect = (next: MoneyScope) => {
    if (next === 'family') {
      onSelectFamily()
      return
    }
    onSelectPersonal()
  }

  return (
    <div
      role="tablist"
      aria-label="Money scope"
      style={{
        display: 'flex',
        gap: 4,
        padding: 4,
        background: t.surfaceMuted,
        borderRadius: r.md,
        marginBottom: 8,
      }}
    >
      {OPTIONS.map(item => {
        const active = scope === item.id
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={0}
            onClick={() => handleSelect(item.id)}
            style={{
              flex: 1,
              border: 'none',
              background: active ? t.surface : 'transparent',
              color: active ? t.text : t.textSec,
              fontWeight: active ? 600 : 500,
              fontSize: 13,
              padding: '8px 12px',
              borderRadius: r.sm,
              cursor: 'pointer',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              fontFamily: 'var(--ds-font)',
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
