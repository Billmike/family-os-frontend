import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, ChevronLeft, ChevronRight, Pencil, Plus, Receipt } from 'lucide-react'
import type { Expense, HouseholdSpend, AppHandlers } from '../types'
import { t, r, EmptyState, Skeleton, FAB, ExpenseCategoryIcon, EXPENSE_CATEGORY_COLORS } from '../ui'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { useMonthExpenses } from '../hooks/useMonthExpenses'
import {
  expenseTitle,
  formatMoney,
  formatMonthShort,
  formatSessionDate,
  formatYearMonthTitle,
  shiftYearMonth,
} from '../api/adapters'
import { expenseActivityPath, parseYearMonth } from '../routing'

interface Props {
  spend: HouseholdSpend | null
  loadMonthExpenses: (month: string) => Promise<Expense[]>
  openSheet: AppHandlers['openSheet']
}

const PAGE_SIZE = 10

const hasAnySpend = (spend: HouseholdSpend) =>
  spend.months.some(row => row.entryCount > 0) || spend.yearToDateTotal > 0

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

export default function ExpenseActivityScreen({ spend, loadMonthExpenses, openSheet }: Props) {
  const location = useLocation()
  const routerNavigate = useNavigate()
  const queryMonth = parseYearMonth(new URLSearchParams(location.search).get('month'))
  const { selectedMonth, setSelectedMonth, entries, loadingEntries } = useMonthExpenses(
    spend,
    loadMonthExpenses,
    queryMonth,
  )
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [selectedMonth])

  useEffect(() => {
    if (!selectedMonth) return
    if (queryMonth === selectedMonth) return
    routerNavigate(expenseActivityPath(selectedMonth), { replace: true })
  }, [selectedMonth, queryMonth, routerNavigate])

  const handleAdd = () => {
    openSheet({ type: 'addExpense' })
  }

  const handleOpenExpense = (expense: Expense) => {
    if (expense.sourceType !== 'manual') return
    openSheet({ type: 'editExpense', expense })
  }

  if (!spend || !hasAnySpend(spend)) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <EmptyState
          icon={BarChart3}
          title="No spending yet"
          body="Add an expense or complete a shopping trip to see activity."
          action="Add expense"
          onAction={handleAdd}
        />
        <FAB onClick={handleAdd} aria-label="Add expense">
          <Plus size={24} color={t.onPrimary} />
        </FAB>
      </div>
    )
  }

  const firstMonth = spend.months[0]?.month
  const lastMonth = spend.months[spend.months.length - 1]?.month ?? spend.currentMonth
  const month = selectedMonth || spend.currentMonth
  const canGoPrev = Boolean(firstMonth && month > firstMonth)
  const canGoNext = Boolean(lastMonth && month < lastMonth)

  const handlePrev = () => {
    if (!canGoPrev) return
    setSelectedMonth(shiftYearMonth(month, -1))
  }

  const handleNext = () => {
    if (!canGoNext) return
    setSelectedMonth(shiftYearMonth(month, 1))
  }

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const pagedEntries = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const canPagePrev = page > 0
  const canPageNext = page < totalPages - 1

  return (
    <div style={{ padding: '8px 0 32px', maxWidth: 800, margin: '0 auto' }}>
      <MonthSwitcher
        monthTitle={formatYearMonthTitle(month)}
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
          <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Receipt size={16} color={t.textTer} strokeWidth={1.75} />
            <p style={{ fontSize: 14, color: t.textTer, margin: 0 }}>
              No expenses in {formatMonthShort(month)}.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: card list (same layout as Expenses overview) */}
            <div className="hide-desktop">
              {pagedEntries.map((expense, i) => {
                const isManual = expense.sourceType === 'manual'
                const title = expenseTitle(expense)
                const itemCount = expense.sourceItemCount
                const subtitle = expense.sourceType === 'shopping_session' && itemCount != null
                  ? `${expense.category} · ${itemCount} item${itemCount !== 1 ? 's' : ''}`
                  : expense.category
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
                        color: EXPENSE_CATEGORY_COLORS[expense.category] ?? t.textSec,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <ExpenseCategoryIcon category={expense.category} size={16} />
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

            {/* Desktop: table */}
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
                            <ExpenseCategoryIcon category={expense.category} size={14} />
                            {expense.category}
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
