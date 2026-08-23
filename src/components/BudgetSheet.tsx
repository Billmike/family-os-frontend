import { useMemo, useState } from 'react'
import type { BudgetList, BudgetRowDraft } from '../types'
import { EXPENSE_CATEGORIES } from '../types'
import { BottomSheet, FormField, Input, PrimaryButton, ExpenseCategoryIcon, t } from '../ui'

type RowKey = 'household' | typeof EXPENSE_CATEGORIES[number]

interface RowDef {
  key: RowKey
  label: string
  category: string | null
  budgetId: string | null
  initialAmount: string
}

interface Props {
  budgets: BudgetList | null
  onClose: () => void
  onSave: (rows: BudgetRowDraft[]) => void
}

function formatInitialAmount(amount: number | undefined): string {
  if (amount == null || amount <= 0) return ''
  return String(amount)
}

function buildRows(budgets: BudgetList | null): RowDef[] {
  const overall = budgets?.overall ?? null
  const byCategory = new Map(
    (budgets?.categories ?? []).map(b => [b.category, b]),
  )

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

function amountsEqual(a: string, b: string): boolean {
  const pa = parseAmount(a)
  const pb = parseAmount(b)
  if (pa == null && pb == null) return true
  if (pa == null || pb == null) return false
  return Math.abs(pa - pb) < 0.005
}

export default function BudgetSheet({ budgets, onClose, onSave }: Props) {
  const rowDefs = useMemo(() => buildRows(budgets), [budgets])
  const [amounts, setAmounts] = useState<Record<RowKey, string>>(() =>
    Object.fromEntries(rowDefs.map(row => [row.key, row.initialAmount])) as Record<RowKey, string>,
  )

  const handleAmountChange = (key: RowKey, value: string) => {
    setAmounts(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    const changed: BudgetRowDraft[] = []
    for (const row of rowDefs) {
      const current = amounts[row.key] ?? ''
      if (amountsEqual(current, row.initialAmount)) continue
      changed.push({
        category: row.category,
        amount: current,
        budgetId: row.budgetId,
      })
    }
    if (changed.length === 0) {
      onClose()
      return
    }
    onSave(changed)
  }

  return (
    <BottomSheet title="Monthly budgets" onClose={onClose}>
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
      <PrimaryButton onClick={handleSave}>Save</PrimaryButton>
    </BottomSheet>
  )
}
