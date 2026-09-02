import { t } from '../ui'
import { formatMoney } from '../api/adapters'
import { MOTION_MS, prefersReducedMotion } from '../lib/motion'

export interface SpendBucket {
  id: string
  total: number
  label: string
  shortLabel: string
}

interface ChartProps {
  buckets: SpendBucket[]
  selectedId: string
  currency: string
  onSelect: (id: string) => void
  ariaLabel?: string
  durationMs?: number
}

const BAR_MAX = 112

export function SpendBarChart({
  buckets,
  selectedId,
  currency,
  onSelect,
  ariaLabel = 'Household spend by cycle',
  durationMs = MOTION_MS.state,
}: ChartProps) {
  const max = Math.max(...buckets.map(row => row.total), 0)
  const reduced = prefersReducedMotion()
  const ms = reduced ? 0 : durationMs

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{ display: 'flex', alignItems: 'stretch', gap: 2, height: 148, padding: '4px 4px 0' }}
    >
      {buckets.map(row => {
        const selected = row.id === selectedId
        const height = max <= 0
          ? 2
          : Math.max(row.total > 0 ? 6 : 2, Math.round((row.total / max) * BAR_MAX))
        return (
          <button
            key={row.id}
            type="button"
            aria-pressed={selected}
            aria-label={`${row.label}, ${formatMoney(row.total, currency)}`}
            onClick={() => onSelect(row.id)}
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
              style={{ display: 'block', maxWidth: 28, overflow: 'hidden' }}
            >
              <rect
                className="spend-chart-bar"
                x="5"
                y={BAR_MAX - height}
                width="14"
                height={height}
                rx="6"
                fill={selected ? 'var(--ds-primary)' : 'var(--ds-primary-subtle)'}
                style={{
                  ['--bar-y' as string]: `${BAR_MAX - height}px`,
                  ['--bar-h' as string]: `${height}px`,
                  transitionDuration: ms > 0 ? `${ms}ms` : '0ms',
                }}
              />
            </svg>
            <span style={{
              fontSize: 10,
              fontWeight: selected ? 600 : 400,
              color: selected ? t.primary : t.textTer,
              letterSpacing: '-0.02em',
            }}>
              {selected ? row.label : row.shortLabel}
            </span>
          </button>
        )
      })}
    </div>
  )
}

interface SparklineProps {
  buckets: Array<{ id: string; total: number }>
}

export function SpendSparkline({ buckets }: SparklineProps) {
  const max = Math.max(...buckets.map(row => row.total), 0)
  const h = 28

  return (
    <div aria-hidden="true" style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: h }}>
      {buckets.map(row => {
        const height = max <= 0 ? 2 : Math.max(row.total > 0 ? 4 : 2, Math.round((row.total / max) * h))
        return (
          <svg
            key={row.id}
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
