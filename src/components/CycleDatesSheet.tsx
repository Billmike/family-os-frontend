import { useMemo, useState } from 'react'
import { BottomSheet, FormField, Input, PrimaryButton, t } from '../ui'
import {
  formatCycleDateRange,
  formatYearMonthTitle,
  nextCycleWindow,
} from '../api/adapters'
import type { BudgetPeriod } from '../types'

interface Props {
  period: BudgetPeriod | null
  periods?: BudgetPeriod[]
  mode?: 'current' | 'next' | 'create' | 'copy'
  onClose: () => void
  onSave: (draft: { startDate: string; endDate: string; periodId: string | null; copy: boolean }) => void
}

function calendarMonthWindow(from: Date = new Date()): { start: string; end: string } {
  const y = from.getFullYear()
  const m = from.getMonth()
  const start = `${y}-${String(m + 1).padStart(2, '0')}-01`
  const last = new Date(y, m + 1, 0).getDate()
  const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { start, end }
}

function latestPeriod(periods: BudgetPeriod[]): BudgetPeriod | null {
  if (periods.length === 0) return null
  return periods.reduce((best, p) => (p.endDate >= best.endDate ? p : best))
}

function defaultWindow(
  mode: 'current' | 'next' | 'create' | 'copy',
  period: BudgetPeriod | null,
  periods: BudgetPeriod[],
): { start: string; end: string } {
  if ((mode === 'current' || mode === undefined) && period) {
    return { start: period.startDate, end: period.endDate }
  }
  const anchor = period ?? latestPeriod(periods)
  if ((mode === 'copy' || mode === 'next' || mode === 'create') && anchor) {
    return nextCycleWindow(anchor)
  }
  return calendarMonthWindow()
}

export default function CycleDatesSheet({
  period,
  periods = [],
  mode = 'create',
  onClose,
  onSave,
}: Props) {
  const defaults = useMemo(
    () => defaultWindow(mode, period, periods),
    [mode, period, periods],
  )
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const validRange = endDate >= startDate
  const label = formatYearMonthTitle(endDate.slice(0, 7))
  const existing = periods
    .slice()
    .sort((a, b) => b.startDate.localeCompare(a.startDate) || b.endDate.localeCompare(a.endDate))

  const title =
    mode === 'next' || mode === 'copy'
      ? 'Plan next cycle'
      : mode === 'current' && period
        ? 'Edit cycle dates'
        : 'Start budget cycle'

  return (
    <BottomSheet title={title} onClose={onClose}>
      <p style={{ fontSize: 13, color: t.textSec, margin: '0 0 16px', lineHeight: 1.45 }}>
        {mode === 'current'
          ? 'Budgets follow your pay cycle.'
          : period || periods.length > 0
            ? 'New cycles start the day after the selected cycle and keep the same length.'
            : 'Budgets follow your pay cycle. New cycles default to the calendar month.'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
        <FormField label="Starts">
          <Input type="date" value={startDate} onChange={setStartDate} aria-label="Cycle start date" />
        </FormField>
        <FormField label="Ends">
          <Input type="date" value={endDate} onChange={setEndDate} aria-label="Cycle end date" />
        </FormField>
      </div>
      <p style={{ fontSize: 13, color: t.textSec, margin: '0 0 16px' }}>
        Destination label: <span style={{ color: t.text, fontWeight: 600 }}>{label}</span>
      </p>
      {existing.length > 0 && (
        <div style={{ margin: '0 0 16px' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: t.textSec, margin: '0 0 8px' }}>
            Existing cycles
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {existing.map(row => (
              <li
                key={row.id}
                style={{ fontSize: 13, color: t.text, padding: '4px 0' }}
              >
                {formatCycleDateRange(row.startDate, row.endDate)}
                {period?.id === row.id ? ' · this cycle' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!validRange && (
        <p style={{ fontSize: 12, color: t.error, margin: '0 0 12px' }}>
          End date must be on or after the start date.
        </p>
      )}
      <PrimaryButton
        onClick={() =>
          onSave({
            startDate,
            endDate,
            periodId: mode === 'current' ? period?.id ?? null : null,
            copy: mode === 'copy' || mode === 'next',
          })
        }
        disabled={!validRange}
      >
        Save
      </PrimaryButton>
    </BottomSheet>
  )
}
