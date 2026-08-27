import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import type { BudgetPeriod } from '../types'
import {
  cycleStatus,
  formatCycleDateRange,
  formatMoney,
  formatYearMonthTitle,
} from '../api/adapters'
import { BottomSheet, t, r } from '../ui'

interface Props {
  periods: BudgetPeriod[]
  selectedPeriodId: string | null
  today: string
  highlightRange?: { start: string; end: string }
  onClose: () => void
  onSelect: (periodId: string) => void
  onEditDates: (periodId: string) => void
  onDelete: (periodId: string) => Promise<void>
}

const STATUS_LABEL: Record<'current' | 'ended' | 'upcoming', string> = {
  current: 'Current',
  ended: 'Ended',
  upcoming: 'Upcoming',
}

export default function CycleListSheet({
  periods,
  selectedPeriodId,
  today,
  highlightRange,
  onClose,
  onSelect,
  onEditDates,
  onDelete,
}: Props) {
  const [menuPeriod, setMenuPeriod] = useState<BudgetPeriod | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<BudgetPeriod | null>(null)
  const [deleting, setDeleting] = useState(false)

  const current = periods.filter(p => cycleStatus(p, today) === 'current')
  const upcoming = periods.filter(p => cycleStatus(p, today) === 'upcoming')
  const past = periods.filter(p => cycleStatus(p, today) === 'ended').slice().reverse()

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await onDelete(confirmDelete.id)
      setConfirmDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  if (confirmDelete) {
    return (
      <BottomSheet title="Delete cycle" onClose={() => setConfirmDelete(null)}>
        <p style={{ fontSize: 14, color: t.textSec, margin: '0 0 16px', lineHeight: 1.45 }}>
          Delete the cycle for{' '}
          <strong style={{ color: t.text }}>
            {formatCycleDateRange(confirmDelete.startDate, confirmDelete.endDate)}
          </strong>
          ? Planned amounts for this cycle will be removed. Recorded spending stays in the ledger.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting}
            aria-label="Confirm delete cycle"
            style={{
              ...dangerBtn,
              opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? 'Deleting…' : 'Delete cycle'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(null)}
            style={ghostFullBtn}
          >
            Cancel
          </button>
        </div>
      </BottomSheet>
    )
  }

  if (menuPeriod) {
    return (
      <BottomSheet
        title={formatYearMonthTitle(menuPeriod.labelMonth)}
        onClose={() => setMenuPeriod(null)}
      >
        <p style={{ fontSize: 13, color: t.textSec, margin: '0 0 16px' }}>
          {formatCycleDateRange(menuPeriod.startDate, menuPeriod.endDate)}
        </p>
        <button
          type="button"
          onClick={() => onEditDates(menuPeriod.id)}
          style={rowBtn}
        >
          Edit dates
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirmDelete(menuPeriod)
            setMenuPeriod(null)
          }}
          aria-label={`Delete cycle ${formatCycleDateRange(menuPeriod.startDate, menuPeriod.endDate)}`}
          style={{ ...rowBtn, color: t.error }}
        >
          Delete
        </button>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet title="All cycles" onClose={onClose}>
      {periods.length === 0 ? (
        <p style={{ fontSize: 14, color: t.textSec, margin: 0 }}>No budget cycles yet.</p>
      ) : (
        <>
          <CycleSection
            label="Current"
            rows={current}
            selectedPeriodId={selectedPeriodId}
            today={today}
            highlightRange={highlightRange}
            onSelect={onSelect}
            onOpenMenu={setMenuPeriod}
          />
          <CycleSection
            label="Upcoming"
            rows={upcoming}
            selectedPeriodId={selectedPeriodId}
            today={today}
            highlightRange={highlightRange}
            onSelect={onSelect}
            onOpenMenu={setMenuPeriod}
          />
          <CycleSection
            label="Past"
            rows={past}
            selectedPeriodId={selectedPeriodId}
            today={today}
            highlightRange={highlightRange}
            onSelect={onSelect}
            onOpenMenu={setMenuPeriod}
          />
        </>
      )}
    </BottomSheet>
  )
}

function CycleSection({
  label,
  rows,
  selectedPeriodId,
  today,
  highlightRange,
  onSelect,
  onOpenMenu,
}: {
  label: string
  rows: BudgetPeriod[]
  selectedPeriodId: string | null
  today: string
  highlightRange?: { start: string; end: string }
  onSelect: (periodId: string) => void
  onOpenMenu: (period: BudgetPeriod) => void
}) {
  if (rows.length === 0) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: t.textTer,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          margin: '0 0 8px',
        }}
      >
        {label}
      </p>
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: r.lg,
          overflow: 'hidden',
        }}
      >
        {rows.map((period, i) => {
          const highlighted = Boolean(
            highlightRange
            && period.startDate === highlightRange.start
            && period.endDate === highlightRange.end,
          )
          const selected = period.id === selectedPeriodId
          const status = cycleStatus(period, today)
          return (
            <div
              key={period.id}
              style={{
                display: 'flex',
                alignItems: 'stretch',
                borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
                background: highlighted ? t.warningSub : selected ? t.primarySubtle : 'transparent',
              }}
            >
              <button
                type="button"
                onClick={() => onSelect(period.id)}
                aria-label={`Open cycle ${formatCycleDateRange(period.startDate, period.endDate)}`}
                aria-current={selected ? 'true' : undefined}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '12px 14px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--ds-font)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: t.text }}>
                    {formatYearMonthTitle(period.labelMonth)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: status === 'current' ? t.primary : t.textTer,
                      background: status === 'current' ? t.primarySubtle : t.surfaceMuted,
                      borderRadius: r.pill,
                      padding: '2px 8px',
                    }}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: t.textSec, marginTop: 4 }}>
                  {formatCycleDateRange(period.startDate, period.endDate)}
                  {' · '}
                  {formatMoney(period.summary.leftOverActual, period.currency)} left
                </div>
                {highlighted && (
                  <div style={{ fontSize: 12, color: t.warning, marginTop: 4, fontWeight: 600 }}>
                    Overlaps the dates you tried to save
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => onOpenMenu(period)}
                aria-label={`More actions for ${formatCycleDateRange(period.startDate, period.endDate)}`}
                style={{
                  width: 44,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <MoreHorizontal size={18} color={t.textTer} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const rowBtn: React.CSSProperties = {
  width: '100%',
  padding: '14px 0',
  border: 'none',
  borderTop: `1px solid ${t.border}`,
  background: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  fontSize: 15,
  fontWeight: 500,
  color: t.text,
  fontFamily: 'var(--ds-font)',
}

const dangerBtn: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: 'none',
  borderRadius: r.md,
  background: t.error,
  color: t.onPrimary,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--ds-font)',
}

const ghostFullBtn: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: `1px solid ${t.border}`,
  borderRadius: r.md,
  background: t.surface,
  color: t.text,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--ds-font)',
}
