import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Copy, Plus, Wallet, X } from 'lucide-react'
import type {
  AppHandlers,
  Budget,
  BudgetGroupBlock,
  BudgetPeriod,
  BudgetSubcategoryGroup,
  Expense,
} from '../types'
import { BUDGET_GROUPS } from '../types'
import {
  cycleIdentityStatus,
  cycleStatus,
  formatCycleDateRange,
  formatCycleDay,
  formatMoney,
  formatYearMonthCompact,
} from '../api/adapters'
import {
  BudgetGroupIcon,
  BUDGET_GROUP_COLORS,
  EmptyState,
  Input,
  Skeleton,
  t,
  r,
  fonts,
} from '../ui'
import BudgetInsights from '../components/BudgetInsights'
import ExpensesScreen from './Expenses'
import { MoneyChrome } from '../components/MoneyChrome'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { MOTION_EASE, MOTION_MS } from '../lib/motion'

const paperCard = {
  background: 'var(--budget-card)',
  border: '1px solid var(--budget-grid)',
  boxShadow: 'var(--budget-card-shadow)',
  borderRadius: r.lg,
} as const

const planGroupPanelId = (group: string) =>
  `plan-group-${group.toLowerCase().replace(/\s+/g, '-')}`

const lineCountLabel = (count: number) =>
  count === 1 ? '1 line' : `${count} lines`

export type BudgetTab = 'plan' | 'spend' | 'insights'

interface Props {
  tab: BudgetTab
  onSelectTab: (tab: BudgetTab) => void
  period: BudgetPeriod | null
  periods: BudgetPeriod[]
  selectedPeriodId: string | null
  today: string
  subcategoryGroups: BudgetSubcategoryGroup[]
  loadPeriodExpenses: (periodId: string, signal?: AbortSignal) => Promise<Expense[]>
  loading?: boolean
  onSelectPeriod: (periodId: string) => void
  onOpenCycleList: () => void
  onCreateCycle: () => void
  onCopyCycle: () => void
  onEditDates: () => void
  onUpdateExpected: (budgetId: string, amount: number) => void
  onAddLine: (subcategoryId: string, amount: number) => void
  onAddSubcategory: (group: string, name: string) => Promise<string | null>
  onRenameSubcategory: (subcategoryId: string, name: string) => Promise<boolean>
  onRemoveLine: (budgetId: string, name: string) => void
  onSettle: (budgetId: string) => void
  onUnsettle: (budgetId: string) => void
  onSelectPersonal: () => void
  openSheet: AppHandlers['openSheet']
}

const SIDE_PAD = 16

export default function BudgetScreen({
  tab,
  onSelectTab,
  period,
  periods,
  selectedPeriodId,
  today,
  subcategoryGroups,
  loadPeriodExpenses,
  loading,
  onSelectPeriod,
  onOpenCycleList,
  onCreateCycle,
  onCopyCycle,
  onEditDates,
  onUpdateExpected,
  onAddLine,
  onAddSubcategory,
  onRenameSubcategory,
  onRemoveLine,
  onSettle,
  onUnsettle,
  onSelectPersonal,
  openSheet,
}: Props) {
  const statusLabel = cycleIdentityStatus(period, today)

  if (loading) {
    return (
      <MoneyChrome
        scope="family"
        familyView={tab}
        onSelectFamily={() => undefined}
        onSelectPersonal={onSelectPersonal}
        onSelectFamilyView={onSelectTab}
        statusLabel={statusLabel}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: `16px ${SIDE_PAD}px` }}>
          <Skeleton h={120} />
          <Skeleton h={200} />
          <Skeleton h={200} />
        </div>
      </MoneyChrome>
    )
  }

  const currentPeriod = periods.find(p => cycleStatus(p, today) === 'current') ?? null
  const selectedIndex = selectedPeriodId
    ? periods.findIndex(p => p.id === selectedPeriodId)
    : -1
  const canGoPrev = selectedIndex > 0
  const canGoNext = selectedIndex >= 0 && selectedIndex < periods.length - 1
  const status = period ? cycleStatus(period, today) : null
  const showGapBanner = Boolean(period && status === 'ended' && !currentPeriod)

  const handlePrevCycle = () => {
    if (!canGoPrev) return
    onSelectPeriod(periods[selectedIndex - 1].id)
  }

  const handleNextCycle = () => {
    if (!canGoNext) return
    onSelectPeriod(periods[selectedIndex + 1].id)
  }

  const cycleSwitcher = period ? (
    <MonthSwitcher
      title={formatYearMonthCompact(period.labelMonth)}
      subtitle={formatCycleDateRange(period.startDate, period.endDate)}
      canGoPrev={canGoPrev}
      canGoNext={canGoNext}
      onPrev={handlePrevCycle}
      onNext={handleNextCycle}
      onAllCycles={onOpenCycleList}
      tone="paper"
    />
  ) : null

  return (
    <MoneyChrome
      scope="family"
      familyView={tab}
      onSelectFamily={() => undefined}
      onSelectPersonal={onSelectPersonal}
      onSelectFamilyView={onSelectTab}
      statusLabel={statusLabel}
      switcher={cycleSwitcher}
    >
      {tab === 'spend' ? (
        <ExpensesScreen
          period={period}
          periods={periods}
          loadPeriodExpenses={loadPeriodExpenses}
          onSelectPeriod={onSelectPeriod}
          onCreateCycle={onCreateCycle}
          openSheet={openSheet}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: `16px ${SIDE_PAD}px 32px`,
          }}
        >
          {tab === 'insights' ? (
            <BudgetInsights
              period={period}
              periods={periods}
              today={today}
              onSelectPeriod={onSelectPeriod}
            />
          ) : periods.length === 0 ? (
            <>
              <EmptyState
                icon={Wallet}
                title="No budget cycle yet"
                body="Plan expected income and expenses for this pay cycle, then tick lines as you settle them."
                action="Start this cycle"
                onAction={onCreateCycle}
              />
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: -8 }}>
                <button
                  type="button"
                  onClick={onCopyCycle}
                  style={{
                    ...ghostBtn,
                    padding: '10px 14px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--budget-text)',
                  }}
                >
                  <Copy size={14} aria-hidden />
                  Copy from last cycle
                </button>
              </div>
            </>
          ) : period ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={onEditDates} aria-label="Edit cycle dates" style={ghostBtn}>
                  Dates
                </button>
                <button type="button" onClick={onCopyCycle} aria-label="Copy from this cycle" style={ghostBtn}>
                  <Copy size={14} aria-hidden />
                </button>
              </div>

              {showGapBanner && (
                <div
                  style={{
                    ...paperCard,
                    padding: '14px 16px',
                  }}
                >
                  <p style={{ fontSize: 13, color: 'var(--budget-text)', margin: 0, lineHeight: 1.45 }}>
                    This cycle ended {formatCycleDay(period.endDate)}. Nothing is planned for today.
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button type="button" onClick={onCreateCycle} style={ghostBtn}>
                      Start next
                    </button>
                    <button type="button" onClick={onCopyCycle} style={ghostBtn}>
                      Copy from this cycle
                    </button>
                  </div>
                </div>
              )}

              <MonthlySummaryCard period={period} />

              {BUDGET_GROUPS.map(groupName => {
                const block =
                  period.groups.find(g => g.group === groupName) ??
                  ({
                    group: groupName,
                    direction: groupName === 'Income' ? 'inflow' : 'outflow',
                    expected: 0,
                    actual: 0,
                    lines: [],
                  } satisfies BudgetGroupBlock)
                const available =
                  subcategoryGroups.find(g => g.group === groupName)?.subcategories ?? []
                return (
                  <GroupCard
                    key={groupName}
                    block={block}
                    currency={period.currency}
                    availableSubcategories={available}
                    onUpdateExpected={onUpdateExpected}
                    onAddLine={onAddLine}
                    onAddSubcategory={onAddSubcategory}
                    onRenameSubcategory={onRenameSubcategory}
                    onRemoveLine={onRemoveLine}
                    onSettle={onSettle}
                    onUnsettle={onUnsettle}
                  />
                )
              })}
            </>
          ) : null}
        </div>
      )}
    </MoneyChrome>
  )
}

const ghostBtn: React.CSSProperties = {
  border: '1px solid var(--budget-grid)',
  background: 'var(--budget-card)',
  borderRadius: r.md,
  padding: '8px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  color: 'var(--budget-text)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontFamily: fonts.ui,
}

function CollapsibleHeader({
  expanded,
  onToggle,
  markColor,
  panelId,
  children,
  trailing,
  ariaLabel,
}: {
  expanded: boolean
  onToggle: () => void
  markColor: string
  panelId: string
  children: React.ReactNode
  trailing?: React.ReactNode
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={panelId}
      aria-label={ariaLabel}
      style={{
        width: '100%',
        padding: '12px 16px',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: fonts.ui,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span aria-hidden style={{ width: 3, height: 16, borderRadius: 9999, background: markColor, flexShrink: 0 }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            {children}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {trailing}
          <ChevronDown
            size={16}
            color="var(--budget-dim)"
            aria-hidden
            style={{
              transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: `transform ${MOTION_MS.feedback}ms ${MOTION_EASE}`,
            }}
          />
        </div>
      </div>
    </button>
  )
}

function MonthlySummaryCard({ period }: { period: BudgetPeriod }) {
  const [expanded, setExpanded] = useState(true)
  const s = period.summary
  const panelId = 'plan-monthly-summary'
  const rows = [
    { label: 'Income', sign: '+', amount: s.incomeExpected },
    ...period.groups
      .filter(g => g.direction === 'outflow')
      .map(g => ({
        label: g.group,
        sign: '−',
        amount: g.expected,
      })),
  ]

  return (
    <section
      aria-label="Monthly summary"
      style={{ ...paperCard, overflow: 'hidden' }}
    >
      <CollapsibleHeader
        expanded={expanded}
        onToggle={() => setExpanded(v => !v)}
        markColor={BUDGET_GROUP_COLORS.Summary}
        panelId={panelId}
        ariaLabel={expanded ? 'Collapse monthly summary' : 'Expand monthly summary'}
        trailing={
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--budget-text)' }}>
            {formatMoney(s.leftOverExpected, period.currency)}
          </span>
        }
      >
        <span style={{ fontSize: 14, color: 'var(--budget-text)', fontWeight: 500 }}>
          Monthly Summary
        </span>
      </CollapsibleHeader>

      <div
        id={panelId}
        role="region"
        aria-label="Monthly summary rows"
        aria-hidden={!expanded}
        inert={!expanded}
        className={expanded ? 'spend-group-panel is-open' : 'spend-group-panel'}
      >
        <div className="spend-group-panel-inner">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 1fr',
              gap: 0,
              padding: '8px 16px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--budget-dim)',
              background: 'var(--budget-toggle)',
              borderTop: '1px solid var(--budget-grid)',
            }}
          >
            <span>Category</span>
            <span style={{ textAlign: 'right' }}>Amount</span>
          </div>
          {rows.map(row => (
            <div
              key={row.label}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.6fr 1fr',
                padding: '12px 16px',
                borderTop: '1px solid var(--budget-grid)',
                fontSize: 14,
                color: 'var(--budget-text)',
              }}
            >
              <span>
                <span style={{ color: 'var(--budget-dim)', marginRight: 6 }}>{row.sign}</span>
                {row.label}
              </span>
              <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                {formatMoney(row.amount, period.currency)}
              </span>
            </div>
          ))}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 1fr',
              padding: '12px 16px',
              background: 'var(--budget-toggle)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--budget-text)',
              borderTop: '1px solid var(--budget-grid)',
            }}
          >
            <span>Total Expenses</span>
            <span style={{ textAlign: 'right' }}>{formatMoney(s.totalExpensesExpected, period.currency)}</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 1fr',
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--budget-text)',
              alignItems: 'center',
              borderTop: '1px solid var(--budget-grid)',
            }}
          >
            <span>= Left Over</span>
            <span
              style={{
                textAlign: 'right',
                background: s.leftOverExpected >= 0 ? t.primarySubtle : t.attentionSub,
                color: s.leftOverExpected >= 0 ? t.primary : t.attentionText,
                borderRadius: r.sm,
                padding: '4px 8px',
                justifySelf: 'end',
              }}
            >
              {formatMoney(s.leftOverExpected, period.currency)}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

function GroupCard({
  block,
  currency,
  availableSubcategories,
  onUpdateExpected,
  onAddLine,
  onAddSubcategory,
  onRenameSubcategory,
  onRemoveLine,
  onSettle,
  onUnsettle,
}: {
  block: BudgetGroupBlock
  currency: string
  availableSubcategories: { id: string; name: string }[]
  onUpdateExpected: (budgetId: string, amount: number) => void
  onAddLine: (subcategoryId: string, amount: number) => void
  onAddSubcategory: (group: string, name: string) => Promise<string | null>
  onRenameSubcategory: (subcategoryId: string, name: string) => Promise<boolean>
  onRemoveLine: (budgetId: string, name: string) => void
  onSettle: (budgetId: string) => void
  onUnsettle: (budgetId: string) => void
}) {
  const color = BUDGET_GROUP_COLORS[block.group] ?? t.primary
  const [expanded, setExpanded] = useState(true)
  const [draftName, setDraftName] = useState('')
  const [draftAmount, setDraftAmount] = useState('')
  const [adding, setAdding] = useState(false)
  const panelId = planGroupPanelId(block.group)
  const linesLabel = lineCountLabel(block.lines.length)

  const handleAdd = async () => {
    const name = draftName.trim()
    const amount = Number.parseFloat(draftAmount.replace(',', '.'))
    if (!name || !Number.isFinite(amount) || amount <= 0) return
    setAdding(true)
    try {
      const existing = availableSubcategories.find(
        s => s.name.toLowerCase() === name.toLowerCase(),
      )
      if (existing) {
        onAddLine(existing.id, amount)
      } else {
        const id = await onAddSubcategory(block.group, name)
        if (id) onAddLine(id, amount)
      }
      setDraftName('')
      setDraftAmount('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <section
      aria-label={block.group}
      style={{ ...paperCard, overflow: 'hidden' }}
    >
      <CollapsibleHeader
        expanded={expanded}
        onToggle={() => setExpanded(v => !v)}
        markColor={color}
        panelId={panelId}
        ariaLabel={
          expanded
            ? `Collapse ${block.group}, ${formatMoney(block.expected, currency)}, ${linesLabel}`
            : `Expand ${block.group}, ${formatMoney(block.expected, currency)}, ${linesLabel}`
        }
        trailing={
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--budget-text)' }}>
            {formatMoney(block.expected, currency)}
          </span>
        }
      >
        <span
          aria-hidden
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'var(--budget-toggle)',
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <BudgetGroupIcon group={block.group} size={16} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14, color: 'var(--budget-text)', fontWeight: 500 }}>
            {block.group}
          </span>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--budget-dim)', marginTop: 2 }}>
            {linesLabel}
          </span>
        </span>
      </CollapsibleHeader>

      <div
        id={panelId}
        role="region"
        aria-label={`${block.group} lines`}
        aria-hidden={!expanded}
        inert={!expanded}
        className={expanded ? 'spend-group-panel is-open' : 'spend-group-panel'}
      >
        <div className="spend-group-panel-inner">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '28px 1.5fr 1fr 28px',
              gap: 0,
              padding: '8px 16px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--budget-dim)',
              background: 'var(--budget-toggle)',
              borderTop: '1px solid var(--budget-grid)',
            }}
          >
            <span aria-hidden>✓</span>
            <span>Subcategory</span>
            <span style={{ textAlign: 'right' }}>Amount</span>
            <span aria-hidden />
          </div>

          {block.lines.map(line => (
            <BudgetLineRow
              key={line.id}
              line={line}
              onUpdateExpected={onUpdateExpected}
              onRename={onRenameSubcategory}
              onRemove={onRemoveLine}
              onSettle={onSettle}
              onUnsettle={onUnsettle}
            />
          ))}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '28px 1.5fr 1fr auto',
              gap: 8,
              padding: '10px 16px',
              alignItems: 'center',
              borderTop: '1px solid var(--budget-grid)',
            }}
          >
            <Plus size={14} color="var(--budget-dim)" aria-hidden />
            <Input
              value={draftName}
              onChange={setDraftName}
              placeholder="Enter a sub-category"
              aria-label={`New subcategory in ${block.group}`}
            />
            <Input
              inputMode="decimal"
              value={draftAmount}
              onChange={setDraftAmount}
              placeholder="€0.00"
              aria-label="Amount"
            />
            <button
              type="button"
              disabled={adding || !draftName.trim()}
              onClick={() => void handleAdd()}
              style={{
                ...ghostBtn,
                justifyContent: 'center',
                color: t.primary,
                borderColor: t.primary,
                opacity: adding || !draftName.trim() ? 0.5 : 1,
              }}
            >
              Add
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '28px 1.5fr 1fr 28px',
              padding: '12px 16px',
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--budget-text)',
              borderTop: '1px solid var(--budget-grid)',
            }}
          >
            <span />
            <span>Total</span>
            <span style={{ textAlign: 'right' }}>{formatMoney(block.expected, currency)}</span>
            <span />
          </div>
        </div>
      </div>
    </section>
  )
}

function BudgetLineRow({
  line,
  onUpdateExpected,
  onRename,
  onRemove,
  onSettle,
  onUnsettle,
}: {
  line: Budget
  onUpdateExpected: (budgetId: string, amount: number) => void
  onRename: (subcategoryId: string, name: string) => Promise<boolean>
  onRemove: (budgetId: string, name: string) => void
  onSettle: (budgetId: string) => void
  onUnsettle: (budgetId: string) => void
}) {
  const [amount, setAmount] = useState(String(line.amount))
  const [name, setName] = useState(line.subcategoryName)
  const nameRef = useRef(line.subcategoryName)

  useEffect(() => {
    setAmount(String(line.amount))
  }, [line.amount])

  useEffect(() => {
    nameRef.current = line.subcategoryName
    setName(line.subcategoryName)
  }, [line.subcategoryName])

  const handleNameChange = (value: string) => {
    nameRef.current = value
    setName(value)
  }

  const handleAmountBlur = () => {
    const parsed = Number.parseFloat(amount.replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setAmount(String(line.amount))
      return
    }
    if (parsed !== line.amount) onUpdateExpected(line.id, parsed)
  }

  const handleNameBlur = async (raw?: string) => {
    const next = (raw ?? nameRef.current).trim()
    if (!next || next.toLowerCase() === line.subcategoryName.toLowerCase()) {
      nameRef.current = line.subcategoryName
      setName(line.subcategoryName)
      return
    }
    const ok = await onRename(line.subcategoryId, next)
    if (!ok) {
      nameRef.current = line.subcategoryName
      setName(line.subcategoryName)
    }
  }

  const handleRemove = () => {
    if (line.settled) {
      const confirmed = window.confirm(
        `Remove ${line.subcategoryName} from this cycle? The settled payment for this line will be cleared. Past spend stays.`,
      )
      if (!confirmed) return
    }
    onRemove(line.id, line.subcategoryName)
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1.5fr 1fr 28px',
        gap: 8,
        padding: '8px 16px',
        borderTop: '1px solid var(--budget-grid)',
        alignItems: 'center',
        background: line.settled ? 'var(--ds-success-subtle)' : undefined,
      }}
    >
      <button
        type="button"
        aria-label={line.settled ? `Unsettle ${line.subcategoryName}` : `Settle ${line.subcategoryName}`}
        aria-pressed={line.settled}
        onClick={() => (line.settled ? onUnsettle(line.id) : onSettle(line.id))}
        style={{
          width: 22,
          height: 22,
          borderRadius: 4,
          border: `1.5px solid ${line.settled ? t.success : 'var(--budget-grid)'}`,
          background: line.settled ? t.success : 'var(--budget-card)',
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        {line.settled ? <Check size={12} strokeWidth={3} aria-hidden /> : null}
      </button>
      <div style={{ background: 'var(--budget-toggle)', borderRadius: r.sm }}>
        <Input
          value={name}
          onChange={handleNameChange}
          onBlur={handleNameBlur}
          aria-label={`${line.subcategoryName} name`}
        />
      </div>
      <div style={{ background: 'var(--budget-toggle)', borderRadius: r.sm }}>
        <Input
          inputMode="decimal"
          value={amount}
          onChange={setAmount}
          onBlur={handleAmountBlur}
          aria-label={`${line.subcategoryName} amount`}
        />
      </div>
      <button
        type="button"
        onClick={handleRemove}
        aria-label={`Remove ${line.subcategoryName} from this cycle`}
        style={{
          width: 22,
          height: 22,
          border: 'none',
          background: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: t.textTer,
        }}
      >
        <X size={14} strokeWidth={2} aria-hidden />
      </button>
    </div>
  )
}
