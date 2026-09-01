import type { ReactNode } from 'react'
import { t, SegmentedControl } from '../ui'
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

const familyViewLabel = (view: FamilyMoneyView | 'activity' | undefined): string =>
  FAMILY_VIEWS.find(item => item.id === view)?.label ?? 'Overview'

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

  const handleSelectFamilyView = (label: string) => {
    const next = FAMILY_VIEWS.find(item => item.label === label)
    if (!next || !onSelectFamilyView) return
    onSelectFamilyView(next.id)
  }

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
          <div style={{ marginTop: 8 }}>
            <SegmentedControl
              options={FAMILY_VIEWS.map(item => item.label)}
              value={familyViewLabel(familyView)}
              onChange={handleSelectFamilyView}
            />
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
