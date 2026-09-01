import type { ReactNode } from 'react'
import { t, fonts } from '../ui'
import { MoneyScopeSwitch, type MoneyScope } from './MoneyScopeSwitch'

export type FamilyMoneyView = 'plan' | 'spend' | 'insights'

interface Props {
  scope: MoneyScope
  onSelectFamily: () => void
  onSelectPersonal: () => void
  familyView?: FamilyMoneyView | 'activity'
  onSelectFamilyView?: (tab: FamilyMoneyView) => void
  switcher?: ReactNode
  extra?: ReactNode
  children: ReactNode
}

const FAMILY_VIEWS: { id: FamilyMoneyView; label: string }[] = [
  { id: 'spend', label: 'Overview' },
  { id: 'plan', label: 'Plan' },
  { id: 'insights', label: 'Insights' },
]

export const MoneyChrome = ({
  scope,
  onSelectFamily,
  onSelectPersonal,
  familyView,
  onSelectFamilyView,
  switcher,
  extra,
  children,
}: Props) => {
  const showFamilyViews = scope === 'family' && familyView !== 'activity'

  return (
    <div style={{ padding: '0 0 24px' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: t.bg,
          padding: '8px 16px 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <MoneyScopeSwitch
            scope={scope}
            onSelectFamily={onSelectFamily}
            onSelectPersonal={onSelectPersonal}
          />
        </div>
        {showFamilyViews && onSelectFamilyView && (
          <div
            role="tablist"
            aria-label="Budget views"
            style={{
              display: 'flex',
              gap: 4,
              marginTop: 8,
              borderBottom: `1px solid ${t.border}`,
            }}
          >
            {FAMILY_VIEWS.map(item => {
              const active = familyView === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onSelectFamilyView(item.id)}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: active ? t.text : t.textSec,
                    fontWeight: active ? 500 : 400,
                    fontSize: 14,
                    padding: '10px 12px 12px',
                    minHeight: 44,
                    cursor: 'pointer',
                    fontFamily: fonts.ui,
                    borderBottom: active ? `2px solid ${t.primary}` : '2px solid transparent',
                    marginBottom: -1,
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        )}
        {switcher && (
          <div style={{ padding: '4px 0 4px' }}>{switcher}</div>
        )}
        {extra}
      </div>
      {children}
    </div>
  )
}
