import { useMemo, useState } from 'react'
import type { BudgetPeriod, BudgetPeriodDraft, BudgetRowDraft } from '../types'
import { EXPENSE_CATEGORIES } from '../types'
import { BottomSheet, FormField, Input, PrimaryButton, ExpenseCategoryIcon, t } from '../ui'
import { formatYearMonthTitle } from '../api/adapters'

type RowKey = 'household' | (typeof EXPENSE_CATEGORIES)[number]

interface RowDef {
  key: RowKey
  label: string
  category: string | null
  budgetId: string | null
  initialAmount: string
}

interface Props {
  period: BudgetPeriod | null
  mode?: 'current' | 'next'
  onClose: () => void
  onSave: (draft: BudgetPeriodDraft) => void
}

function formatInitialAmount(amount: number | undefined): string {
  if (amount == null || amount <= 0) return ''
  return String(amount)
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function defaultWindow(mode: 'current' | 'next', period: BudgetPeriod | null): { start: string; end: string } {
  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  if (mode === 'next' && period) {
    const start = addDaysIso(period.endDate, 1)
    const end = addDaysIso(start, 29)
    return { start, end }
  }
  if (period) {
    return { start: period.startDate, end: period.endDate }
  }
  const start = todayIso
  const end = addDaysIso(start, 29)
  return { start, end }
}

function buildRows(period: BudgetPeriod | null): RowDef[] {
  const overall = period?.overall ?? null
  const byCategory = new Map((period?.categories ?? []).map(b => [b.category, b]))

  const household: RowDef = {
    key: 'household',
    label: 'Household',
    category: null,
    budgetId: overall?.id ?? null,
    initialAmount: formatInitialAmount(overall?.amount),
  }

  const categories = EXPENSE_CATEGORIES.map((category): RowDef => {
    const budget = byCategory.get(category)
    return {
      key: category,
      label: category,
      category,
      budgetId: budget?.id ?? null,
      initialAmount: formatInitialAmount(budget?.amount),
    }
  })

  return [household, ...categories]
}

function parseAmount(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parsed = Number.parseFloat(trimmed.replace(',', '.'))
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function labelFromEnd(endDate: string): string {
  return endDate.slice(0, 7)
}

export default function BudgetSheet({ period, mode = 'current', onClose, onSave }: Props) {
  const defaults = useMemo(() => defaultWindow(mode, period), [mode, period])
  const sourcePeriod = mode === 'next' ? null : period
  const rowDefs = useMemo(() => buildRows(sourcePeriod), [sourcePeriod])

  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [amounts, setAmounts] = useState<Record<RowKey, string>>(() =>
    Object.fromEntries(rowDefs.map(row => [row.key, row.initialAmount])) as Record<RowKey, string>,
  )

  const destinationLabel = formatYearMonthTitle(labelFromEnd(endDate))
  const validRange = endDate >= startDate

  const handleAmountChange = (key: RowKey, value: string) => {
    setAmounts(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    if (!validRange) return
    const rows: BudgetRowDraft[] = rowDefs.map(row => ({
      category: row.category,
      amount: amounts[row.key] ?? '',
      budgetId: mode === 'next' ? null : row.budgetId,
    }))
    onSave({
      periodId: mode === 'next' ? null : period?.id ?? null,
      startDate,
      endDate,
      rows,
    })
  }

  const title = mode === 'next' ? 'Plan next cycle' : period ? 'Edit budget cycle' : 'Set budget cycle'

  return (
    <BottomSheet title={title} onClose={onClose}>
      <p style={{ fontSize: 13, color: t.textSec, margin: '0 0 16px', lineHeight: 1.45 }}>
        Budgets follow your pay cycle, not the calendar month.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
        <FormField label="Starts">
          <Input
            type="date"
            value={startDate}
            onChange={setStartDate}
            aria-label="Cycle start date"
          />
        </FormField>
        <FormField label="Ends">
          <Input
            type="date"
            value={endDate}
            onChange={setEndDate}
            aria-label="Cycle end date"
          />
        </FormField>
      </div>

      <p style={{ fontSize: 13, color: t.textSec, margin: '0 0 16px' }}>
        Destination label: <span style={{ color: t.text, fontWeight: 600 }}>{destinationLabel}</span>
      </p>

      {!validRange && (
        <p style={{ fontSize: 12, color: t.error, margin: '0 0 12px' }}>
          End date must be on or after the start date.
        </p>
      )}

      {rowDefs.map((row, index) => (
        <div
          key={row.key}
          style={{
            marginBottom: index === rowDefs.length - 1 ? 16 : 12,
            paddingTop: index === 1 ? 8 : 0,
            borderTop: index === 1 ? `1px solid ${t.border}` : 'none',
          }}
        >
          <FormField label={row.label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {row.category && (
                <span style={{ color: t.textSec, display: 'flex', flexShrink: 0 }}>
                  <ExpenseCategoryIcon category={row.category} size={18} />
                </span>
              )}
              <Input
                inputMode="decimal"
                placeholder="No limit"
                value={amounts[row.key] ?? ''}
                onChange={value => handleAmountChange(row.key, value)}
                aria-label={`${row.label} budget amount`}
              />
            </div>
          </FormField>
        </div>
      ))}
      <PrimaryButton onClick={handleSave} disabled={!validRange}>
        Save
      </PrimaryButton>
    </BottomSheet>
  )
}

export function hasBudgetAmount(raw: string): boolean {
  return parseAmount(raw) != null
}

export function parseBudgetAmount(raw: string): number | null {
  return parseAmount(raw)
}
