import { useMemo, useState } from 'react'
import { BottomSheet, FormField, Input, PrimaryButton, t } from '../ui'
import { formatYearMonthTitle } from '../api/adapters'
import type { BudgetPeriod } from '../types'

interface Props {
  period: BudgetPeriod | null
  mode?: 'current' | 'next' | 'create' | 'copy'
  onClose: () => void
  onSave: (draft: { startDate: string; endDate: string; periodId: string | null; copy: boolean }) => void
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function calendarMonthWindow(from: Date = new Date()): { start: string; end: string } {
  const y = from.getFullYear()
  const m = from.getMonth()
  const start = `${y}-${String(m + 1).padStart(2, '0')}-01`
  const last = new Date(y, m + 1, 0).getDate()
  const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { start, end }
}

function defaultWindow(
  mode: 'current' | 'next' | 'create' | 'copy',
  period: BudgetPeriod | null,
): { start: string; end: string } {
  if (mode === 'next' && period) {
    const start = addDaysIso(period.endDate, 1)
    const endDate = new Date(`${start}T12:00:00`)
    return calendarMonthWindow(endDate)
  }
  if ((mode === 'current' || mode === undefined) && period) {
    return { start: period.startDate, end: period.endDate }
  }
  if (mode === 'copy' && period) {
    const start = addDaysIso(period.endDate, 1)
    return calendarMonthWindow(new Date(`${start}T12:00:00`))
  }
  return calendarMonthWindow()
}

export default function CycleDatesSheet({ period, mode = 'create', onClose, onSave }: Props) {
  const defaults = useMemo(() => defaultWindow(mode, period), [mode, period])
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const validRange = endDate >= startDate
  const label = formatYearMonthTitle(endDate.slice(0, 7))

  const title =
    mode === 'next' || mode === 'copy'
      ? 'Plan next cycle'
      : mode === 'current' && period
        ? 'Edit cycle dates'
        : 'Start budget cycle'

  return (
    <BottomSheet title={title} onClose={onClose}>
      <p style={{ fontSize: 13, color: t.textSec, margin: '0 0 16px', lineHeight: 1.45 }}>
        Budgets follow your pay cycle. New cycles default to the calendar month.
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
