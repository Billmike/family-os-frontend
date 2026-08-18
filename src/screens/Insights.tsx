import { useEffect, useState } from 'react'
import { BarChart3, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react'
import type { ShoppingSession, ShoppingSpend, AppHandlers } from '../types'
import { t, r, EmptyState, SectionLabel, Skeleton } from '../ui'
import { SpendBarChart } from '../components/SpendBarChart'
import {
  formatMoney,
  formatMonthShort,
  formatSessionCost,
  formatSessionDate,
  formatYearMonthTitle,
  shiftYearMonth,
} from '../api/adapters'

interface Props {
  spend: ShoppingSpend | null
  loadMonthSessions: (month: string) => Promise<ShoppingSession[]>
  navigate: AppHandlers['navigate']
}

const hasAnyTrips = (spend: ShoppingSpend) =>
  spend.months.some(row => row.tripCount > 0) || spend.yearToDateTotal > 0

export default function InsightsScreen({ spend, loadMonthSessions, navigate }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(spend?.currentMonth ?? '')
  const [trips, setTrips] = useState<ShoppingSession[]>([])
  const [loadingTrips, setLoadingTrips] = useState(false)

  useEffect(() => {
    if (!spend) return
    if (!selectedMonth || !spend.months.some(row => row.month === selectedMonth)) {
      setSelectedMonth(spend.currentMonth)
    }
  }, [spend, selectedMonth])

  useEffect(() => {
    if (!selectedMonth) return
    let cancelled = false
    setLoadingTrips(true)
    void loadMonthSessions(selectedMonth).then(rows => {
      if (cancelled) return
      setTrips(rows)
      setLoadingTrips(false)
    }).catch(() => {
      if (cancelled) return
      setTrips([])
      setLoadingTrips(false)
    })
    return () => { cancelled = true }
  }, [selectedMonth, loadMonthSessions])

  if (!spend || !hasAnyTrips(spend)) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <EmptyState
          icon={BarChart3}
          title="No spending yet"
          body="Complete a shopping trip with a total to see monthly grocery spend."
          action="Go to Shopping"
          onAction={() => navigate('shopping')}
        />
      </div>
    )
  }

  const firstMonth = spend.months[0]?.month
  const lastMonth = spend.months[spend.months.length - 1]?.month ?? spend.currentMonth
  const selected = spend.months.find(row => row.month === selectedMonth)
    ?? { month: selectedMonth, total: 0, tripCount: 0, average: 0 }
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

  return (
    <div style={{ padding: '8px 0 32px', maxWidth: 600, margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px 4px',
      }}>
        <button
          type="button"
          aria-label="Previous month"
          onClick={handlePrev}
          disabled={!canGoPrev}
          style={{
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'transparent', borderRadius: r.md, cursor: canGoPrev ? 'pointer' : 'default',
            color: canGoPrev ? t.text : t.textTer, opacity: canGoPrev ? 1 : 0.4,
          }}
        >
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: t.text, letterSpacing: '-0.02em', margin: 0 }}>
          {monthTitle}
        </h2>
        <button
          type="button"
          aria-label="Next month"
          onClick={handleNext}
          disabled={!canGoNext}
          style={{
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'transparent', borderRadius: r.md, cursor: canGoNext ? 'pointer' : 'default',
            color: canGoNext ? t.text : t.textTer, opacity: canGoNext ? 1 : 0.4,
          }}
        >
          <ChevronRight size={20} strokeWidth={1.75} />
        </button>
      </div>

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

      <div style={{
        margin: '0 16px 20px',
        background: t.surface,
        borderRadius: r.lg,
        border: `1px solid ${t.border}`,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
      }}>
        <StatCell label="Trips" value={String(selected.tripCount)} />
        <StatCell label="Avg trip" value={formatMoney(selected.average, spend.currency)} />
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

      <SectionLabel>Trips</SectionLabel>
      <div style={{
        margin: '0 16px',
        background: t.surface,
        borderRadius: r.lg,
        border: `1px solid ${t.border}`,
        overflow: 'hidden',
        minHeight: 56,
      }}>
        {loadingTrips ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton h={16} />
            <Skeleton h={16} w="70%" />
          </div>
        ) : trips.length === 0 ? (
          <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingCart size={16} color={t.textTer} strokeWidth={1.75} />
            <p style={{ fontSize: 14, color: t.textTer, margin: 0 }}>
              No shopping trips in {formatMonthShort(selected.month)}.
            </p>
          </div>
        ) : (
          trips.map((session, i) => {
            const dateLabel = formatSessionDate(session.completedAt ?? session.startedAt)
            const costLabel = formatSessionCost(session)
            return (
              <div
                key={session.id}
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: 15, color: t.text, fontWeight: 500 }}>{dateLabel}</div>
                  <div style={{ fontSize: 12, color: t.textTer, marginTop: 2 }}>
                    {session.itemCount} item{session.itemCount !== 1 ? 's' : ''}
                  </div>
                </div>
                {costLabel && (
                  <span style={{ fontSize: 15, fontWeight: 600, color: t.text, fontVariantNumeric: 'tabular-nums' }}>
                    {costLabel}
                  </span>
                )}
              </div>
            )
          })
        )}
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
