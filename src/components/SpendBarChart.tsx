import { t } from '../ui'
import type { MonthlySpend } from '../types'
import { formatMoney, formatMonthShort } from '../api/adapters'

interface ChartProps {
  months: MonthlySpend[]
  selectedMonth: string
  currency: string
  onSelect: (month: string) => void
}

const BAR_MAX = 112

export function SpendBarChart({ months, selectedMonth, currency, onSelect }: ChartProps) {
  const max = Math.max(...months.map(row => row.total), 0)

  return (
    <div
      role="group"
      aria-label="Household spend by month"
      style={{ display: 'flex', alignItems: 'stretch', gap: 2, height: 148, padding: '4px 4px 0' }}
    >
      {months.map(row => {
        const selected = row.month === selectedMonth
        const height = max <= 0
          ? 2
          : Math.max(row.total > 0 ? 6 : 2, Math.round((row.total / max) * BAR_MAX))
        const label = formatMonthShort(row.month)
        return (
          <button
            key={row.month}
            type="button"
            aria-pressed={selected}
            aria-label={`${label}, ${formatMoney(row.total, currency)}`}
            onClick={() => onSelect(row.month)}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              height: '100%',
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--ds-font)',
              borderRadius: 8,
            }}
          >
            <svg
              width="100%"
              height={BAR_MAX}
              viewBox={`0 0 24 ${BAR_MAX}`}
              preserveAspectRatio="none"
              aria-hidden="true"
              style={{ display: 'block', maxWidth: 28 }}
            >
              <rect
                x="5"
                y={BAR_MAX - height}
                width="14"
                height={height}
                rx="6"
                fill={selected ? 'var(--ds-primary)' : 'var(--ds-primary-subtle)'}
              />
            </svg>
            <span style={{
              fontSize: 10,
              fontWeight: selected ? 600 : 400,
              color: selected ? t.primary : t.textTer,
              letterSpacing: '-0.02em',
            }}>
              {selected ? label : label.slice(0, 1)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

interface SparklineProps {
  months: MonthlySpend[]
}

export function SpendSparkline({ months }: SparklineProps) {
  const max = Math.max(...months.map(row => row.total), 0)
  const h = 28

  return (
    <div aria-hidden="true" style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: h }}>
      {months.map(row => {
        const height = max <= 0 ? 2 : Math.max(row.total > 0 ? 4 : 2, Math.round((row.total / max) * h))
        return (
          <svg
            key={row.month}
            width={8}
            height={h}
            viewBox={`0 0 8 ${h}`}
            aria-hidden="true"
          >
            <rect
              x="0"
              y={h - height}
              width="8"
              height={height}
              rx="2"
              fill="var(--ds-primary)"
              opacity={row.total > 0 ? 0.85 : 0.22}
            />
          </svg>
        )
      })}
    </div>
  )
}
