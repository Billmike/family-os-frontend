import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Pencil, Plus, Receipt, Wallet } from 'lucide-react'
import type { BudgetPeriod, Expense, AppHandlers } from '../types'
import { t, r, EmptyState, Skeleton, FAB, ExpenseCategoryIcon, BUDGET_GROUP_COLORS } from '../ui'
import { CycleExpensesLoadError } from '../components/ErrorBoundary'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { usePeriodExpenses } from '../hooks/usePeriodExpenses'
import {
  expenseTitle,
  formatMoney,
  formatSessionDate,
  formatYearMonthTitle,
  formatCycleDateRange,
  periodForMonth,
} from '../api/adapters'
import { budgetActivityPath, parsePeriodId, parseYearMonth } from '../routing'

interface Props {
  period: BudgetPeriod | null
  periods: BudgetPeriod[]
  selectedPeriodId: string | null
  loadPeriodExpenses: (periodId: string, signal?: AbortSignal) => Promise<Expense[]>
  onSelectPeriod: (periodId: string) => void
  openSheet: AppHandlers['openSheet']
}

const PAGE_SIZE = 10

const thStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: t.textTer,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  textAlign: 'left' as const,
  padding: '12px 16px',
  borderBottom: `1px solid ${t.border}`,
  whiteSpace: 'nowrap' as const,
}

const tdStyle = {
  fontSize: 14,
  color: t.text,
  padding: '12px 16px',
  borderTop: `1px solid ${t.border}`,
  verticalAlign: 'middle' as const,
}

export default function ExpenseActivityScreen({
  period,
  periods,
  selectedPeriodId,
  loadPeriodExpenses,
  onSelectPeriod,
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

  if (periods.length === 0 || !period) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <EmptyState
          icon={Wallet}
          title="No budget cycle yet"
          body="Plan a pay cycle to see expenses for that window."
        />
        <FAB onClick={handleAdd} aria-label="Add expense">
          <Plus size={24} color={t.onPrimary} />
        </FAB>
      </div>
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

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const pagedEntries = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const canPagePrev = page > 0
  const canPageNext = page < totalPages - 1

  return (
    <div style={{ padding: '8px 0 32px', maxWidth: 800, margin: '0 auto' }}>
      <MonthSwitcher
        title={formatYearMonthTitle(period.labelMonth)}
        subtitle={formatCycleDateRange(period.startDate, period.endDate)}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      <div style={{
        margin: '12px 16px 0',
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
          <>
            <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Receipt size={16} color={t.textTer} strokeWidth={1.75} />
              <p style={{ fontSize: 14, color: t.textTer, margin: 0 }}>
                No expenses in this cycle.
              </p>
            </div>
            {loadError && <CycleExpensesLoadError onRetry={retry} />}
          </>
        ) : (
          <>
            <div className="hide-desktop">
              {pagedEntries.map((expense, i) => {
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
              })}
            </div>

            <div className="hide-mobile" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                <thead>
                  <tr>
                    <th scope="col" style={thStyle}>Merchant</th>
                    <th scope="col" style={thStyle}>Category</th>
                    <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                    <th scope="col" style={thStyle}>Date</th>
                    <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedEntries.map((expense, i) => {
                    const isManual = expense.sourceType === 'manual'
                    const title = expenseTitle(expense)
                    const cellStyle = i === 0 ? { ...tdStyle, borderTop: 'none' } : tdStyle
                    return (
                      <tr key={expense.id}>
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
                        <td style={{ ...cellStyle, color: t.textSec, whiteSpace: 'nowrap' }}>
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
                                color: t.textSec,
                              }}
                            >
                              <Pencil size={16} strokeWidth={1.75} />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {loadError && <CycleExpensesLoadError onRetry={retry} />}
          </>
        )}
      </div>

      {totalPages > 1 && !loadingEntries && entries.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: '16px 16px 0',
        }}>
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => setPage(p => p - 1)}
            disabled={!canPagePrev}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${t.border}`,
              background: canPagePrev ? t.surface : 'transparent',
              borderRadius: r.md,
              cursor: canPagePrev ? 'pointer' : 'default',
              color: canPagePrev ? t.text : t.textTer,
              opacity: canPagePrev ? 1 : 0.4,
            }}
          >
            <ChevronLeft size={18} strokeWidth={1.75} />
          </button>
          <span style={{
            fontSize: 13,
            color: t.textSec,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            aria-label="Next page"
            onClick={() => setPage(p => p + 1)}
            disabled={!canPageNext}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${t.border}`,
              background: canPageNext ? t.surface : 'transparent',
              borderRadius: r.md,
              cursor: canPageNext ? 'pointer' : 'default',
              color: canPageNext ? t.text : t.textTer,
              opacity: canPageNext ? 1 : 0.4,
            }}
          >
            <ChevronRight size={18} strokeWidth={1.75} />
          </button>
        </div>
      )}

      <FAB onClick={handleAdd} aria-label="Add expense">
        <Plus size={24} color={t.onPrimary} />
      </FAB>
    </div>
  )
}
