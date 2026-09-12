import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronDown, Plus, Receipt, Wallet } from 'lucide-react'
import type { Budget, Expense, BudgetPeriod, AppHandlers } from '../types'
import {
  t,
  r,
  EmptyState,
  Skeleton,
  FAB,
  ExpenseCategoryIcon,
  BudgetGroupIcon,
  BUDGET_GROUP_COLORS,
} from '../ui'
import { SpendBarChart } from '../components/SpendBarChart'
import { BudgetBar, ScaleFill, budgetStateColor } from '../components/BudgetBar'
import { RollingNumber } from '../components/RollingNumber'
import { ActivityRowShell, useActivityListMotion } from '../components/ActivityListMotion'
import { usePeriodExpenses } from '../hooks/usePeriodExpenses'
import {
  deriveBudgetState,
  expenseTitle,
  formatMoney,
  formatSessionDate,
  formatCycleDay,
  isMemberWritableExpense,
} from '../api/adapters'
import { budgetActivityPath } from '../routing'
import { CycleExpensesLoadError } from '../components/ErrorBoundary'
import { MOTION_EASE, MOTION_MS, useDeltaDuration } from '../lib/motion'

const ACTIVITY_PREVIEW_LIMIT = 5
const CHART_CYCLE_LIMIT = 12

const paperCard = {
  background: 'var(--ds-surface-chrome)',
  border: '1px solid var(--budget-grid)',
  boxShadow: 'var(--budget-card-shadow)',
  borderRadius: r.lg,
} as const

interface Props {
  period: BudgetPeriod | null
  periods: BudgetPeriod[]
  loadPeriodExpenses: (periodId: string, signal?: AbortSignal) => Promise<Expense[]>
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
  const { entries, loadingEntries, loadError, retry } = usePeriodExpenses(
    period?.id ?? null,
    loadPeriodExpenses,
    period?.summary.totalExpensesActual,
  )

  const handleAdd = () => {
    openSheet({ type: 'chooseExpenseEntry' })
  }

  const used = period?.summary.totalExpensesActual ?? 0
  const tallyDuration = useDeltaDuration(used)
  const heroDuration = useDeltaDuration(used, 'hero')
  const previewEntries = entries.slice(0, ACTIVITY_PREVIEW_LIMIT)
  const {
    items: activityItems,
    handleEnterEnd,
    handleExitEnd,
  } = useActivityListMotion(
    previewEntries,
    period?.id ?? null,
    Boolean(period) && !loadingEntries,
    expense => String(expense.amount),
  )

  if (periods.length === 0 || !period) {
    return (
      <div className="budget-overview" style={{ paddingTop: 8 }}>
        <EmptyState
          icon={Wallet}
          title="No budget cycle yet"
          body="Plan a pay cycle to see spend against your budget. Expenses follow the cycle dates, not the calendar month."
          action="Start this cycle"
          onAction={onCreateCycle}
        />
        <FAB onClick={handleAdd} aria-label="Add expense">
          <Plus size={24} aria-hidden />
        </FAB>
      </div>
    )
  }

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

  const handleOpenExpense = (expense: Expense) => {
    if (!isMemberWritableExpense(expense.sourceType)) return
    openSheet({ type: 'editExpense', expense })
  }

  const showViewMore = entries.length > ACTIVITY_PREVIEW_LIMIT

  const handleViewMore = () => {
    navigate(budgetActivityPath(period.id))
  }

  return (
    <div className="budget-overview" style={{ paddingTop: 16, paddingLeft: 16, paddingRight: 16 }}>
      <div className="budget-overview-split">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section aria-label="Cycle spend" style={{ ...paperCard, padding: '20px 20px 16px' }}>
            <p style={{
              fontSize: 44,
              fontWeight: 500,
              color: 'var(--budget-text)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              margin: 0,
              fontFamily: 'var(--ds-font)',
            }}>
              <RollingNumber
                value={used}
                currency={period.currency}
                variant="odometer"
                durationMs={heroDuration}
              />
            </p>
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
                  durationMs={tallyDuration}
                  trackColor="var(--budget-toggle)"
                />
              </>
            ) : null}
          </section>

          <section aria-label="Entries and average" style={paperCard}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
            }}>
              <StatCell label="Entries" value={entryCount} format="integer" durationMs={tallyDuration} />
              <StatCell
                label="Avg"
                value={average}
                currency={period.currency}
                format="money"
                durationMs={tallyDuration}
                last
              />
            </div>
          </section>

          {chartBuckets.length > 0 && (
            <section aria-label="Recent cycles" style={{ ...paperCard, padding: '12px 12px 8px' }}>
              <SpendBarChart
                buckets={chartBuckets}
                selectedId={period.id}
                currency={period.currency}
                onSelect={onSelectPeriod}
                durationMs={tallyDuration}
              />
            </section>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {spendGroups.length > 0 && (
            <div>
              <p style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--budget-label)',
                letterSpacing: '0.01em',
                padding: '0 4px 8px',
                fontFamily: 'var(--ds-font)',
                margin: 0,
              }}>
                Spending by group
              </p>
              <SpendGroupList
                groups={spendGroups}
                currency={period.currency}
                durationMs={tallyDuration}
              />
            </div>
          )}

          <section aria-label="Activity" style={paperCard}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 16px 4px',
            }}>
              <p style={{
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--budget-text)',
                margin: 0,
                fontFamily: 'var(--ds-font)',
              }}>
                Activity
              </p>
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
            <div style={{ minHeight: 56 }}>
              {loadingEntries ? (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Skeleton h={16} />
                  <Skeleton h={16} w="70%" />
                </div>
              ) : entries.length === 0 ? (
                <>
                  <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Receipt size={16} color="var(--budget-dim)" strokeWidth={1.75} />
                    <p style={{ fontSize: 14, color: 'var(--budget-dim)', margin: 0 }}>
                      No expenses in this cycle.
                    </p>
                  </div>
                  {loadError && <CycleExpensesLoadError onRetry={retry} />}
                </>
              ) : (
                <>
                  {activityItems.map(({ item: expense, phase }, i) => {
                    const isManual = isMemberWritableExpense(expense.sourceType)
                    const title = expenseTitle(expense)
                    const itemCount = expense.sourceItemCount
                    const subtitle = expense.sourceType === 'shopping_session' && itemCount != null
                      ? `${expense.group} · ${expense.subcategoryName} · ${itemCount} item${itemCount !== 1 ? 's' : ''}`
                      : `${expense.group} · ${expense.subcategoryName}`
                    return (
                      <ActivityRowShell
                        key={expense.id}
                        phase={phase}
                        onEnterEnd={() => handleEnterEnd(expense.id)}
                        onExitEnd={() => handleExitEnd(expense.id)}
                      >
                        <button
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
                            borderTop: i > 0 ? '1px solid var(--budget-grid)' : 'none',
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
                              background: 'var(--budget-toggle)',
                              color: BUDGET_GROUP_COLORS[expense.group] ?? 'var(--budget-dim)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <ExpenseCategoryIcon category={expense.group} size={16} />
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 15, color: 'var(--budget-text)', fontWeight: 500 }}>{title}</div>
                              <div style={{ fontSize: 12, color: 'var(--budget-dim)', marginTop: 2 }}>
                                {formatSessionDate(expense.occurredAt)} · {subtitle}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--budget-text)', flexShrink: 0 }}>
                            <RollingNumber value={expense.amount} currency={expense.currency} />
                          </span>
                        </button>
                      </ActivityRowShell>
                    )
                  })}
                  {loadError && <CycleExpensesLoadError onRetry={retry} />}
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      <FAB onClick={handleAdd} aria-label="Add expense">
        <Plus size={24} aria-hidden />
      </FAB>
    </div>
  )
}

function SpendGroupList({
  groups,
  currency,
  durationMs,
}: {
  groups: SpendGroup[]
  currency: string
  durationMs: number
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {groups.map(group => {
        const isOpen = Boolean(expanded[group.group])
        const panelId = groupPanelId(group.group)
        const color = BUDGET_GROUP_COLORS[group.group] ?? t.primary
        return (
          <section
            key={group.group}
            aria-label={group.group}
            style={{ ...paperCard, overflow: 'hidden' }}
          >
            <SpendGroupHeader
              group={group}
              currency={currency}
              expanded={isOpen}
              panelId={panelId}
              color={color}
              durationMs={durationMs}
              onToggle={() => handleToggle(group.group)}
            />
            <div
              id={panelId}
              role="region"
              aria-label={`${group.group} lines`}
              aria-hidden={!isOpen}
              className={isOpen ? 'spend-group-panel is-open' : 'spend-group-panel'}
            >
              <div className="spend-group-panel-inner">
                {group.lines.map(line => (
                  <CategoryRow
                    key={line.subcategoryId}
                    category={line.name}
                    amount={line.total}
                    currency={currency}
                    share={group.actual > 0 ? line.total / group.actual : 0}
                    budget={line.budget}
                    color={color}
                    durationMs={durationMs}
                    divider
                  />
                ))}
              </div>
            </div>
          </section>
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
  durationMs,
  onToggle,
}: {
  group: SpendGroup
  currency: string
  expanded: boolean
  panelId: string
  color: string
  durationMs: number
  onToggle: () => void
}) {
  const hasLimit = group.expected > 0
  const { percentUsed, state } = deriveBudgetState(group.actual, group.expected)
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
          <span aria-hidden style={{ width: 3, height: 16, borderRadius: 9999, background: color, flexShrink: 0 }} />
          <span style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'var(--budget-toggle)',
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <BudgetGroupIcon group={group.group} size={16} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, color: 'var(--budget-text)', fontWeight: 500 }}>{group.group}</div>
            <div style={{ fontSize: 12, color: 'var(--budget-dim)', marginTop: 2 }}>{linesLabel}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--budget-text)',
          }}>
            <RollingNumber value={group.actual} currency={currency} durationMs={durationMs} />
            {hasLimit ? (
              <>
                {' / '}
                <RollingNumber value={group.expected} currency={currency} durationMs={durationMs} />
              </>
            ) : null}
          </span>
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
      {hasLimit ? (
        <div style={{ marginTop: 8 }}>
          <ScaleFill
            percent={percentUsed}
            color={state === 'over' ? t.error : budgetStateColor(state)}
            durationMs={durationMs}
            trackColor="var(--budget-toggle)"
          />
        </div>
      ) : null}
    </button>
  )
}

function CategoryRow({ category, amount, currency, share, budget, color, durationMs, divider }: {
  category: string
  amount: number
  currency: string
  share: number
  budget?: Budget | null
  color: string
  durationMs: number
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
      padding: '12px 16px 12px 60px',
      borderTop: divider ? '1px solid var(--budget-grid)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 14, color: 'var(--budget-text)', fontWeight: 500, minWidth: 0, opacity: 0.78 }}>{category}</span>
        {hasBudget && budget ? (
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--budget-text)', flexShrink: 0, opacity: 0.78 }}>
            <RollingNumber value={amount} currency={currency} durationMs={durationMs} />
            {' / '}
            <RollingNumber value={budget.amount} currency={currency} durationMs={durationMs} />
          </span>
        ) : (
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--budget-text)', flexShrink: 0, opacity: 0.78 }}>
            <RollingNumber value={amount} currency={currency} durationMs={durationMs} />
          </span>
        )}
      </div>
      <div
        role={hasBudget ? 'progressbar' : 'presentation'}
        aria-label={hasBudget && budget ? `${category} budget ${Math.round(budget.percentUsed)} percent used` : undefined}
        aria-valuemin={hasBudget ? 0 : undefined}
        aria-valuemax={hasBudget ? 100 : undefined}
        aria-valuenow={hasBudget && budget ? Math.min(budget.percentUsed, 100) : undefined}
        style={{ marginTop: 8 }}
      >
        <ScaleFill
          percent={fillPercent}
          color={barColor}
          durationMs={durationMs}
          trackColor="var(--budget-toggle)"
        />
      </div>
    </div>
  )
}

function StatCell({
  label,
  value,
  currency,
  format,
  durationMs,
  last,
}: {
  label: string
  value: number
  currency?: string
  format: 'integer' | 'money'
  durationMs: number
  last?: boolean
}) {
  return (
    <div style={{
      padding: '14px 12px',
      textAlign: 'center',
      borderRight: last ? 'none' : '1px solid var(--budget-grid)',
    }}>
      <p style={{
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--budget-text)',
        letterSpacing: '-0.02em',
        margin: 0,
      }}>
        <RollingNumber
          value={value}
          currency={currency}
          format={format}
          durationMs={durationMs}
        />
      </p>
      <p style={{ fontSize: 11, color: 'var(--budget-dim)', marginTop: 4 }}>{label}</p>
    </div>
  )
}
