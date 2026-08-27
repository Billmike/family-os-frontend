import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronDown, ChevronRight, Plus, Receipt, Wallet } from 'lucide-react'
import type { Budget, Expense, BudgetPeriod, AppHandlers } from '../types'
import {
  t,
  r,
  EmptyState,
  SectionLabel,
  Skeleton,
  FAB,
  ExpenseCategoryIcon,
  BudgetGroupIcon,
  BUDGET_GROUP_COLORS,
} from '../ui'
import { SpendBarChart } from '../components/SpendBarChart'
import { BudgetBar, budgetStateColor } from '../components/BudgetBar'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { usePeriodExpenses } from '../hooks/usePeriodExpenses'
import {
  deriveBudgetState,
  expenseTitle,
  formatMoney,
  formatSessionDate,
  formatYearMonthTitle,
  formatCycleDateRange,
  formatCycleDay,
} from '../api/adapters'
import { budgetActivityPath } from '../routing'

const ACTIVITY_PREVIEW_LIMIT = 5
const CHART_CYCLE_LIMIT = 12

interface Props {
  period: BudgetPeriod | null
  periods: BudgetPeriod[]
  loadPeriodExpenses: (periodId: string) => Promise<Expense[]>
  onSelectPeriod: (periodId: string) => void
  onCreateCycle: () => void
  openSheet: AppHandlers['openSheet']
}

interface SubcategorySpendRow {
  subcategoryId: string
  name: string
  total: number
  budget: Budget | null
}

interface SpendGroup {
  group: string
  actual: number
  expected: number
  lines: SubcategorySpendRow[]
}

const cycleSpendGroups = (period: BudgetPeriod, entries: Expense[]): SpendGroup[] => {
  const totals = new Map<string, { group: string; name: string; total: number }>()
  for (const expense of entries) {
    if (expense.direction !== 'outflow') continue
    const existing = totals.get(expense.subcategoryId)
    if (existing) {
      existing.total += expense.amount
      continue
    }
    totals.set(expense.subcategoryId, {
      group: expense.group,
      name: expense.subcategoryName,
      total: expense.amount,
    })
  }
  const linesBySub = new Map(
    period.groups.flatMap(block => block.lines).map(line => [line.subcategoryId, line]),
  )

  return period.groups
    .filter(block => block.direction === 'outflow')
    .map(block => {
      const lines = [...totals.entries()]
        .filter(([, row]) => row.group === block.group)
        .map(([subcategoryId, row]) => ({
          subcategoryId,
          name: row.name,
          total: row.total,
          budget: linesBySub.get(subcategoryId) ?? null,
        }))
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
      return {
        group: block.group,
        actual: block.actual,
        expected: block.expected,
        lines,
      }
    })
    .filter(group => group.lines.length > 0)
}

const defaultExpandedGroups = (groups: SpendGroup[]): Record<string, boolean> => {
  const next: Record<string, boolean> = {}
  for (const group of groups) {
    next[group.group] = group.lines.length <= 1
  }
  return next
}

const groupPanelId = (group: string) =>
  `spend-group-${group.toLowerCase().replace(/\s+/g, '-')}`

const lineCountLabel = (count: number) =>
  count === 1 ? '1 line' : `${count} lines`

export default function ExpensesScreen({
  period,
  periods,
  loadPeriodExpenses,
  onSelectPeriod,
  onCreateCycle,
  openSheet,
}: Props) {
  const navigate = useNavigate()
  const { entries, loadingEntries } = usePeriodExpenses(period?.id ?? null, loadPeriodExpenses)

  const handleAdd = () => {
    openSheet({ type: 'chooseExpenseEntry' })
  }

  if (periods.length === 0 || !period) {
    return (
      <div>
        <EmptyState
          icon={Wallet}
          title="No budget cycle yet"
          body="Plan a pay cycle to see spend against your budget. Expenses follow the cycle dates, not the calendar month."
          action="Start this cycle"
          onAction={onCreateCycle}
        />
        <FAB onClick={handleAdd} aria-label="Add expense">
          <Plus size={24} color={t.onPrimary} />
        </FAB>
      </div>
    )
  }

  const selectedIndex = periods.findIndex(row => row.id === period.id)
  const previous = selectedIndex > 0 ? periods[selectedIndex - 1] : undefined
  const canGoPrev = selectedIndex > 0
  const canGoNext = selectedIndex >= 0 && selectedIndex < periods.length - 1
  const used = period.summary.totalExpensesActual
  const expected = period.summary.totalExpensesExpected
  const remaining = expected - used
  const { percentUsed, state } = deriveBudgetState(used, expected)
  const outflowEntries = entries.filter(expense => expense.direction === 'outflow')
  const entryCount = outflowEntries.length
  const average = entryCount > 0 ? used / entryCount : 0
  const spendGroups = cycleSpendGroups(period, entries)
  const chartBuckets = periods.slice(-CHART_CYCLE_LIMIT).map(row => ({
    id: row.id,
    total: row.summary.totalExpensesActual,
    label: formatCycleDay(row.endDate),
    shortLabel: String(new Date(`${row.endDate}T12:00:00`).getDate()),
  }))

  const comparison = previous
    ? (() => {
        const delta = used - previous.summary.totalExpensesActual
        const prevName = formatCycleDateRange(previous.startDate, previous.endDate)
        if (Math.abs(delta) < 0.005) return { text: `Same as ${prevName}`, color: t.textSec }
        if (delta > 0) return { text: `${formatMoney(delta, period.currency)} more than ${prevName}`, color: t.error }
        return { text: `${formatMoney(Math.abs(delta), period.currency)} less than ${prevName}`, color: t.success }
      })()
    : null

  const handlePrev = () => {
    if (!canGoPrev) return
    onSelectPeriod(periods[selectedIndex - 1].id)
  }

  const handleNext = () => {
    if (!canGoNext) return
    onSelectPeriod(periods[selectedIndex + 1].id)
  }

  const handleOpenExpense = (expense: Expense) => {
    if (expense.sourceType === 'shopping_session') return
    openSheet({ type: 'editExpense', expense })
  }

  const previewEntries = entries.slice(0, ACTIVITY_PREVIEW_LIMIT)
  const showViewMore = entries.length > ACTIVITY_PREVIEW_LIMIT

  const handleViewMore = () => {
    navigate(budgetActivityPath(period.id))
  }

  return (
    <div style={{ padding: '8px 0 32px' }}>
      <MonthSwitcher
        title={formatYearMonthTitle(period.labelMonth)}
        subtitle={formatCycleDateRange(period.startDate, period.endDate)}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      <div style={{ padding: '12px 20px 20px' }}>
        <p style={{
          fontSize: 40,
          fontWeight: 600,
          color: t.text,
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
          margin: 0,
        }}>
          {formatMoney(used, period.currency)}
        </p>
        {comparison && (
          <p style={{ fontSize: 13, color: comparison.color, marginTop: 8 }}>
            {comparison.text}
          </p>
        )}
        {expected > 0 ? (
          <>
            <p style={{
              fontSize: 14,
              color: budgetStateColor(state),
              margin: '12px 0 0',
            }}>
              {formatMoney(used, period.currency)} of {formatMoney(expected, period.currency)}
              {' · '}
              {remaining >= 0
                ? `${formatMoney(remaining, period.currency)} left`
                : `${formatMoney(Math.abs(remaining), period.currency)} over`}
            </p>
            <BudgetBar
              percentUsed={percentUsed}
              state={state}
              ariaLabel={`Cycle budget ${Math.round(percentUsed)} percent used`}
            />
          </>
        ) : null}
      </div>

      <div style={{
        margin: '0 16px 20px',
        background: t.surface,
        borderRadius: r.lg,
        border: `1px solid ${t.border}`,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
      }}>
        <StatCell label="Entries" value={String(entryCount)} />
        <StatCell label="Avg" value={formatMoney(average, period.currency)} last />
      </div>

      {chartBuckets.length > 0 && (
        <div style={{
          margin: '0 16px 8px',
          background: t.surface,
          borderRadius: r.lg,
          border: `1px solid ${t.border}`,
          padding: '16px 8px 12px',
        }}>
          <SpendBarChart
            buckets={chartBuckets}
            selectedId={period.id}
            currency={period.currency}
            onSelect={onSelectPeriod}
          />
        </div>
      )}

      {spendGroups.length > 0 && (
        <>
          <SectionLabel>Spending by group</SectionLabel>
          <SpendGroupList
            key={period.id}
            groups={spendGroups}
            currency={period.currency}
          />
        </>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingRight: 16,
      }}>
        <SectionLabel>Activity</SectionLabel>
        {showViewMore && (
          <button
            type="button"
            onClick={handleViewMore}
            aria-label="View more expenses"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              color: t.primary,
              fontSize: 13,
              fontWeight: 500,
              padding: '4px 0',
              fontFamily: 'var(--ds-font)',
              flexShrink: 0,
            }}
          >
            View more <ArrowRight size={13} />
          </button>
        )}
      </div>
      <div style={{
        margin: '0 16px',
        background: t.surface,
        borderRadius: r.lg,
        border: `1px solid ${t.border}`,
        overflow: 'hidden',
        minHeight: 56,
      }}>
        {loadingEntries ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton h={16} />
            <Skeleton h={16} w="70%" />
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Receipt size={16} color={t.textTer} strokeWidth={1.75} />
            <p style={{ fontSize: 14, color: t.textTer, margin: 0 }}>
              No expenses in this cycle.
            </p>
          </div>
        ) : (
          previewEntries.map((expense, i) => {
            const isManual = expense.sourceType === 'manual'
            const title = expenseTitle(expense)
            const itemCount = expense.sourceItemCount
            const subtitle = expense.sourceType === 'shopping_session' && itemCount != null
              ? `${expense.group} · ${expense.subcategoryName} · ${itemCount} item${itemCount !== 1 ? 's' : ''}`
              : `${expense.group} · ${expense.subcategoryName}`
            return (
              <button
                key={expense.id}
                type="button"
                onClick={() => handleOpenExpense(expense)}
                disabled={!isManual}
                aria-label={isManual ? `Edit ${title}` : title}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  border: 'none',
                  borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
                  background: 'none',
                  cursor: isManual ? 'pointer' : 'default',
                  textAlign: 'left',
                  fontFamily: 'var(--ds-font)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <span style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: t.surfaceMuted,
                    color: BUDGET_GROUP_COLORS[expense.group] ?? t.textSec,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <ExpenseCategoryIcon category={expense.group} size={16} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: t.text, fontWeight: 500 }}>{title}</div>
                    <div style={{ fontSize: 12, color: t.textTer, marginTop: 2 }}>
                      {formatSessionDate(expense.occurredAt)} · {subtitle}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: t.text, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {formatMoney(expense.amount, expense.currency)}
                </span>
              </button>
            )
          })
        )}
      </div>

      <FAB onClick={handleAdd} aria-label="Add expense">
        <Plus size={24} color={t.onPrimary} />
      </FAB>
    </div>
  )
}

function SpendGroupList({
  groups,
  currency,
}: {
  groups: SpendGroup[]
  currency: string
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => defaultExpandedGroups(groups))

  useEffect(() => {
    setExpanded(prev => {
      const next = { ...prev }
      let changed = false
      for (const group of groups) {
        if (!(group.group in next)) {
          next[group.group] = group.lines.length <= 1
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [groups])

  const handleToggle = (group: string) => {
    setExpanded(prev => ({ ...prev, [group]: !prev[group] }))
  }

  return (
    <div style={{
      margin: '0 16px 8px',
      background: t.surface,
      borderRadius: r.lg,
      border: `1px solid ${t.border}`,
      overflow: 'hidden',
    }}>
      {groups.map((group, i) => {
        const isOpen = Boolean(expanded[group.group])
        const panelId = groupPanelId(group.group)
        const color = BUDGET_GROUP_COLORS[group.group] ?? t.primary
        return (
          <div key={group.group} style={{ borderTop: i > 0 ? `1px solid ${t.border}` : 'none' }}>
            <SpendGroupHeader
              group={group}
              currency={currency}
              expanded={isOpen}
              panelId={panelId}
              color={color}
              onToggle={() => handleToggle(group.group)}
            />
            <div
              id={panelId}
              role="region"
              aria-label={`${group.group} lines`}
              hidden={!isOpen}
            >
              {isOpen && group.lines.map(line => (
                <CategoryRow
                  key={line.subcategoryId}
                  category={line.name}
                  amount={line.total}
                  currency={currency}
                  share={group.actual > 0 ? line.total / group.actual : 0}
                  budget={line.budget}
                  color={color}
                  divider
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SpendGroupHeader({
  group,
  currency,
  expanded,
  panelId,
  color,
  onToggle,
}: {
  group: SpendGroup
  currency: string
  expanded: boolean
  panelId: string
  color: string
  onToggle: () => void
}) {
  const hasLimit = group.expected > 0
  const { percentUsed, state } = deriveBudgetState(group.actual, group.expected)
  const moneyLabel = hasLimit
    ? `${formatMoney(group.actual, currency)} / ${formatMoney(group.expected, currency)}`
    : formatMoney(group.actual, currency)
  const linesLabel = lineCountLabel(group.lines.length)
  const ariaLabel = hasLimit
    ? `${group.group}, ${formatMoney(group.actual, currency)} of ${formatMoney(group.expected, currency)}, ${linesLabel}`
    : `${group.group}, ${formatMoney(group.actual, currency)}, ${linesLabel}`

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
        fontFamily: 'var(--ds-font)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: t.surfaceMuted,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <BudgetGroupIcon group={group.group} size={16} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, color: t.text, fontWeight: 500 }}>{group.group}</div>
            <div style={{ fontSize: 12, color: t.textTer, marginTop: 2 }}>{linesLabel}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: t.text,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {moneyLabel}
          </span>
          {expanded
            ? <ChevronDown size={16} color={t.textTer} aria-hidden />
            : <ChevronRight size={16} color={t.textTer} aria-hidden />}
        </div>
      </div>
      {hasLimit ? (
        <div
          aria-hidden
          style={{
            marginTop: 8,
            height: 6,
            borderRadius: 9999,
            background: t.surfaceMuted,
            overflow: 'hidden',
          }}
        >
          <div style={{
            width: `${Math.min(Math.max(percentUsed, 0), 100)}%`,
            height: '100%',
            borderRadius: 9999,
            background: state === 'over' ? t.error : budgetStateColor(state),
          }} />
        </div>
      ) : null}
    </button>
  )
}

function CategoryRow({ category, amount, currency, share, budget, color, divider }: {
  category: string
  amount: number
  currency: string
  share: number
  budget?: Budget | null
  color: string
  divider: boolean
}) {
  const hasBudget = Boolean(budget && budget.amount > 0)
  const fillPercent = hasBudget && budget
    ? Math.min((budget.used / budget.amount) * 100, 100)
    : Math.max(share * 100, share > 0 ? 4 : 0)
  const barColor = hasBudget && budget
    ? budget.state === 'over' ? t.error : budgetStateColor(budget.state)
    : color

  return (
    <div style={{
      padding: '12px 16px',
      borderTop: divider ? `1px solid ${t.border}` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span
            aria-hidden
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: t.surfaceMuted,
              color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Receipt size={16} strokeWidth={1.75} />
          </span>
          <span style={{ fontSize: 14, color: t.text, fontWeight: 500 }}>{category}</span>
        </div>
        {hasBudget && budget ? (
          <span style={{ fontSize: 13, fontWeight: 600, color: t.text, fontVariantNumeric: 'tabular-nums' }}>
            {formatMoney(amount, currency)} / {formatMoney(budget.amount, currency)}
          </span>
        ) : (
          <span style={{ fontSize: 14, fontWeight: 600, color: t.text, fontVariantNumeric: 'tabular-nums' }}>
            {formatMoney(amount, currency)}
          </span>
        )}
      </div>
      <div
        role={hasBudget ? 'progressbar' : 'presentation'}
        aria-label={hasBudget && budget ? `${category} budget ${Math.round(budget.percentUsed)} percent used` : undefined}
        aria-valuemin={hasBudget ? 0 : undefined}
        aria-valuemax={hasBudget ? 100 : undefined}
        aria-valuenow={hasBudget && budget ? Math.min(budget.percentUsed, 100) : undefined}
        style={{
          marginTop: 8,
          height: 6,
          borderRadius: 9999,
          background: t.surfaceMuted,
          overflow: 'hidden',
        }}
      >
        <div style={{
          width: `${fillPercent}%`,
          height: '100%',
          borderRadius: 9999,
          background: barColor,
        }} />
      </div>
    </div>
  )
}

function StatCell({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      padding: '14px 12px',
      textAlign: 'center',
      borderRight: last ? 'none' : `1px solid ${t.border}`,
    }}>
      <p style={{
        fontSize: 15,
        fontWeight: 600,
        color: t.text,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
        margin: 0,
      }}>
        {value}
      </p>
      <p style={{ fontSize: 11, color: t.textTer, marginTop: 4 }}>{label}</p>
    </div>
  )
}
