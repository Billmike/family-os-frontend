import { t, fonts, r } from '../ui'

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
      role="radiogroup"
      aria-label="Money scope"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: t.surfaceMuted,
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
            onClick={() => handleSelect(item.id)}
            style={{
              border: 'none',
              background: active ? t.surfaceElev : 'transparent',
              color: active ? t.text : t.textSec,
              fontWeight: active ? 600 : 400,
              fontSize: 13,
              minHeight: 38,
              padding: '0 14px',
              borderRadius: r.pill,
              cursor: 'pointer',
              fontFamily: fonts.ui,
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
