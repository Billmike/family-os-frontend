import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Pencil, Plus, Receipt, Wallet } from 'lucide-react'
import type { BudgetPeriod, Expense, AppHandlers } from '../types'
import { t, r, EmptyState, Skeleton, FAB, ExpenseCategoryIcon, BUDGET_GROUP_COLORS, fonts, IconButton } from '../ui'
import { CycleExpensesLoadError } from '../components/ErrorBoundary'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { MoneyChrome } from '../components/MoneyChrome'
import { ActivityRowShell, ActivityTableRow, useActivityListMotion } from '../components/ActivityListMotion'
import { usePeriodExpenses } from '../hooks/usePeriodExpenses'
import {
  expenseTitle,
  formatMoney,
  formatSessionDate,
  formatYearMonthCompact,
  cycleIdentityStatus,
  formatCycleDateRange,
  isMemberWritableExpense,
  periodForMonth,
} from '../api/adapters'
import { budgetActivityPath, parsePeriodId, parseYearMonth } from '../routing'

interface Props {
  period: BudgetPeriod | null
  periods: BudgetPeriod[]
  selectedPeriodId: string | null
  today: string
  loadPeriodExpenses: (periodId: string, signal?: AbortSignal) => Promise<Expense[]>
  onSelectPeriod: (periodId: string) => void
  onSelectPersonal: () => void
  onOpenCycleList?: () => void
  openSheet: AppHandlers['openSheet']
}

const paperCard = {
  background: 'var(--ds-surface-chrome)',
  border: '1px solid var(--budget-grid)',
  boxShadow: 'var(--budget-card-shadow)',
  borderRadius: r.lg,
} as const

const PAGE_SIZE = 10

const thStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--budget-dim)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  textAlign: 'left' as const,
  padding: '12px 16px',
  borderBottom: '1px solid var(--budget-grid)',
  whiteSpace: 'nowrap' as const,
  fontFamily: fonts.ui,
}

const tdStyle = {
  fontSize: 14,
  color: 'var(--budget-text)',
  padding: '12px 16px',
  borderTop: '1px solid var(--budget-grid)',
  verticalAlign: 'middle' as const,
  fontFamily: fonts.ui,
}

export default function ExpenseActivityScreen({
  period,
  periods,
  selectedPeriodId,
  today,
  loadPeriodExpenses,
  onSelectPeriod,
  onSelectPersonal,
  onOpenCycleList,
  openSheet,
}: Props) {
  const location = useLocation()
  const routerNavigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const queryPeriod = parsePeriodId(params.get('period'))
  const queryMonth = parseYearMonth(params.get('month'))
  const { entries, loadingEntries, loadError, retry } = usePeriodExpenses(
    period?.id ?? null,
    loadPeriodExpenses,
    period?.summary.totalExpensesActual,
  )
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (queryPeriod && periods.some(row => row.id === queryPeriod)) {
      onSelectPeriod(queryPeriod)
      return
    }
    if (!queryMonth) return
    const match = periodForMonth(periods, queryMonth)
    if (match) onSelectPeriod(match.id)
  }, [queryPeriod, queryMonth, periods, onSelectPeriod])

  useEffect(() => {
    setPage(0)
  }, [period?.id])

  useEffect(() => {
    if (!selectedPeriodId) return
    if (queryPeriod === selectedPeriodId && !queryMonth) return
    if (!queryPeriod || queryMonth) {
      routerNavigate(budgetActivityPath(selectedPeriodId), { replace: true })
    }
  }, [selectedPeriodId, queryPeriod, queryMonth, routerNavigate])

  const handleAdd = () => {
    openSheet({ type: 'chooseExpenseEntry' })
  }

  const handleOpenExpense = (expense: Expense) => {
    if (expense.sourceType === 'shopping_session') return
    openSheet({ type: 'editExpense', expense })
  }

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const pagedEntries = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const {
    items: activityItems,
    handleEnterEnd,
    handleExitEnd,
  } = useActivityListMotion(
    pagedEntries,
    period?.id ? `${period.id}:${page}` : null,
    Boolean(period) && !loadingEntries,
    expense => String(expense.amount),
  )

  if (periods.length === 0 || !period) {
    return (
      <MoneyChrome
        scope="family"
        familyView="activity"
        onSelectFamily={() => undefined}
        onSelectPersonal={onSelectPersonal}
        statusLabel={cycleIdentityStatus(null, today)}
      >
        <div
          className="budget-activity budget-motion"
          style={{ animation: 'budgetEnter 0.22s ease-out' }}
        >
          <EmptyState
            icon={Wallet}
            title="No budget cycle yet"
            body="Plan a pay cycle to see expenses for that window."
          />
        </div>
        <FAB onClick={handleAdd} aria-label="Add expense">
          <Plus size={24} aria-hidden />
        </FAB>
      </MoneyChrome>
    )
  }

  const selectedIndex = periods.findIndex(row => row.id === period.id)
  const canGoPrev = selectedIndex > 0
  const canGoNext = selectedIndex >= 0 && selectedIndex < periods.length - 1

  const handleSelectCycle = (periodId: string) => {
    onSelectPeriod(periodId)
    routerNavigate(budgetActivityPath(periodId), { replace: true })
  }

  const handlePrev = () => {
    if (!canGoPrev) return
    handleSelectCycle(periods[selectedIndex - 1].id)
  }

  const handleNext = () => {
    if (!canGoNext) return
    handleSelectCycle(periods[selectedIndex + 1].id)
  }

  const canPagePrev = page > 0
  const canPageNext = page < totalPages - 1

  return (
    <MoneyChrome
      scope="family"
      familyView="activity"
      onSelectFamily={() => undefined}
      onSelectPersonal={onSelectPersonal}
      statusLabel={cycleIdentityStatus(period, today)}
      switcher={
        <MonthSwitcher
          title={formatYearMonthCompact(period.labelMonth)}
          subtitle={formatCycleDateRange(period.startDate, period.endDate)}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          onPrev={handlePrev}
          onNext={handleNext}
          onAllCycles={onOpenCycleList}
          tone="paper"
        />
      }
    >
      <div
        className="budget-activity budget-motion"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          paddingTop: 16,
          paddingLeft: 16,
          paddingRight: 16,
          animation: 'budgetEnter 0.22s ease-out',
        }}
      >
        <section aria-label="Expense list" style={{ ...paperCard, overflow: 'hidden' }}>
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
              <div className="hide-desktop">
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
                        <span style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: 'var(--budget-text)',
                          fontVariantNumeric: 'tabular-nums',
                          flexShrink: 0,
                        }}>
                          {formatMoney(expense.amount, expense.currency)}
                        </span>
                      </button>
                    </ActivityRowShell>
                  )
                })}
              </div>

              <div className="hide-mobile" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                  <thead>
                    <tr>
                      <th scope="col" style={thStyle}>Merchant</th>
                      <th scope="col" style={thStyle}>Subcategory</th>
                      <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                      <th scope="col" style={thStyle}>Date</th>
                      <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityItems.map(({ item: expense, phase }, i) => {
                      const isManual = isMemberWritableExpense(expense.sourceType)
                      const title = expenseTitle(expense)
                      const cellStyle = i === 0 ? { ...tdStyle, borderTop: 'none' } : tdStyle
                      return (
                        <ActivityTableRow
                          key={expense.id}
                          phase={phase}
                          onEnterEnd={() => handleEnterEnd(expense.id)}
                          onExitEnd={() => handleExitEnd(expense.id)}
                        >
                          <td style={{ ...cellStyle, fontWeight: 500 }}>{title}</td>
                          <td style={cellStyle}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              <ExpenseCategoryIcon category={expense.group} size={14} />
                              {expense.group} · {expense.subcategoryName}
                            </span>
                          </td>
                          <td style={{
                            ...cellStyle,
                            textAlign: 'right',
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                            whiteSpace: 'nowrap',
                          }}>
                            {formatMoney(expense.amount, expense.currency)}
                          </td>
                          <td style={{ ...cellStyle, color: 'var(--budget-dim)', whiteSpace: 'nowrap' }}>
                            {formatSessionDate(expense.occurredAt)}
                          </td>
                          <td style={{ ...cellStyle, textAlign: 'right' }}>
                            {isManual ? (
                              <button
                                type="button"
                                aria-label={`Edit ${title}`}
                                onClick={() => handleOpenExpense(expense)}
                                style={{
                                  width: 36,
                                  height: 36,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: 'none',
                                  background: 'none',
                                  borderRadius: r.md,
                                  cursor: 'pointer',
                                  color: 'var(--budget-dim)',
                                }}
                              >
                                <Pencil size={16} strokeWidth={1.75} />
                              </button>
                            ) : null}
                          </td>
                        </ActivityTableRow>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {loadError && <CycleExpensesLoadError onRetry={retry} />}
            </>
          )}
        </section>

      {totalPages > 1 && !loadingEntries && entries.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}>
          <IconButton
            aria-label="Previous page"
            onClick={() => setPage(p => p - 1)}
            disabled={!canPagePrev}
            size={36}
          >
            <ChevronLeft size={18} strokeWidth={1.75} aria-hidden />
          </IconButton>
          <span style={{
            fontSize: 13,
            color: 'var(--budget-dim)',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: fonts.ui,
          }}>
            {page + 1} of {totalPages}
          </span>
          <IconButton
            aria-label="Next page"
            onClick={() => setPage(p => p + 1)}
            disabled={!canPageNext}
            size={36}
          >
            <ChevronRight size={18} strokeWidth={1.75} aria-hidden />
          </IconButton>
        </div>
      )}
      </div>

      <FAB onClick={handleAdd} aria-label="Add expense">
        <Plus size={24} aria-hidden />
      </FAB>
    </MoneyChrome>
  )
}
