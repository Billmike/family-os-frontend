import type { KeyboardEvent, ReactNode } from 'react'
import { t } from '../ui'
import { MoneyScopeSwitch, type MoneyScope } from './MoneyScopeSwitch'

export type FamilyMoneyView = 'plan' | 'spend' | 'insights'

interface Props {
  scope: MoneyScope
  onSelectFamily: () => void
  onSelectPersonal: () => void
  familyView?: FamilyMoneyView | 'activity'
  onSelectFamilyView?: (tab: FamilyMoneyView) => void
  statusLabel?: string
  switcher?: ReactNode
  extra?: ReactNode
  children: ReactNode
}

const FAMILY_TABS: {
  id: FamilyMoneyView
  label: string
  tabId: string
  panelId: string
}[] = [
  { id: 'spend', label: 'Overview', tabId: 'budget-tab-overview', panelId: 'budget-panel-overview' },
  { id: 'plan', label: 'Plan', tabId: 'budget-tab-plan', panelId: 'budget-panel-plan' },
  { id: 'insights', label: 'Insights', tabId: 'budget-tab-insights', panelId: 'budget-panel-insights' },
]

const familyTab = (view: FamilyMoneyView | 'activity' | undefined) =>
  FAMILY_TABS.find(item => item.id === view) ?? FAMILY_TABS[0]

export const MoneyChrome = ({
  scope,
  onSelectFamily,
  onSelectPersonal,
  familyView,
  onSelectFamilyView,
  statusLabel,
  switcher,
  extra,
  children,
}: Props) => {
  if (scope === 'personal') {
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 44 }}>
            <MoneyScopeSwitch
              scope={scope}
              onSelectFamily={onSelectFamily}
              onSelectPersonal={onSelectPersonal}
            />
            {switcher}
          </div>
          {extra}
        </div>
        {children}
      </div>
    )
  }

  const showFamilyViews = familyView !== 'activity'
  const activeTab = familyTab(familyView)

  return (
    <div
      className="budget-screen"
      style={{
        minHeight: '100%',
        background: 'var(--ds-bg)',
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--ds-surface-chrome)',
          borderBottom: '1px solid var(--budget-grid)',
        }}
      >
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 44 }}>
            <MoneyScopeSwitch
              scope={scope}
              tone="paper"
              onSelectFamily={onSelectFamily}
              onSelectPersonal={onSelectPersonal}
            />
            {switcher}
          </div>
          {statusLabel != null && (
            <p
              style={{
                margin: '12px 0 4px',
                fontSize: 13,
                color: 'var(--budget-dim)',
                fontFamily: 'var(--ds-font)',
              }}
            >
              {statusLabel}
            </p>
          )}
        </div>
        {showFamilyViews && onSelectFamilyView && (
          <FamilyMoneyTabs
            value={activeTab.id}
            onChange={onSelectFamilyView}
          />
        )}
        {extra}
      </div>
      {showFamilyViews ? (
        <div
          key={activeTab.id}
          className="budget-motion"
          role="tabpanel"
          id={activeTab.panelId}
          aria-labelledby={activeTab.tabId}
          style={{ animation: 'budgetEnter 0.22s ease-out' }}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  )
}

const FamilyMoneyTabs = ({
  value,
  onChange,
}: {
  value: FamilyMoneyView
  onChange: (tab: FamilyMoneyView) => void
}) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const index = FAMILY_TABS.findIndex(item => item.id === value)
    const delta = event.key === 'ArrowRight' ? 1 : -1
    const next = FAMILY_TABS[(index + delta + FAMILY_TABS.length) % FAMILY_TABS.length]
    onChange(next.id)
    queueMicrotask(() => {
      document.getElementById(next.tabId)?.focus()
    })
  }

  return (
    <div
      role="tablist"
      aria-label="Overview, Plan, or Insights"
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        width: '100%',
        boxSizing: 'border-box',
        borderBottom: '1px solid var(--budget-grid)',
      }}
    >
      {FAMILY_TABS.map(item => {
        const isActive = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={item.tabId}
            aria-controls={item.panelId}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.id)}
            style={{
              flex: 1,
              padding: '10px 10px 12px',
              minHeight: 44,
              border: 'none',
              borderRadius: 0,
              background: 'transparent',
              color: isActive ? 'var(--budget-text)' : 'var(--budget-dim)',
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              cursor: 'pointer',
              fontFamily: 'var(--ds-font)',
              borderBottom: isActive ? '2px solid var(--budget-text)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
