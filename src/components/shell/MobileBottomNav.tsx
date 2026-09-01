import type { Screen } from '../../types'
import { isBudgetSection } from '../../routing'
import { t, fonts } from '../../ui'
import { BOTTOM_NAV } from './nav'

interface Props {
  screen: Screen
  onNavigate: (screen: Screen) => void
}

export const MobileBottomNav = ({ screen, onNavigate }: Props) => {
  return (
    <nav
      aria-label="Main"
      style={{
        display: 'flex',
        width: '100%',
        borderTop: `1px solid ${t.border}`,
        background: t.bg,
        paddingBottom: 'env(safe-area-inset-bottom)',
        flexShrink: 0,
      }}
    >
      {BOTTOM_NAV.map(item => {
        const Icon = item.icon
        const active =
          screen === item.screen ||
          (item.screen === 'budgetSpend' && isBudgetSection(screen))
        return (
          <button
            key={item.screen}
            type="button"
            onClick={() => onNavigate(item.screen)}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 0',
              minHeight: 52,
              border: 'none',
              background: 'none',
              color: active ? t.primary : t.textTer,
              cursor: 'pointer',
              gap: 3,
              fontFamily: fonts.ui,
            }}
          >
            <Icon
              size={22}
              strokeWidth={active ? 2 : 1.75}
              color={active ? t.primary : t.textTer}
            />
            <span style={{ fontSize: 10, fontWeight: active ? 500 : 400 }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
