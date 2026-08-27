import { useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, Plus, Receipt } from 'lucide-react'
import type { Budget, Expense, HouseholdSpend, BudgetPeriod, AppHandlers } from '../types'
import { t, r, EmptyState, SectionLabel, Skeleton, FAB, ExpenseCategoryIcon, BUDGET_GROUP_COLORS } from '../ui'
import { SpendBarChart } from '../components/SpendBarChart'
import { BudgetBar, budgetStateColor } from '../components/BudgetBar'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { useMonthExpenses } from '../hooks/useMonthExpenses'
import {
  expenseTitle,
  formatMoney,
  formatMonthShort,
  formatSessionDate,
  formatYearMonthTitle,
  formatCycleDateRange,
  monthsOverlapCycle,
  shiftYearMonth,
} from '../api/adapters'
import { budgetActivityPath } from '../routing'

const ACTIVITY_PREVIEW_LIMIT = 5

interface Props {
  spend: HouseholdSpend | null
  budgetPeriod: BudgetPeriod | null
  loadMonthExpenses: (month: string) => Promise<Expense[]>
  openSheet: AppHandlers['openSheet']
}

const hasAnySpend = (spend: HouseholdSpend) =>
  spend.months.some(row => row.entryCount > 0) || spend.yearToDateTotal > 0

const emptyMonth = (month: string) => ({
  month,
  total: 0,
  entryCount: 0,
  average: 0,
  categories: [] as HouseholdSpend['months'][number]['categories'],
})

export default function ExpensesScreen({ spend, budgetPeriod, loadMonthExpenses, openSheet }: Props) {
  const navigate = useNavigate()
  const { selectedMonth, setSelectedMonth, entries, loadingEntries } = useMonthExpenses(
    spend,
    loadMonthExpenses,
  )

  const handleAdd = () => {
    openSheet({ type: 'chooseExpenseEntry' })
  }

  const cycleSummary = spend?.budget ?? null
  const showCategoryBudgets = Boolean(
    budgetPeriod
    && monthsOverlapCycle(selectedMonth, budgetPeriod.startDate, budgetPeriod.endDate),
  )

  if (!spend || !hasAnySpend(spend)) {
    return (
      <div>
        <EmptyState
          icon={BarChart3}
          title="No spending yet"
          body="Add an expense or complete a shopping trip to see a monthly breakdown."
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
  const selected = spend.months.find(row => row.month === selectedMonth)
    ?? emptyMonth(selectedMonth)
  const selectedIndex = spend.months.findIndex(row => row.month === selectedMonth)
  const previous = selectedIndex > 0 ? spend.months[selectedIndex - 1] : undefined
  const monthTitle = formatYearMonthTitle(selected.month)
  const canGoPrev = Boolean(firstMonth && selected.month > firstMonth)
  const canGoNext = Boolean(lastMonth && selected.month < lastMonth)

  const comparison = previous
    ? (() => {
        const delta = selected.total - previous.total
        const prevName = formatMonthShort(previous.month)
        if (Math.abs(delta) < 0.005) return { text: `Same as ${prevName}`, color: t.textSec }
        if (delta > 0) return { text: `${formatMoney(delta, spend.currency)} more than ${prevName}`, color: t.error }
        return { text: `${formatMoney(Math.abs(delta), spend.currency)} less than ${prevName}`, color: t.success }
      })()
    : null

  const handlePrev = () => {
    if (!canGoPrev) return
    setSelectedMonth(shiftYearMonth(selected.month, -1))
  }

  const handleNext = () => {
    if (!canGoNext) return
    setSelectedMonth(shiftYearMonth(selected.month, 1))
  }

  const handleOpenExpense = (expense: Expense) => {
    if (expense.sourceType === 'shopping_session') return
    openSheet({ type: 'editExpense', expense })
  }

  const previewEntries = entries.slice(0, ACTIVITY_PREVIEW_LIMIT)
  const showViewMore = entries.length > ACTIVITY_PREVIEW_LIMIT

  const handleViewMore = () => {
    navigate(budgetActivityPath(selected.month))
  }

  return (
    <div style={{ padding: '8px 0 32px' }}>
      <MonthSwitcher
        monthTitle={monthTitle}
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
          {formatMoney(selected.total, spend.currency)}
        </p>
        {comparison && (
          <p style={{ fontSize: 13, color: comparison.color, marginTop: 8 }}>
            {comparison.text}
          </p>
        )}
      </div>

      {(cycleSummary || budgetPeriod) && (
        <div style={{
          margin: '0 16px 20px',
          background: t.surface,
          borderRadius: r.lg,
          border: `1px solid ${t.border}`,
          padding: '14px 16px',
        }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: t.textSec, margin: 0, letterSpacing: '0.02em' }}>
              This cycle · {formatYearMonthTitle(cycleSummary?.labelMonth ?? budgetPeriod!.labelMonth)}
            </p>
            <p style={{ fontSize: 12, color: t.textTer, margin: '4px 0 0' }}>
              {formatCycleDateRange(
                cycleSummary?.startDate ?? budgetPeriod!.startDate,
                cycleSummary?.endDate ?? budgetPeriod!.endDate,
              )}
            </p>
          </div>
          {cycleSummary ? (
            <>
              <p style={{
                fontSize: 14,
                color: budgetStateColor(cycleSummary.state),
                margin: '12px 0 0',
              }}>
                {formatMoney(cycleSummary.used, spend.currency)} of{' '}
                {formatMoney(cycleSummary.amount, spend.currency)}
                {' · '}
                {cycleSummary.remaining >= 0
                  ? `${formatMoney(cycleSummary.remaining, spend.currency)} left`
                  : `${formatMoney(Math.abs(cycleSummary.remaining), spend.currency)} over`}
              </p>
              <BudgetBar
                percentUsed={cycleSummary.percentUsed}
                state={cycleSummary.state}
                ariaLabel={`Cycle budget ${Math.round(cycleSummary.percentUsed)} percent used`}
              />
            </>
          ) : (
            <p style={{ fontSize: 13, color: t.textSec, margin: '12px 0 0' }}>
              No household limit set for this cycle. Category limits still apply.
            </p>
          )}
          <p style={{ fontSize: 11, color: t.textTer, margin: '10px 0 0', lineHeight: 1.4 }}>
            Budgets follow your pay cycle, not the calendar month.
          </p>
        </div>
      )}

      <div style={{
        margin: '0 16px 20px',
        background: t.surface,
        borderRadius: r.lg,
        border: `1px solid ${t.border}`,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
      }}>
        <StatCell label="Entries" value={String(selected.entryCount)} />
        <StatCell label="Avg" value={formatMoney(selected.average, spend.currency)} />
        <StatCell label="Year to date" value={formatMoney(spend.yearToDateTotal, spend.currency)} last />
      </div>

      <div style={{
        margin: '0 16px 8px',
        background: t.surface,
        borderRadius: r.lg,
        border: `1px solid ${t.border}`,
        padding: '16px 8px 12px',
      }}>
        <SpendBarChart
          months={spend.months}
          selectedMonth={selected.month}
          currency={spend.currency}
          onSelect={setSelectedMonth}
        />
      </div>

      {selected.categories.length > 0 && (
        <>
          <SectionLabel>Categories</SectionLabel>
          <div style={{
            margin: '0 16px 8px',
            background: t.surface,
            borderRadius: r.lg,
            border: `1px solid ${t.border}`,
            overflow: 'hidden',
          }}>
            {selected.categories.map((row, i) => (
              <CategoryRow
                key={row.category}
                category={row.category}
                amount={row.total}
                currency={spend.currency}
                share={selected.total > 0 ? row.total / selected.total : 0}
                budget={showCategoryBudgets && row.subcategoryId
                  ? budgetPeriod?.groups
                      .flatMap(g => g.lines)
                      .find(b => b.subcategoryId === row.subcategoryId) ?? null
                  : null}
                color={BUDGET_GROUP_COLORS[row.group ?? ''] ?? t.primary}
                divider={i > 0}
              />
            ))}
          </div>
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
              No expenses in {formatMonthShort(selected.month)}.
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

function CategoryRow({ category, amount, currency, share, budget, color, divider }: {
  category: string
  amount: number
  currency: string
  share: number
  budget?: Budget | null
  color: string
  divider: boolean
}) {
  const hasBudget = Boolean(budget)
  const fillPercent = hasBudget && budget
    ? Math.min((amount / budget.amount) * 100, 100)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ color, display: 'flex' }}>
            <ExpenseCategoryIcon category={category} size={16} />
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
