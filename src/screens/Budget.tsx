import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronRight, Copy, Plus, Wallet, X } from 'lucide-react'
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
  if (loading) {
    return (
      <MoneyChrome
        scope="family"
        familyView={tab}
        onSelectFamily={() => undefined}
        onSelectPersonal={onSelectPersonal}
        onSelectFamilyView={onSelectTab}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: `0 ${SIDE_PAD}px` }}>
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
    />
  ) : null

  return (
    <MoneyChrome
      scope="family"
      familyView={tab}
      onSelectFamily={() => undefined}
      onSelectPersonal={onSelectPersonal}
      onSelectFamilyView={onSelectTab}
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
            padding: tab === 'insights' ? `0 ${SIDE_PAD}px 0` : `16px ${SIDE_PAD}px 0`,
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
                    border: `1px solid ${t.border}`,
                    background: t.surfaceElev,
                    borderRadius: r.md,
                    padding: '10px 14px',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    color: t.text,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: fonts.ui,
                  }}
                >
                  <Copy size={14} aria-hidden />
                  Copy from last cycle
                </button>
              </div>
            </>
          ) : period ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: status === 'current' ? t.primary : t.textTer,
                    background: status === 'current' ? t.primarySubtle : t.surfaceMuted,
                    borderRadius: r.pill,
                    padding: '4px 10px',
                  }}
                >
                  {status === 'current' ? 'Current' : status === 'ended' ? 'Ended' : 'Upcoming'}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={onEditDates} aria-label="Edit cycle dates" style={ghostBtn}>
                    Dates
                  </button>
                  <button type="button" onClick={onCopyCycle} aria-label="Copy from this cycle" style={ghostBtn}>
                    <Copy size={14} aria-hidden />
                  </button>
                </div>
              </div>

              {showGapBanner && (
                <div
                  style={{
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    borderRadius: r.lg,
                    padding: '12px 14px',
                  }}
                >
                  <p style={{ fontSize: 13, color: t.text, margin: 0, lineHeight: 1.45 }}>
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
  border: `1px solid ${t.border}`,
  background: t.surface,
  borderRadius: r.md,
  padding: '8px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  color: t.textSec,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
}

function CollapsibleHeader({
  expanded,
  onToggle,
  markColor,
  children,
  ariaLabel,
}: {
  expanded: boolean
  onToggle: () => void
  markColor: string
  children: React.ReactNode
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={ariaLabel}
      style={{
        width: '100%',
        background: 'transparent',
        color: t.text,
        border: 'none',
        fontWeight: 500,
        fontSize: 14,
        padding: '12px 4px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        fontFamily: fonts.ui,
        textAlign: 'left',
      }}
    >
      <span aria-hidden style={{ width: 3, height: 16, borderRadius: 9999, background: markColor, flexShrink: 0 }} />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flex: 1 }}>
        {children}
      </span>
      <span aria-hidden style={{ display: 'flex', alignItems: 'center', color: t.textTer }}>
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </span>
    </button>
  )
}

function MonthlySummaryCard({ period }: { period: BudgetPeriod }) {
  const [expanded, setExpanded] = useState(true)
  const s = period.summary
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
      style={{
        borderRadius: r.lg,
        overflow: 'hidden',
        border: `1px solid ${t.border}`,
        background: t.surface,
      }}
    >
      <CollapsibleHeader
        expanded={expanded}
        onToggle={() => setExpanded(v => !v)}
        markColor={BUDGET_GROUP_COLORS.Summary}
        ariaLabel={expanded ? 'Collapse monthly summary' : 'Expand monthly summary'}
      >
        Monthly Summary
      </CollapsibleHeader>

      {expanded && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 1fr',
              gap: 0,
              padding: '8px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: t.textSec,
              background: 'var(--ds-surface-muted)',
              borderBottom: `1px dashed ${t.border}`,
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
                padding: '10px 12px',
                borderBottom: `1px dashed ${t.border}`,
                fontSize: 13,
                color: t.text,
              }}
            >
              <span>
                <span style={{ color: t.textTer, marginRight: 6 }}>{row.sign}</span>
                {row.label}
              </span>
              <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(row.amount, period.currency)}
              </span>
            </div>
          ))}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 1fr',
              padding: '10px 12px',
              background: 'var(--ds-surface-muted)',
              fontSize: 13,
              fontWeight: 700,
              borderBottom: `1px dashed ${t.border}`,
            }}
          >
            <span>Total Expenses</span>
            <span style={{ textAlign: 'right' }}>{formatMoney(s.totalExpensesExpected, period.currency)}</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 1fr',
              padding: '10px 12px',
              fontSize: 13,
              fontWeight: 700,
              alignItems: 'center',
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
        </>
      )}
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
      style={{
        padding: '4px 0 8px',
        borderBottom: `1px solid ${t.border}`,
      }}
    >
      <CollapsibleHeader
        expanded={expanded}
        onToggle={() => setExpanded(v => !v)}
        markColor={color}
        ariaLabel={expanded ? `Collapse ${block.group}` : `Expand ${block.group}`}
      >
        <BudgetGroupIcon group={block.group} size={16} />
        {block.group}
        {!expanded && (
          <span style={{ fontWeight: 600, opacity: 0.9, marginLeft: 4 }}>
            · {formatMoney(block.expected, currency)}
          </span>
        )}
      </CollapsibleHeader>

      {expanded && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '28px 1.5fr 1fr 28px',
              gap: 0,
              padding: '8px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: t.textSec,
              background: 'var(--ds-surface-muted)',
              borderBottom: `1px dashed ${t.border}`,
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
              padding: '10px 12px',
              alignItems: 'center',
              borderTop: block.lines.length ? `1px dashed ${t.border}` : 'none',
            }}
          >
            <Plus size={14} color={t.textTer} aria-hidden />
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
              padding: '10px 12px',
              fontWeight: 500,
              fontSize: 13,
              color: t.text,
              borderTop: `1px solid ${t.border}`,
            }}
          >
            <span />
            <span>Total</span>
            <span style={{ textAlign: 'right' }}>{formatMoney(block.expected, currency)}</span>
            <span />
          </div>
        </>
      )}
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
        padding: '8px 12px',
        borderBottom: `1px dashed ${t.border}`,
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
          border: `1.5px solid ${line.settled ? t.success : t.borderStrong}`,
          background: line.settled ? t.success : t.surface,
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
      <div style={{ background: 'var(--ds-surface-muted)', borderRadius: r.sm }}>
        <Input
          value={name}
          onChange={handleNameChange}
          onBlur={handleNameBlur}
          aria-label={`${line.subcategoryName} name`}
        />
      </div>
      <div style={{ background: 'var(--ds-surface-muted)', borderRadius: r.sm }}>
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
