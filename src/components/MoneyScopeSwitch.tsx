import { t, fonts } from '../ui'

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
        display: 'inline-flex',
        gap: 2,
        alignItems: 'center',
      }}
    >
      {OPTIONS.map((item, i) => {
        const active = scope === item.id
        return (
          <span key={item.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            {i > 0 && (
              <span aria-hidden style={{ color: t.textTer, fontSize: 13, padding: '0 4px' }}>
                /
              </span>
            )}
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleSelect(item.id)}
              style={{
                border: 'none',
                background: 'none',
                color: active ? t.text : t.textTer,
                fontWeight: active ? 500 : 400,
                fontSize: 14,
                padding: '8px 4px',
                minHeight: 44,
                cursor: 'pointer',
                fontFamily: fonts.ui,
              }}
            >
              {item.label}
            </button>
          </span>
        )
      })}
    </div>
  )
}
