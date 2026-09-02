import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Wallet } from 'lucide-react'
import type { AppHandlers, PersonalAccountSummary, PersonalExpense } from '../types'
import { t, r, EmptyState, Skeleton, FAB, ExpenseCategoryIcon, EXPENSE_CATEGORY_COLORS } from '../ui'
import { CycleExpensesLoadError } from '../components/ErrorBoundary'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { MoneyChrome } from '../components/MoneyChrome'
import { usePersonalMonthExpenses } from '../hooks/usePersonalMonthExpenses'
import {
  formatMoney,
  formatSessionDate,
  formatYearMonthCompact,
  personalExpenseTitle,
  shiftYearMonth,
} from '../api/adapters'
import { parsePeriodId, parseYearMonth, personalActivityPath } from '../routing'

const PAGE_SIZE = 10
const MONTH_WINDOW = 36

interface Props {
  summary: PersonalAccountSummary | null
  selectedAccountId: string | null
  selectedMonth: string
  todayMonth: string
  loadMonthExpenses: (accountId: string, month: string, signal?: AbortSignal) => Promise<PersonalExpense[]>
  onSelectAccount: (accountId: string) => void
  onSelectMonth: (month: string) => void
  onSelectFamily: () => void
  openSheet: AppHandlers['openSheet']
}

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

export default function PersonalActivityScreen({
  summary,
  selectedAccountId,
  selectedMonth,
  todayMonth,
  loadMonthExpenses,
  onSelectAccount,
  onSelectMonth,
  onSelectFamily,
  openSheet,
}: Props) {
  const location = useLocation()
  const routerNavigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const queryAccount = parsePeriodId(params.get('account'))
  const queryMonth = parseYearMonth(params.get('month'))
  const accounts = summary?.accounts ?? []
  const selected = accounts.find(row => row.id === selectedAccountId) ?? null
  const { entries, loadingEntries, loadError, retry } = usePersonalMonthExpenses(
    selected?.id ?? null,
    selected ? selectedMonth : null,
    loadMonthExpenses,
  )
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (queryAccount && accounts.some(row => row.id === queryAccount)) {
      onSelectAccount(queryAccount)
    }
    if (queryMonth) onSelectMonth(queryMonth)
  }, [queryAccount, queryMonth, accounts, onSelectAccount, onSelectMonth])

  useEffect(() => {
    if (!selected) return
    const next = personalActivityPath(selected.id, selectedMonth)
    if (`${location.pathname}${location.search}` === next) return
    routerNavigate(next, { replace: true })
  }, [selected, selectedMonth, location.pathname, location.search, routerNavigate])

  useEffect(() => {
    setPage(0)
  }, [selected?.id, selectedMonth])

  const minMonth = shiftYearMonth(todayMonth, -MONTH_WINDOW)
  const canGoPrev = selectedMonth > minMonth
  const canGoNext = selectedMonth < todayMonth
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const pagedEntries = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handlePrev = () => {
    if (!canGoPrev) return
    onSelectMonth(shiftYearMonth(selectedMonth, -1))
  }

  const handleNext = () => {
    if (!canGoNext) return
    onSelectMonth(shiftYearMonth(selectedMonth, 1))
  }

  const handleAdd = () => {
    openSheet({ type: 'addPersonalExpense' })
  }

  const handleOpen = (expense: PersonalExpense) => {
    openSheet({ type: 'editPersonalExpense', expense })
  }

  if (accounts.length === 0 || !selected) {
    return (
      <MoneyChrome
        scope="personal"
        familyView="activity"
        onSelectFamily={onSelectFamily}
        onSelectPersonal={() => undefined}
      >
        <EmptyState
          icon={Wallet}
          title="No personal accounts yet"
          body="Create an account to track spending that isn’t household."
        />
      </MoneyChrome>
    )
  }

  return (
    <MoneyChrome
      scope="personal"
      familyView="activity"
      onSelectFamily={onSelectFamily}
      onSelectPersonal={() => undefined}
      switcher={
        <MonthSwitcher
          title={formatYearMonthCompact(selectedMonth)}
          subtitle={selected.name}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          onPrev={handlePrev}
          onNext={handleNext}
          prevAriaLabel="Previous month"
          nextAriaLabel="Next month"
        />
      }
    >
      <div style={{ padding: '8px 16px 32px' }}>
        {loadingEntries ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton h={16} />
            <Skeleton h={16} w="70%" />
          </div>
        ) : entries.length === 0 ? (
          <>
            <div style={{ padding: '20px 16px' }}>
              <p style={{ fontSize: 14, color: t.textTer, margin: 0 }}>
                No expenses this month.
              </p>
            </div>
            {loadError && <CycleExpensesLoadError onRetry={retry} />}
          </>
        ) : (
          <>
            <div className="hide-desktop">
              {pagedEntries.map((expense, i) => {
                const title = personalExpenseTitle(expense)
                return (
                  <button
                    key={expense.id}
                    type="button"
                    onClick={() => handleOpen(expense)}
                    aria-label={`Edit ${title}`}
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
                      cursor: 'pointer',
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
                          {formatSessionDate(expense.occurredAt)} · {expense.category}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: t.text,
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                    }}>
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
                  </tr>
                </thead>
                <tbody>
                  {pagedEntries.map((expense, i) => {
                    const title = personalExpenseTitle(expense)
                    const cellStyle = i === 0 ? { ...tdStyle, borderTop: 'none' } : tdStyle
                    return (
                      <tr key={expense.id}>
                        <td style={{ ...cellStyle, fontWeight: 500 }}>
                          <button
                            type="button"
                            onClick={() => handleOpen(expense)}
                            aria-label={`Edit ${title}`}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              color: t.text,
                              font: 'inherit',
                              fontWeight: 500,
                            }}
                          >
                            {title}
                          </button>
                        </td>
                        <td style={cellStyle}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <ExpenseCategoryIcon category={expense.category} size={14} />
                            {expense.category}
                          </span>
                        </td>
                        <td style={{ ...cellStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {formatMoney(expense.amount, expense.currency)}
                        </td>
                        <td style={cellStyle}>{formatSessionDate(expense.occurredAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {entries.length > PAGE_SIZE && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: '16px',
        }}>
          <button
            type="button"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Previous page"
            style={{
              border: 'none',
              background: 'none',
              color: page === 0 ? t.textTer : t.primary,
              cursor: page === 0 ? 'default' : 'pointer',
              fontSize: 14,
              fontFamily: 'var(--ds-font)',
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: 13, color: t.textSec }}>
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            aria-label="Next page"
            style={{
              border: 'none',
              background: 'none',
              color: page >= totalPages - 1 ? t.textTer : t.primary,
              cursor: page >= totalPages - 1 ? 'default' : 'pointer',
              fontSize: 14,
              fontFamily: 'var(--ds-font)',
            }}
          >
            Next
          </button>
        </div>
      )}

      <FAB onClick={handleAdd} aria-label="Add expense">
        <Plus size={24} color={t.onPrimary} />
      </FAB>
    </MoneyChrome>
  )
}
